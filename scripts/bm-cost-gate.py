"""Development-calibrated BM margin gate; experimental, no application integration.

No gold labels enter prediction. A margin is a cost difference, not a probability.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path

GRID = [0, .25, .5, 1, 2, 3, 4, 6, 8, 12, 16, None]
POLICY = dict(min_precision=.95, min_offers=20, max_control_change_rate=.01)


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def read(path):
    return [json.loads(line) for line in Path(path).read_text(encoding='utf-8-sig').splitlines() if line.strip()]


def write(path, rows):
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    Path(path).write_text(''.join(json.dumps(r, ensure_ascii=False, allow_nan=False) + '\n' for r in rows), encoding='utf-8')


def dump(path, value):
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    Path(path).write_text(json.dumps(value, ensure_ascii=False, allow_nan=False, indent=2) + '\n', encoding='utf-8')


def indexed(rows):
    result = {r['id']: r for r in rows}
    if len(result) != len(rows):
        raise ValueError('Duplicate IDs')
    return result


def number(value):
    return isinstance(value, (float, int)) and not isinstance(value, bool) and math.isfinite(value)


def prepare(inputs, bm_rows):
    bm = indexed(bm_rows)
    if set(indexed(inputs)) != set(bm):
        raise ValueError('BM/input IDs differ')
    output = []
    for row in inputs:
        source = bm[row['id']]
        if source['input'] != row['input']:
            raise ValueError('BM/input text differs')
        costs, seen, previous = [], set(), -math.inf
        for c in source['candidates']:
            if not isinstance(c['word'], str) or not c['word'] or not number(c['cost']) or c['cost'] < previous:
                raise ValueError('Invalid or unsorted BM candidate')
            previous = c['cost']
            if c['word'] not in seen:
                seen.add(c['word'])
                costs.append(dict(word=c['word'], cost=c['cost']))
        costs = costs[:5]
        input_cost = source.get('inputCost')
        if input_cost is not None and not number(input_cost):
            raise ValueError('Invalid inputCost')
        candidates = [dict(id=f'c{i+1}', word=c['word']) for i, c in enumerate(costs)]
        gap = None
        if costs and costs[0]['word'] != row['input'] and input_cost is not None:
            rivals = [c['cost'] for c in costs[1:]] + [input_cost]
            gap = min(rivals) - costs[0]['cost']
        output.append(dict(id=row['id'], input=row['input'], candidates=candidates, gap=gap))
    return output


def predict(rows, threshold):
    if threshold is not None and (not number(threshold) or threshold < 0):
        raise ValueError('Invalid threshold')
    output = []
    for row in rows:
        candidates = row['candidates']
        decision, candidate_id, word = 'uncertain', None, None
        if candidates and candidates[0]['word'] == row['input']:
            decision, word = 'keep', row['input']
        elif candidates and row['gap'] is not None and threshold is not None and row['gap'] >= threshold:
            decision, candidate_id, word = 'candidate', 'c1', candidates[0]['word']
        output.append(dict(id=row['id'], decision=decision, candidateId=candidate_id,
                           selectedWord=word, margin=row['gap']))
    return output


def metrics(predictions, gold):
    correct = wrong = controls_changed = 0
    for pred in predictions:
        if pred['decision'] == 'candidate':
            target = gold[pred['id']]
            correct += pred['selectedWord'] == target['target']
            wrong += pred['selectedWord'] != target['target']
            controls_changed += target['input'] == target['target']
    controls = sum(g['input'] == g['target'] for g in gold.values())
    offers = correct + wrong
    return dict(correct_changes=correct, incorrect_changes=wrong, offered_changes=offers,
                precision=correct / offers if offers else None,
                control_changes=controls_changed, controls=controls)


def select(table, strict=False):
    eligible = [r for r in table if r['incorrect_changes'] == 0] if strict else [
        r for r in table if r['offered_changes'] >= POLICY['min_offers']
        and r['precision'] >= POLICY['min_precision']
        and r['controls'] > 0
        and r['control_changes'] / r['controls'] <= POLICY['max_control_change_rate']]
    if not eligible:
        return None
    best = min(eligible, key=lambda r: (-r['correct_changes'], r['incorrect_changes'],
                                      math.inf if r['threshold'] is None else r['threshold']))
    return best['threshold']


def calibrate(args):
    inputs, gold_rows = read(args.inputs), read(args.gold)
    gold = indexed(gold_rows)
    if set(gold) != set(indexed(inputs)) or any(gold[r['id']]['input'] != r['input'] for r in inputs):
        raise ValueError('Gold/input mismatch')
    if any(r.get('phase') != 'devcal' for r in gold_rows):
        raise ValueError('Calibration requires development-calibration rows only')
    if len(gold) != 200 or sum(g['input'] == g['target'] for g in gold.values()) != 100:
        raise ValueError('Predeclared calibration requires 100 error and 100 control rows')
    rows = prepare(inputs, read(args.bm))
    table = [dict(threshold=t, **metrics(predict(rows, t), gold)) for t in GRID]
    config = dict(version=1, grid=GRID, policy=POLICY, implementation_sha256=sha(__file__),
                  sources={k: dict(path=str(Path(getattr(args, k)).resolve()), sha256=sha(getattr(args, k)))
                           for k in ['inputs', 'bm', 'gold']}, development=table,
                  thresholds=dict(pragmatic=select(table), strict=select(table, strict=True)))
    dump(args.output, config)
    print(json.dumps(dict(thresholds=config['thresholds'], development=table), ensure_ascii=False))


def run_predict(args):
    config = json.loads(Path(args.config).read_text(encoding='utf-8'))
    if config['implementation_sha256'] != sha(__file__) or config['policy'] != POLICY or config['grid'] != GRID:
        raise ValueError('Frozen gate implementation/config changed')
    for source in config['sources'].values():
        if sha(source['path']) != source['sha256']:
            raise ValueError('Calibration source changed')
    rows = prepare(read(args.inputs), read(args.bm))
    threshold = config['thresholds'][args.policy]
    write(args.out, predict(rows, threshold))
    write(str(args.out) + '.inputs.jsonl', [{k:r[k] for k in ['id','input','candidates']} for r in rows])
    dump(str(args.out) + '.manifest.json', dict(config_sha256=sha(args.config), inputs_sha256=sha(args.inputs),
         bm_sha256=sha(args.bm), output_sha256=sha(args.out), count=len(rows), policy=args.policy, threshold=threshold))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='command', required=True)
    p = sub.add_parser('calibrate')
    for name in ['inputs', 'bm', 'gold', 'output']:
        p.add_argument('--' + name, required=True)
    p.set_defaults(action=calibrate)
    p = sub.add_parser('predict')
    for name in ['config', 'inputs', 'bm', 'out']:
        p.add_argument('--' + name, required=True)
    p.add_argument('--policy', choices=['pragmatic','strict'], default='pragmatic')
    p.set_defaults(action=run_predict)
    args = parser.parse_args()
    args.action(args)


if __name__ == '__main__':
    main()
