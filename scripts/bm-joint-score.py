"""Evaluate frozen joint predictions only after training and prediction finish."""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path

SPEC = importlib.util.spec_from_file_location('joint_evaluation', Path(__file__).with_name('bm-context-rank.py'))
evaluation = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(evaluation)


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def score(base):
    model_path = base / 'model.json'
    model = json.loads(model_path.read_text(encoding='utf-8'))
    test = base / 'test'
    inputs = evaluation.read(test / 'joint-raw.jsonl.inputs.jsonl')
    ids = {r['id'] for r in inputs}
    if len(ids) != len(inputs):
        raise ValueError('Duplicate evaluation inputs')
    if sha(test / 'joint-raw.jsonl.inputs.jsonl') != sha(test / 'joint-safe.jsonl.inputs.jsonl'):
        raise ValueError('Raw/safe candidate inputs differ')
    frozen_manifest = json.loads((base / 'manifest.json').read_text(encoding='utf-8'))
    for name in ['test/context.jsonl', 'test/context-inputs.jsonl']:
        if sha(base / name) != frozen_manifest['files_sha256'][name]:
            raise ValueError('Frozen test file changed: ' + name)
    original = {r['id']: r['input'] for r in evaluation.read(test / 'context-inputs.jsonl')}
    if original != {r['id']: r['input'] for r in inputs}:
        raise ValueError('Evaluation inputs differ from frozen originals')
    names = ['bm-results', 'keep-results', 'joint-raw', 'joint-safe']
    predictions, files = {}, [model_path, test / 'context.jsonl']
    # All predictions must be persisted before evaluation labels are loaded.
    for name in names:
        path = test / (name + '.jsonl')
        rows = evaluation.read(path)
        if set(evaluation.indexed(rows)) != ids:
            raise ValueError('Incomplete predictions: ' + name)
        predictions[name] = rows
        files.append(path)
    for name in ['joint-raw', 'joint-safe']:
        manifest = json.loads((test / (name + '.jsonl.manifest.json')).read_text(encoding='utf-8'))
        if manifest['model_sha256'] != sha(model_path):
            raise ValueError('Predictions use a different model')
        if manifest['output_sha256'] != sha(test / (name + '.jsonl')):
            raise ValueError('Prediction file changed')
    gold = evaluation.read(test / 'context.jsonl')
    if len(gold) != len(ids) or set(evaluation.indexed(gold)) != ids:
        raise ValueError('Gold/input IDs differ')
    if any(r['phase'] != 'test' or r['split'] != 'test' for r in gold):
        raise ValueError('Expected new test phase only')
    results = {name: evaluation.evaluate(gold, inputs, rows) for name, rows in predictions.items()}
    if any(v['groups']['test/all']['missing'] or v['groups']['test/all']['invalid_choice'] for v in results.values()):
        raise ValueError('Invalid test decisions')
    novel_ids = {r['id'] for r in gold if r['role'] == 'error' and not r['train_seen_pair']}
    for name, rows in predictions.items():
        results[name]['novel_pairs'] = evaluation.evaluate(
            [r for r in gold if r['id'] in novel_ids],
            [r for r in inputs if r['id'] in novel_ids],
            [r for r in rows if r['id'] in novel_ids])['groups']
    baseline = {r['id']: r for r in results['bm-results']['details']}
    paired = {}
    for name in ['joint-raw', 'joint-safe']:
        counts = {key: 0 for key in ['both_correct', 'only_bm_correct', 'only_joint_correct', 'neither_correct']}
        for row in results[name]['details']:
            a, b = baseline[row['id']]['status'] == 'correct', row['status'] == 'correct'
            key = 'both_correct' if a and b else 'only_bm_correct' if a else 'only_joint_correct' if b else 'neither_correct'
            counts[key] += 1
        paired[name] = counts
    output = dict(method='new-occurrence balanced test; exact frozen target annotation',
                  model_sha256=sha(model_path), chosen_margin=model['chosen_margin'],
                  artificial_error_prevalence=0.5, results=results, paired_vs_bm=paired,
                  files_sha256={str(p.relative_to(base)): sha(p) for p in files})
    (base / 'comparison.json').write_text(json.dumps(output, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    lines = ['# Joint ranker: frozen new-occurrence test', '',
             '| Method | Correct / 100 errors | Error abstentions | Changed / 100 controls | Control abstentions | Correct / all offered changes |',
             '| --- | ---: | ---: | ---: | ---: | ---: |']
    for name, result in results.items():
        e, c, a = (result['groups']['test/' + key] for key in ['error', 'control', 'all'])
        lines.append(f"| {name} | {e['correct']} | {e['uncertain']} | {c['undesired_control_changes']} | {c['uncertain']} | {a['correct_changes']} / {a['offered_changes']} |")
    lines += ['', 'A keep-all baseline offers no correction; its unchanged controls do not demonstrate correction ability.',
              'Abstentions are not correct decisions. Scores and margins are not calibrated probabilities.',
              'The balanced error/control mixture does not estimate precision in natural writing.',
              'Test positions are new; the writer population and stories were used in previous experiments.',
              '', 'Selected development margin: ' + str(model['chosen_margin']) + ' (null = infinite).', '']
    (base / 'comparison.md').write_text('\n'.join(lines), encoding='utf-8')
    print('\n'.join(lines))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base', type=Path, default=Path(__file__).resolve().parents[1] / 'tests/benchmark-artifacts/brillmoore/joint')
    score(parser.parse_args().base)
