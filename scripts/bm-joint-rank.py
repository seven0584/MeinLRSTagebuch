"""Experimental conditional log-linear word selector; no application integration.

Training and development labels are separate from prediction. All hyperparameters,
features and the development margin grid are fixed here before held-out testing.
"""
import argparse
from collections import Counter, defaultdict
import hashlib
import importlib.util
import json
import math
from pathlib import Path

SPEC = importlib.util.spec_from_file_location('context_rank', Path(__file__).with_name('bm-context-rank.py'))
context = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(context)

CONFIG = dict(version=1, top_k=5, missing_input_cost_penalty=5.0,
              iterations=500, learning_rate=0.15, l2=0.01,
              margin_grid=[0.0, 0.25, 0.5, 1.0, 2.0, 4.0, 8.0, 16.0, None])
FEATURES = ['negative_bm_cost_relative_best', 'lm_relative_keep', 'changed',
            'normalized_edit_distance', 'case_only_change',
            'log_prior_relative_keep', 'missing_input_cost_for_keep']


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def dump(path, value):
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    Path(path).write_text(json.dumps(value, ensure_ascii=False, allow_nan=False, indent=2) + '\n', encoding='utf-8')


def dictionary(path):
    result = {}
    for line in Path(path).read_text(encoding='utf-8-sig').splitlines():
        fields = line.split('\t')
        if len(fields) != 2 or fields[0] in result:
            raise ValueError('Invalid/duplicate dictionary row')
        prior = float(fields[1])
        if not math.isfinite(prior) or not 0 < prior <= 1:
            raise ValueError('Invalid dictionary prior')
        result[fields[0]] = prior
    if not result:
        raise ValueError('Empty dictionary')
    return result


def distance(a, b):
    previous = list(range(len(b) + 1))
    for i, char in enumerate(a, 1):
        current = [i]
        for j, other in enumerate(b, 1):
            current.append(min(previous[j] + 1, current[-1] + 1, previous[j - 1] + (char != other)))
        previous = current
    return previous[-1]


def prepare(inputs, bm_rows, lm, priors):
    inputs, bm = context.indexed(inputs), context.indexed(bm_rows)
    if set(inputs) != set(bm):
        raise ValueError('BM/input IDs differ')
    result = []
    floor = min(priors.values())
    for identifier, row in inputs.items():
        source = bm[identifier]
        if source['input'] != row['input']:
            raise ValueError('BM/input mismatch: ' + identifier)
        # Only original-only fields enter feature calculation; labels are ignored.
        original, left, right = row['input'], row['left'], row['right']
        if not context.supported(original):
            raise ValueError('Unsupported original token: ' + identifier)
        raw, seen = [], set()
        for candidate in source['candidates']:
            word, cost = candidate['word'], candidate['cost']
            if not context.supported(word) or word in seen or not isinstance(cost, (float, int)) or not math.isfinite(cost):
                raise ValueError('Invalid/duplicate candidate: ' + identifier)
            seen.add(word)
            raw.append((word, float(cost)))
        if any(raw[i][1] > raw[i + 1][1] for i in range(len(raw) - 1)):
            raise ValueError('Unsorted BM costs: ' + identifier)
        if 'inputCost' not in source:
            raise ValueError('Adapter must emit inputCost, including null for OOV')
        input_cost = source['inputCost']
        if input_cost is not None and (not isinstance(input_cost, (int, float)) or not math.isfinite(input_cost)):
            raise ValueError('Invalid inputCost')
        missing = input_cost is None
        if missing:
            input_cost = max((c for _, c in raw), default=0.0) + CONFIG['missing_input_cost_penalty']
        best_cost = min((c for _, c in raw), default=input_cost)
        lm_keep = lm.score(left, original, right)
        prior_keep = math.log(priors.get(original, floor))
        candidates = [{'id': f'c{i + 1}', 'word': w} for i, (w, _) in enumerate(raw[:CONFIG['top_k']])]
        options = [('keep', None, original, input_cost)]
        options += [('candidate', c['id'], c['word'], cost)
                    for c, (_, cost) in zip(candidates, raw) if c['word'] != original]
        choices = []
        for decision, candidate_id, word, cost in options:
            changed = word != original
            features = [best_cost - cost, lm.score(left, word, right) - lm_keep,
                        float(changed), distance(original, word) / max(len(original), len(word), 1),
                        float(changed and original.lower() == word.lower()),
                        math.log(priors.get(word, floor)) - prior_keep,
                        float(not changed and missing)]
            choices.append(dict(decision=decision, candidateId=candidate_id, word=word, features=features))
        result.append(dict(id=identifier, input=original, candidates=candidates, choices=choices))
    return result


