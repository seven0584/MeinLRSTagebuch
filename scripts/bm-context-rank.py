"""Fixed train-only count LM and constrained word-choice evaluation.

No gold field is used in preparation/ranking. Counts and scores are not calibrated
probabilities of correction. Sentence context is the child's original context.
"""
import argparse
from collections import Counter, defaultdict
import hashlib
import json
import math
from pathlib import Path
import re

WORD = re.compile(r'[A-Za-zÄÖÜäöüß]+\Z')
PUNCT = {'.', '!', '?', ',', ';', ':', '"', '„', '“', '(', ')', '-'}
ALPHA = 0.1


def supported(token):
    return bool(WORD.fullmatch(token) or token in PUNCT)


def read(path):
    return [json.loads(line) for line in Path(path).read_text(encoding='utf-8-sig').splitlines() if line.strip()]


def write(path, rows):
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    Path(path).write_text(''.join(json.dumps(r, ensure_ascii=False, allow_nan=False) + '\n' for r in rows), encoding='utf-8')


def indexed(rows):
    out = {}
    for row in rows:
        if row['id'] in out:
            raise ValueError('Duplicate ID: ' + row['id'])
        out[row['id']] = row
    return out


class CountLM:
    """Add-alpha conditional counts, longest observed history up to two tokens.

    Punctuation is retained; unsupported annotations break the chain. No gold
    contexts from development/test are used. No artificial sentence boundaries
    are invented from the TSV's file-level token order.
    """
    def __init__(self, sequences):
        self.counts = defaultdict(Counter)
        self.vocab = set()
        self.accepted = self.rejected = 0
        for sequence in sequences:
            history = []
            for token in sequence['tokens']:
                if not supported(token):
                    history = []
                    self.rejected += 1
                    continue
                self.vocab.add(token)
                self.accepted += 1
                for n in range(min(2, len(history)) + 1):
                    prefix = tuple(history[-n:]) if n else ()
                    self.counts[prefix][token] += 1
                history.append(token)
        self.totals = {h: sum(c.values()) for h, c in self.counts.items()}
        if not self.vocab:
            raise ValueError('No valid training tokens')

    def logp(self, token, history):
        # One shared unknown class; unseen spellings receive no lexical bonus.
        observed = token if token in self.vocab else '<UNK>'
        for n in range(min(2, len(history)), -1, -1):
            prefix = tuple(history[-n:]) if n else ()
            if prefix in self.counts:
                return math.log((self.counts[prefix][observed] + ALPHA) /
                                (self.totals[prefix] + ALPHA * (len(self.vocab) + 1)))
        raise AssertionError('Unigram counts missing')

    def score(self, left, word, right):
        # Only the candidate and its next two tokens depend on substitution in a
        # trigram model. All other terms cancel when comparing single-word edits.
        # Apply the training annotation boundary at inference too. No token on
        # the far side of an unsupported annotation can condition this edit.
        if not supported(word):
            raise ValueError('Candidate must be one supported token')
        history = []
        for token in left.split():
            if not supported(token):
                history = []
            else:
                history.append(token)
                history = history[-2:]
        successors = []
        for token in right.split():
            if not supported(token):
                break
            successors.append(token)
            if len(successors) == 2:
                break
        total = 0.0
        for token in [word] + successors:
            total += self.logp(token, history)
            history.append(token)
        return total


def prepare(inputs, bm_rows):
    bm = indexed(bm_rows)
    result = []
    for row in inputs:
        prediction = bm[row['id']]
        if prediction['input'] != row['input']:
            raise ValueError('Input mismatch: ' + row['id'])
        # Deliberate whitelist keeps targets/metadata from entering model inputs.
        safe = {key: row[key] for key in ['id', 'input', 'left', 'right', 'markedText']}
        words = []
        for candidate in prediction.get('candidates', []):
            if candidate['word'] not in words:
                words.append(candidate['word'])
            if len(words) == 5:
                break
        safe['candidates'] = [{'id': f'c{i + 1}', 'word': w} for i, w in enumerate(words)]
        result.append(safe)
    return result


def rank(lm, rows):
    output = []
    for row in rows:
        choices = [('keep', None, row['input'])] + [('candidate', c['id'], c['word']) for c in row['candidates']]
        scored = [dict(decision=d, candidateId=c, word=w, score=lm.score(row['left'], w, row['right'])) for d, c, w in choices]
        # Fixed lexical ties, then unchanged preference for duplicate word.
        scored.sort(key=lambda c: (-c['score'], c['word'], c['decision'] != 'keep', c['candidateId'] or ''))
        top = scored[0]
        output.append({'id': row['id'], 'decision': top['decision'], 'candidateId': top['candidateId'], 'scores': scored})
    return output


