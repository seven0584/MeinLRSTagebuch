"""Fixed cost-gate comparison on new positions; no application integration."""
import datetime
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'tests/benchmark-artifacts/brillmoore'
GATE = BASE / 'gate'
SPEC = importlib.util.spec_from_file_location('gate_evaluation', ROOT / 'scripts/bm-context-rank.py')
evaluation = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(evaluation)


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def dump(path, value):
    with path.open('x', encoding='utf-8') as output:
        json.dump(value, output, ensure_ascii=False, allow_nan=False, indent=2)
        output.write('\n')


def run(script, *args):
    subprocess.run([sys.executable, str(ROOT / 'scripts' / script), *map(str, args)], check=True)


def main():
    config = GATE / 'config.json'
    if config.exists():
        raise ValueError('Existing experiment config; archive previous results before rerunning')
    manifest = json.loads((GATE / 'manifest.json').read_text(encoding='utf-8'))
    for name, value in manifest['files_sha256'].items():
        if sha(GATE / name) != value:
            raise ValueError('Frozen data changed: ' + name)
    # Reuse the calibration already frozen before new test predictions.
    with config.open('xb') as output:
        output.write((BASE / 'cost-gate/config.json').read_bytes())
    bm = BASE / 'bm-gate-expanded.jsonl'
    model = BASE / 'joint/model.json'
    if json.loads(model.read_text(encoding='utf-8'))['chosen_margin'] != 4.0:
        raise ValueError('Expected the previously frozen joint model with margin 4')
    freeze = dict(config_sha256=sha(config), joint_model_sha256=sha(model),
                  frozen_before_test_prediction_utc=datetime.datetime.now(datetime.timezone.utc).isoformat(),
                  bm_sha256=sha(bm), data_manifest_sha256=sha(GATE / 'manifest.json'),
                  scripts_sha256={name: sha(ROOT / 'scripts' / name) for name in
                                  ['bm-cost-gate.py', 'bm-joint-rank.py', 'bm-context-rank.py', 'bm-gate-experiment.py']})
    dump(GATE / 'decision-freeze.json', freeze)
    folder = GATE / 'test'
    for policy in ['pragmatic', 'strict']:
        run('bm-cost-gate.py', 'predict', '--config', config, '--inputs', folder / 'context-inputs.jsonl',
            '--bm', bm, '--out', folder / ('bm-' + policy + '.jsonl'), '--policy', policy)
    run('bm-joint-rank.py', 'predict', '--model', model, '--inputs', folder / 'context-inputs.jsonl',
        '--bm', bm, '--out', folder / 'joint-strict.jsonl')
    inputs_path = folder / 'bm-pragmatic.jsonl.inputs.jsonl'
    inputs = evaluation.read(inputs_path)
    ids = set(evaluation.indexed(inputs))
    for path in [folder / 'bm-strict.jsonl.inputs.jsonl', folder / 'joint-strict.jsonl.inputs.jsonl']:
        if evaluation.read(path) != inputs:
            raise ValueError('Compared methods use different candidates')
    original = evaluation.indexed(evaluation.read(folder / 'context-inputs.jsonl'))
    if ids != set(original) or any(r['input'] != original[r['id']]['input'] for r in inputs):
        raise ValueError('Predictions changed the frozen input')
    evaluation.write(folder / 'bm-first.jsonl', [dict(id=r['id'], decision='candidate' if r['candidates'] else 'uncertain',
                     candidateId=r['candidates'][0]['id'] if r['candidates'] else None) for r in inputs])
    evaluation.write(folder / 'keep.jsonl', [dict(id=r['id'], decision='keep', candidateId=None) for r in inputs])
    # Parse test labels only after every method's predictions are persisted.
    gold = evaluation.read(folder / 'context.jsonl')
    if len(gold) != len(inputs) or set(evaluation.indexed(gold)) != ids:
        raise ValueError('Gold/input IDs differ')
    results = {}
    for name in ['bm-first', 'bm-pragmatic', 'bm-strict', 'joint-strict', 'keep']:
        rows = evaluation.read(folder / (name + '.jsonl'))
        if set(evaluation.indexed(rows)) != ids:
            raise ValueError('Incomplete predictions: ' + name)
        result = evaluation.evaluate(gold, inputs, rows)
        if result['groups']['test/all']['missing'] or result['groups']['test/all']['invalid_choice']:
            raise ValueError('Invalid decisions: ' + name)
        results[name] = result
    if sha(config) != freeze['config_sha256'] or sha(model) != freeze['joint_model_sha256']:
        raise ValueError('Model/config changed during comparison')
    for name, value in freeze['scripts_sha256'].items():
        if sha(ROOT / 'scripts' / name) != value:
            raise ValueError('Frozen code changed during comparison: ' + name)
    for name, value in manifest['files_sha256'].items():
        if sha(GATE / name) != value:
            raise ValueError('Frozen test data changed during comparison: ' + name)
    dump(GATE / 'comparison.json', dict(method='new occurrence test, original-context fixed word positions',
         artificial_error_prevalence=0.5, config_sha256=sha(config), joint_model_sha256=sha(model), results=results))
    lines = ['# Cost-gate comparison: new word positions', '',
             '| Method | Correct / 200 errors | Error abstentions | Changed / 200 controls | Control abstentions | Correct / all offered changes |',
             '| --- | ---: | ---: | ---: | ---: | ---: |']
    for name, result in results.items():
        e, c, a = (result['groups']['test/' + k] for k in ['error', 'control', 'all'])
        lines.append(f"| {name} | {e['correct']} | {e['uncertain']} | {c['undesired_control_changes']} | {c['uncertain']} | {a['correct_changes']} / {a['offered_changes']} |")
    lines += ['', 'Observed calibration precision is not a calibrated probability for a new suggestion.',
              'New occurrence IDs, existing writer population; balanced sampling does not represent deployment prevalence.',
              'Uncertain and keep are different outcomes; neither repairs a reference error.', '']
    (GATE / 'comparison.md').write_text('\n'.join(lines), encoding='utf-8')
    dump(GATE / 'completion-audit.json', dict(status='passed', frozen_config_unchanged=True,
         frozen_joint_model_unchanged=True, data_files_verified=len(manifest['files_sha256']),
         complete_test_variants=len(results), rows_per_variant=len(inputs)))
    print('\n'.join(lines))


if __name__ == '__main__':
    main()