def labels(rows, gold_rows):
    gold = context.indexed(gold_rows)
    if set(gold) != {r['id'] for r in rows}:
        raise ValueError('Gold/input IDs differ')
    for row in rows:
        if gold[row['id']]['input'] != row['input']:
            raise ValueError('Gold input mismatch')
    return gold


def writer_guard(fit_gold, dev_gold, training):
    fit_writers = {r['writer'] for r in fit_gold.values() if 'writer' in r}
    dev_writers = {r['writer'] for r in dev_gold.values() if 'writer' in r}
    training_writers = {r['writer'] for r in training if 'writer' in r}
    if fit_writers & dev_writers:
        raise ValueError('Fit/development writer overlap')
    if training_writers & (fit_writers | dev_writers):
        raise ValueError('Base LM/ranker writer overlap')


def scales(rows):
    # Scale only; candidate-independent centering would cancel in softmax anyway.
    values = [c['features'] for r in rows for c in r['choices']]
    if not values:
        raise ValueError('No fit examples')
    return [max(math.sqrt(sum(v[j] ** 2 for v in values) / len(values)), 1e-8)
            for j in range(len(FEATURES))]


def scaled(row, scale):
    return [[v / s for v, s in zip(c['features'], scale)] for c in row['choices']]


def dot(a, b):
    return sum(x * y for x, y in zip(a, b))


def optimize(rows, gold, scale):
    examples, uncovered = [], 0
    for row in rows:
        targets = [i for i, c in enumerate(row['choices']) if c['word'] == gold[row['id']]['target']]
        if not targets:
            # Do not invent a correct choice for unrepresented reference words.
            uncovered += 1
            continue
        examples.append((scaled(row, scale), targets[0]))
    if not examples:
        raise ValueError('No covered fit examples')
    weights = [0.0] * len(FEATURES)
    for _ in range(CONFIG['iterations']):
        gradient = [CONFIG['l2'] * w for w in weights]
        for matrix, target in examples:
            scores = [dot(weights, x) for x in matrix]
            normalizer = max(scores)
            probs = [math.exp(s - normalizer) for s in scores]
            total = sum(probs)
            for i, x in enumerate(matrix):
                error = probs[i] / total - (i == target)
                for j, value in enumerate(x):
                    gradient[j] += error * value / len(examples)
        weights = [w - CONFIG['learning_rate'] * g for w, g in zip(weights, gradient)]
    return weights, dict(covered_fit=len(examples), uncovered_fit=uncovered)


def predict(rows, weights, scale, margin):
    output = []
    for row in rows:
        scores = [dict(c, score=dot(weights, vector)) for c, vector in zip(row['choices'], scaled(row, scale))]
        scores.sort(key=lambda c: (-c['score'], c['decision'] != 'keep', c['word']))
        top = scores[0]
        gap = top['score'] - scores[1]['score'] if len(scores) > 1 else 0.0
        decision, candidate_id = top['decision'], top['candidateId']
        if decision == 'candidate' and (margin is None or gap < margin):
            decision, candidate_id = 'uncertain', None
        output.append(dict(id=row['id'], decision=decision, candidateId=candidate_id,
                           selectedWord=top['word'] if decision != 'uncertain' else None,
                           margin=gap, scores=scores))
    return output


def choose_margin(rows, gold, weights, scale):
    results = []
    for margin in CONFIG['margin_grid']:
        predictions = predict(rows, weights, scale, margin)
        correct = wrong = offered = 0
        for pred in predictions:
            if pred['decision'] == 'candidate':
                offered += 1
                if pred['selectedWord'] == gold[pred['id']]['target']:
                    correct += 1
                else:
                    wrong += 1
        results.append(dict(margin=margin, correct_changes=correct, incorrect_changes=wrong, offered_changes=offered))
    # None = infinite threshold. Prefer the smallest threshold for exact metric ties.
    winner = min(results, key=lambda r: (r['incorrect_changes'], -r['correct_changes'],
                                        float('inf') if r['margin'] is None else r['margin']))
    return winner['margin'], results


