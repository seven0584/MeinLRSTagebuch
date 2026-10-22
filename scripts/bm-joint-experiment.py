"""Run the fixed joint experiment after gold-blind BM candidates are persisted."""
import datetime
import hashlib
import json
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'tests/benchmark-artifacts/brillmoore'
JOINT = BASE / 'joint'


def read(path):
    return [json.loads(line) for line in path.read_text(encoding='utf-8').splitlines() if line]


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write(path, rows):
    with path.open('x', encoding='utf-8') as output:
        for row in rows:
            output.write(json.dumps(row, ensure_ascii=False, allow_nan=False) + '\n')


def run(script, *args):
    subprocess.run([sys.executable, str(ROOT / 'scripts' / script), *map(str, args)], check=True)


def main():
    model = JOINT / 'model.json'
    if model.exists():
        raise ValueError('Existing model: archive the previous experiment before running again')
    manifest = json.loads((JOINT / 'manifest.json').read_text(encoding='utf-8'))
    for name, expected in manifest['files_sha256'].items():
        if sha(JOINT / name) != expected:
            raise ValueError('Frozen data changed: ' + name)
    bm_path = BASE / 'bm-joint-expanded.jsonl'
    bm_rows = read(bm_path)
    bm = {r['id']: r for r in bm_rows}
    if len(bm) != len(bm_rows):
        raise ValueError('Duplicate BM IDs')
    all_ids = set()
    for phase in ['trainfit', 'devcal', 'test']:
        # Partition using gold-free input IDs, never the test label file.
        rows = read(JOINT / phase / 'context-inputs.jsonl')
        ids = {r['id'] for r in rows}
        if len(ids) != len(rows) or all_ids & ids:
            raise ValueError('Duplicate phase IDs')
        all_ids |= ids
        write(JOINT / phase / 'bm-candidates.jsonl', [bm[r['id']] for r in rows])
    if all_ids != set(bm):
        raise ValueError('Unexpected BM rows')
    run('bm-joint-rank.py', 'fit',
        '--fit-gold', JOINT / 'trainfit/context.jsonl',
        '--fit-inputs', JOINT / 'trainfit/context-inputs.jsonl',
        '--fit-bm', JOINT / 'trainfit/bm-candidates.jsonl',
        '--dev-gold', JOINT / 'devcal/context.jsonl',
        '--dev-inputs', JOINT / 'devcal/context-inputs.jsonl',
        '--dev-bm', JOINT / 'devcal/bm-candidates.jsonl',
        '--lm-training', JOINT / 'train-sequences.jsonl',
        '--dictionary', BASE / 'joint-expanded/dictionary.tsv', '--output', model)
    frozen = dict(model_sha256=sha(model), frozen_before_test_prediction_utc=datetime.datetime.now(datetime.timezone.utc).isoformat(),
                  bm_sha256=sha(bm_path), data_manifest_sha256=sha(JOINT / 'manifest.json'),
                  scripts_sha256={name: sha(ROOT / 'scripts' / name) for name in ['bm-joint-rank.py', 'bm-context-rank.py', 'bm-joint-score.py', 'bm-joint-experiment.py']})
    (JOINT / 'training-freeze.json').write_text(json.dumps(frozen, indent=2) + '\n', encoding='utf-8')
    for phase in ['devcal', 'test']:
        folder = JOINT / phase
        for name, extra in [('joint-raw', ['--raw']), ('joint-safe', [])]:
            run('bm-joint-rank.py', 'predict', '--model', model,
                '--inputs', folder / 'context-inputs.jsonl', '--bm', folder / 'bm-candidates.jsonl',
                '--out', folder / (name + '.jsonl'), *extra)
        inputs = read(folder / 'joint-raw.jsonl.inputs.jsonl')
        write(folder / 'bm-results.jsonl', [dict(id=r['id'], decision='candidate' if r['candidates'] else 'uncertain',
              candidateId=r['candidates'][0]['id'] if r['candidates'] else None) for r in inputs])
        write(folder / 'keep-results.jsonl', [dict(id=r['id'], decision='keep', candidateId=None) for r in inputs])
    if sha(model) != frozen['model_sha256']:
        raise ValueError('Model changed during prediction')
    run('bm-joint-score.py', '--base', JOINT)


if __name__ == '__main__':
    main()