def resolve(row, choice):
    decision = choice.get('decision')
    if decision in ['keep', 'uncertain']:
        if choice.get('candidateId') is not None:
            return None, 'invalid_choice'
        return (row['input'] if decision == 'keep' else None), None
    if decision == 'candidate':
        match = [c['word'] for c in row['candidates'] if c['id'] == choice.get('candidateId')]
        if len(match) == 1:
            return match[0], None
    return None, 'invalid_choice'


def consensus(inputs, first, second):
    """Unweighted exact-word agreement; disagreement or abstention stays open.

    This does not create a confidence estimate. Correlated errors can agree.
    No gold, thresholds, or scores enter this additional fixed decision rule.
    """
    inputs = indexed(inputs)
    first, second = indexed(first), indexed(second)
    for source in [first, second]:
        if set(source) - set(inputs):
            raise ValueError('Unexpected consensus prediction IDs')
    output = []
    for identifier, row in inputs.items():
        a, ae = resolve(row, first[identifier]) if identifier in first else (None, 'missing')
        b, be = resolve(row, second[identifier]) if identifier in second else (None, 'missing')
        choice = {'id': identifier, 'decision': 'uncertain', 'candidateId': None,
                  'components': [{'selected': a, 'error': ae}, {'selected': b, 'error': be}]}
        if a is not None and a == b:
            if a == row['input']:
                choice['decision'] = 'keep'
            else:
                choice['decision'] = 'candidate'
                choice['candidateId'] = next(c['id'] for c in row['candidates'] if c['word'] == a)
        output.append(choice)
    return output


def fail_closed(inputs, predictions):
    """Map invalid/missing/transport responses to explicit technical abstentions.

    The source file is not modified and the raw response is never interpreted
    again. This operational variant must be reported beside the strict result.
    """
    inputs, predictions = indexed(inputs), indexed(predictions)
    if set(predictions) - set(inputs):
        raise ValueError('Unexpected fail-closed prediction IDs')
    output = []
    for identifier, row in inputs.items():
        original = predictions.get(identifier)
        error = 'missing' if original is None else original.get('error') or resolve(row, original)[1]
        result = dict(original or {'id': identifier, 'input': row['input']})
        if error:
            result.pop('error', None)
            result.update(decision='uncertain', candidateId=None,
                          originalError=error, technicalAbstention=True)
        else:
            result['technicalAbstention'] = False
        output.append(result)
    return output