def encode_lm(lm):
    return dict(counts=[[list(h), dict(c)] for h, c in sorted(lm.counts.items())],
                vocab=sorted(lm.vocab), accepted=lm.accepted, rejected=lm.rejected)


def decode_lm(state):
    lm = object.__new__(context.CountLM)
    lm.counts = defaultdict(Counter, {tuple(h): Counter(c) for h, c in state['counts']})
    lm.vocab = set(state['vocab'])
    lm.accepted, lm.rejected = state['accepted'], state['rejected']
    lm.totals = {h: sum(c.values()) for h, c in lm.counts.items()}
    return lm


def fit(args):
    fit_inputs, dev_inputs = context.read(args.fit_inputs), context.read(args.dev_inputs)
    if set(context.indexed(fit_inputs)) & set(context.indexed(dev_inputs)):
        raise ValueError('Fit/development ID overlap')
    training = context.read(args.lm_training)
    lm, priors = context.CountLM(training), dictionary(args.dictionary)
    fit_rows = prepare(fit_inputs, context.read(args.fit_bm), lm, priors)
    dev_rows = prepare(dev_inputs, context.read(args.dev_bm), lm, priors)
    fit_gold, dev_gold = labels(fit_rows, context.read(args.fit_gold)), labels(dev_rows, context.read(args.dev_gold))
    writer_guard(fit_gold, dev_gold, training)
    scale = scales(fit_rows)
    weights, fit_stats = optimize(fit_rows, fit_gold, scale)
    margin, development = choose_margin(dev_rows, dev_gold, weights, scale)
    names = ['fit_inputs', 'fit_bm', 'fit_gold', 'dev_inputs', 'dev_bm', 'dev_gold', 'lm_training', 'dictionary']
    model = dict(config=CONFIG, features=FEATURES, weights=weights, scales=scale,
                 chosen_margin=margin, development=development, fit_stats=fit_stats,
                 sources={name: dict(path=str(Path(getattr(args, name)).resolve()), sha256=sha(getattr(args, name))) for name in names},
                 implementation_sha256=sha(__file__),
                 lm_implementation_sha256=sha(Path(__file__).with_name('bm-context-rank.py')),
                 lm=encode_lm(lm))
    dump(args.output, model)
    print(json.dumps({k: model[k] for k in ['weights', 'chosen_margin', 'development', 'fit_stats']}, ensure_ascii=False))


def run_predict(args):
    model = json.loads(Path(args.model).read_text(encoding='utf-8'))
    if model['config'] != CONFIG or model['features'] != FEATURES or model['implementation_sha256'] != sha(__file__):
        raise ValueError('Model/config/implementation mismatch; fit must be frozen')
    if model['lm_implementation_sha256'] != sha(Path(__file__).with_name('bm-context-rank.py')):
        raise ValueError('CountLM implementation changed after fitting')
    source = model['sources']['dictionary']
    if sha(source['path']) != source['sha256']:
        raise ValueError('Dictionary hash changed')
    rows = prepare(context.read(args.inputs), context.read(args.bm), decode_lm(model['lm']), dictionary(source['path']))
    context.write(args.out, predict(rows, model['weights'], model['scales'],
                                   0.0 if args.raw else model['chosen_margin']))
    context.write(str(args.out) + '.inputs.jsonl', [{k: r[k] for k in ['id', 'input', 'candidates']} for r in rows])
    dump(str(args.out) + '.manifest.json', dict(model_sha256=sha(args.model),
         inputs_sha256=sha(args.inputs), bm_sha256=sha(args.bm), output_sha256=sha(args.out),
         count=len(rows), raw=args.raw, margin=0.0 if args.raw else model['chosen_margin']))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='command', required=True)
    p = sub.add_parser('fit')
    for name in ['fit-gold', 'fit-inputs', 'fit-bm', 'dev-gold', 'dev-inputs', 'dev-bm', 'lm-training', 'dictionary', 'output']:
        p.add_argument('--' + name, required=True)
    p.set_defaults(action=fit)
    p = sub.add_parser('predict')
    for name in ['model', 'inputs', 'bm', 'out']:
        p.add_argument('--' + name, required=True)
    p.add_argument('--raw', action='store_true', help='Frozen unthresholded comparison')
    p.set_defaults(action=run_predict)
    args = parser.parse_args()
    args.action(args)


if __name__ == '__main__':
    main()
