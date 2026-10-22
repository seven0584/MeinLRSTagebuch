"""Score the frozen 500-word experiment with the broad, prefiltered lexicon.

Retrieval top-10 is taken from the first ten entries of the fixed top-100
Levenshtein shortlist. Added old BM candidates follow these and do not reorder
the retrieval baseline. Gold is only used by evaluation, never retrieval.
"""
import hashlib
import importlib.util
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'tests/benchmark-artifacts/brillmoore'
spec = importlib.util.spec_from_file_location('bm_evaluate', ROOT / 'scripts/bm-evaluate.py')
evaluator = importlib.util.module_from_spec(spec)
spec.loader.exec_module(evaluator)


def main():
    expanded = BASE / 'expanded'
    manifest = json.loads((expanded / 'manifest.json').read_text(encoding='utf-8'))
    for name, expected in manifest['files'].items():
        if hashlib.sha256(Path(name).read_bytes()).hexdigest() != expected:
            raise ValueError('Expanded input changed: ' + name)
    gold = evaluator.read_jsonl(expanded / 'mini.jsonl')
    original = evaluator.unique(evaluator.read_jsonl(BASE / 'prepared/mini.jsonl'), 'original')
    if len(gold) != 500 or len(evaluator.unique(gold, 'expanded')) != 500:
        raise ValueError('Expected 500 unique frozen items')
    for row in gold:
        for key in ('id', 'input', 'target', 'role', 'train_seen_pair'):
            if row[key] != original[row['id']][key]:
                raise ValueError('Evaluation corpus changed')
    validation = evaluator.validate(BASE / 'prepared', gold)
    validation['expanded_hashes_checked'] = len(manifest['files'])
    lexicon = evaluator.dictionary(expanded / 'dictionary.tsv')
    inputs = evaluator.unique(gold, 'gold')
    retrieval = []
    for line in (expanded / 'per-input-candidates.tsv').read_text(encoding='utf-8').splitlines():
        item_id, *words = line.split('\t')
        word = inputs[item_id]['input']
        retrieval.append({'id': item_id, 'input': word,
                          'candidates': [{'word': candidate, 'cost': evaluator.levenshtein(word, candidate)}
                                         for candidate in words[:10]]})
    path = expanded / 'retrieval-results.jsonl'
    path.write_text(''.join(json.dumps(r, ensure_ascii=False) + '\n' for r in retrieval), encoding='utf-8')
    report = {'validation': validation, 'lexicon_size': len(lexicon), 'policy': 'Unchanged input in exact lexicon is kept; otherwise top1. No tuned threshold.', 'engines': {}}
    for name, rows in [('bm-expanded', evaluator.read_jsonl(BASE / 'bm-expanded.jsonl')),
                       ('retrieval-results', retrieval)]:
        report['engines'][name] = evaluator.evaluate(gold, rows, lexicon)
    old = evaluator.unique(evaluator.read_jsonl(BASE / 'bm-results.jsonl'), 'small BM')
    new = evaluator.unique(evaluator.read_jsonl(BASE / 'bm-expanded.jsonl'), 'expanded BM')
    transitions = {}
    for group in ['error', 'control', 'external']:
        counts = dict(both_correct=0, only_small_correct=0, only_expanded_correct=0, both_incorrect=0)
        for row in gold:
            if row['role'] != group:
                continue
            before = (old[row['id']].get('candidates') or [{}])[0].get('word') == row['target']
            after = (new[row['id']].get('candidates') or [{}])[0].get('word') == row['target']
            key = 'both_correct' if before and after else 'only_small_correct' if before else 'only_expanded_correct' if after else 'both_incorrect'
            counts[key] += 1
        transitions[group] = counts
    report['paired_small_to_expanded_top1'] = transitions
    (expanded / 'comparison.json').write_text(json.dumps(report, ensure_ascii=False, indent=2, allow_nan=False) + '\n', encoding='utf-8')
    paired = '\n\n## Gepaarter Vergleich: kleines gegen breites BM-Lexikon\n\n' + json.dumps(transitions, ensure_ascii=False, indent=2) + '\n'
    (expanded / 'comparison.md').write_text(evaluator.markdown(report) + paired, encoding='utf-8')
    for name, result in report['engines'].items():
        print(name, json.dumps({k: {'n': v['n'], 'top1': v['topk']['exact']['1']['hits'], 'top10': v['topk']['exact']['10']['hits'], 'controls_changed': v['controls']['raw_top1_changes']} for k, v in result['groups'].items() if k in ['litkey_errors', 'external', 'litkey_controls', 'litkey_novel_errors']}, ensure_ascii=False))


if __name__ == '__main__':
    main()