def evaluate(gold, inputs, predictions):
    indexed(gold)
    inputs = indexed(inputs)
    predictions = indexed(predictions)
    groups = defaultdict(Counter)
    details = []
    for g in gold:
        row = inputs[g['id']]
        if g['input'] != row['input']:
            raise ValueError('Gold/input mismatch: ' + g['id'])
        choice = predictions.get(g['id'])
        selected, error = resolve(row, choice) if choice else (None, 'missing')
        covered = g['target'] in {c['word'] for c in row['candidates']}
        selectable = covered or g['target'] == row['input']
        correct = selected == g['target']
        changed = selected is not None and selected != row['input']
        case_correct = selected is not None and selected.casefold() == g['target'].casefold()
        case_only = row['input'] != g['target'] and row['input'].casefold() == g['target'].casefold()
        status = error or ('uncertain' if selected is None else 'correct' if correct else 'incorrect')
        outcome = error or ('uncertain' if selected is None else
                           'correct_change' if changed and correct else
                           'incorrect_change' if changed else
                           'correct_keep' if correct else 'missed_error_keep')
        detail = {'id': g['id'], 'split': g['split'], 'role': g['role'], 'input': row['input'],
                  'target': g['target'], 'selected': selected, 'status': status,
                  'candidateCovered': covered, 'selectable': selectable, 'changed': changed,
                  'caseInsensitiveCorrect': case_correct, 'caseOnlyInputError': case_only,
                  'actionOutcome': outcome,
                  'technicalAbstention': bool(choice and choice.get('technicalAbstention'))}
        details.append(detail)
        labels = [g['split'] + '/' + g['role'], g['split'] + '/all']
        if g['role'] == 'error':
            labels.append(g['split'] + ('/error_case_only' if case_only else '/error_other'))
        for label in labels:
            c = groups[label]
            c['total'] += 1
            c[status] += 1
            c['candidate_covered'] += covered
            c['selectable'] += selectable
            c['correct_when_selectable'] += correct and selectable
            c['decisions_when_selectable'] += selected is not None and selectable
            c['offered_changes'] += changed
            c['correct_changes'] += changed and correct
            c['incorrect_changes'] += changed and not correct
            c['undesired_control_changes'] += changed and g['role'] == 'control'
            c['case_insensitive_correct'] += case_correct
            c['missed_error_keeps'] += outcome == 'missed_error_keep'
            c['correct_keeps'] += outcome == 'correct_keep'
            c['technical_abstentions'] += bool(choice and choice.get('technicalAbstention'))
    result = {}
    for label, counts in sorted(groups.items()):
        for key in ['correct', 'incorrect', 'uncertain', 'missing', 'invalid_choice',
                    'candidate_covered', 'selectable', 'correct_when_selectable',
                    'decisions_when_selectable', 'offered_changes', 'correct_changes',
                    'incorrect_changes', 'undesired_control_changes',
                    'case_insensitive_correct', 'missed_error_keeps', 'correct_keeps',
                    'technical_abstentions']:
            counts[key] += 0
        c = dict(counts)
        c['accuracy_all'] = counts['correct'] / counts['total']
        c['diagnostic_accuracy_ignoring_case'] = counts['case_insensitive_correct'] / counts['total']
        c['candidate_coverage'] = counts['candidate_covered'] / counts['total']
        c['accuracy_when_selectable'] = counts['correct_when_selectable'] / counts['selectable'] if counts['selectable'] else None
        c['choice_accuracy_when_selectable_and_decided'] = counts['correct_when_selectable'] / counts['decisions_when_selectable'] if counts['decisions_when_selectable'] else None
        c['change_precision'] = counts['correct_changes'] / counts['offered_changes'] if counts['offered_changes'] else None
        c['decision_coverage'] = (counts['correct'] + counts['incorrect']) / counts['total']
        result[label] = c
    extra = sorted(set(predictions) - set(inputs))
    if extra:
        raise ValueError('Unexpected prediction IDs: ' + repr(extra[:3]))
    return {'groups': result, 'details': details}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='command', required=True)
    run = sub.add_parser('rank')
    run.add_argument('--training', required=True)
    run.add_argument('--inputs', required=True)
    run.add_argument('--candidates', required=True)
    run.add_argument('--out', required=True)
    ev = sub.add_parser('evaluate')
    ev.add_argument('--gold', required=True)
    ev.add_argument('--inputs', required=True)
    ev.add_argument('--predictions', required=True, nargs='+')
    ev.add_argument('--out', required=True)
    agree = sub.add_parser('consensus')
    agree.add_argument('--inputs', required=True)
    agree.add_argument('--first', required=True)
    agree.add_argument('--second', required=True)
    agree.add_argument('--output', required=True)
    closed = sub.add_parser('fail-closed')
    closed.add_argument('--inputs', required=True)
    closed.add_argument('--predictions', required=True)
    closed.add_argument('--output', required=True)
    args = parser.parse_args()
    if args.command == 'fail-closed':
        rows = fail_closed(read(args.inputs), read(args.predictions))
        write(args.output, rows)
        print(json.dumps({'rows': len(rows), 'technicalAbstentions': sum(r['technicalAbstention'] for r in rows)}))
        return
    if args.command == 'consensus':
        rows = consensus(read(args.inputs), read(args.first), read(args.second))
        write(args.output, rows)
        print(json.dumps({'rows': len(rows), 'agreed': sum(r['decision'] != 'uncertain' for r in rows),
                          'rule': 'exact selected-word agreement; otherwise uncertain; not calibrated'}))
        return
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    if args.command == 'rank':
        lm = CountLM(read(args.training))
        safe = prepare(read(args.inputs), read(args.candidates))
        write(out / 'constrained-inputs.jsonl', safe)
        write(out / 'stat-results.jsonl', rank(lm, safe))
        write(out / 'bm-top1-results.jsonl', [{'id': r['id'], 'decision': 'candidate' if r['candidates'] else 'uncertain', 'candidateId': r['candidates'][0]['id'] if r['candidates'] else None} for r in safe])
        metadata = {'algorithm': 'train-only case-sensitive add-0.1 trigram with observed-history backoff; LM-only reranking',
                    'alpha': ALPHA, 'vocabulary': len(lm.vocab), 'acceptedTokens': lm.accepted, 'rejectedTokens': lm.rejected,
                    'trainingSha256': hashlib.sha256(Path(args.training).read_bytes()).hexdigest(),
                    'inputsSha256': hashlib.sha256(Path(args.inputs).read_bytes()).hexdigest(),
                    'candidatesSha256': hashlib.sha256(Path(args.candidates).read_bytes()).hexdigest(),
                    'tieBreak': 'score descending, word lexical, keep before duplicate candidate',
                    'context': 'original adjacent left two and right two supported tokens; unsupported annotations break the chain in training and inference',
                    'candidateLimit': 5, 'calibrated': False}
        (out / 'stat-manifest.json').write_text(json.dumps(metadata, indent=2) + '\n', encoding='utf-8')
        print(json.dumps(metadata))
    else:
        result = {Path(p).stem: evaluate(read(args.gold), read(args.inputs), read(p)) for p in args.predictions}
        (out / 'context-comparison.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        print(json.dumps({k: v['groups'] for k, v in result.items()}, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
