"""Freeze a new occurrence test for confidence gates, without reading predictions."""
import argparse
import collections
import importlib.util
import json
from pathlib import Path
import zipfile

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('gate_joint_helpers', ROOT / 'scripts/bm-joint-prepare.py')
joint = importlib.util.module_from_spec(spec)
spec.loader.exec_module(joint)
context = joint.context
DEFAULT = joint.DEFAULT
SEED = 'tagebuch-bm-gate-v1-2026-10-22'
PUBLIC_KEYS = joint.PUBLIC_KEYS


def select(partitions, excluded, count=200):
    writers = [{r['writer'] for r in partitions[s]} for s in ['train', 'dev', 'test']]
    if any(writers[a] & writers[b] for a in range(3) for b in range(a)):
        raise ValueError('Writer partition leakage')
    ids = [r['id'] for rows in partitions.values() for r in rows]
    if len(ids) != len(set(ids)):
        raise ValueError('Duplicate occurrence IDs')
    if any(r['split'] != 'test' for r in partitions['test']):
        raise ValueError('Source partition label mismatch')
    selected = []
    for role in ['error', 'control']:
        eligible = sorted((r for r in partitions['test'] if r['role'] == role and r['id'] not in excluded),
                          key=lambda r: joint.sha((SEED + '\0' + r['id']).encode('utf-8')))
        if len(eligible) < count:
            raise ValueError(f'Insufficient test {role}: {len(eligible)} < {count}')
        selected.extend({**r, 'phase': 'test'} for r in eligible[:count])
    return selected


def prepare(base):
    parent = json.loads((base / 'manifest.json').read_text(encoding='utf-8'))
    prior_context = json.loads((base / 'context/manifest.json').read_text(encoding='utf-8'))
    prior_joint = json.loads((base / 'joint/manifest.json').read_text(encoding='utf-8'))
    expected = {name: parent['output_sha256'][name] for name in ['train.jsonl', 'dev.jsonl', 'test.jsonl']}
    expected['prepared/mini.jsonl'] = parent['prepared_sha256']['mini.jsonl']
    expected['raw/litkey-data.zip'] = context.RAW_SHA
    for name in ['context.jsonl', 'train-sequences.jsonl']:
        expected['context/' + name] = prior_context['files_sha256'][name]
    for name in ['test/context.jsonl', 'devcal/context.jsonl', 'devcal/context-inputs.jsonl', 'devcal/inputs.tsv']:
        expected['joint/' + name] = prior_joint['files_sha256'][name]
    sources = {name: (base / name).read_bytes() for name in expected}
    for name, data in sources.items():
        if joint.sha(data) != expected[name]:
            raise ValueError(f'Source hash mismatch: {name}')
    partitions = {s: context.read_jsonl(base / (s + '.jsonl')) for s in ['train', 'dev', 'test']}
    exclusion_sources = ['prepared/mini.jsonl', 'context/context.jsonl', 'joint/test/context.jsonl']
    exclusions = {name: {r['id'] for r in context.read_jsonl(base / name)} for name in exclusion_sources}
    excluded = set().union(*exclusions.values())
    chosen = select(partitions, excluded)
    original = {}
    with zipfile.ZipFile(base / 'raw/litkey-data.zip') as archive:
        needed = {r['file'] for r in chosen}
        for member in sorted(archive.namelist()):
            if Path(member).name in needed:
                data = archive.read(member)
                original[Path(member).name] = (context.parse_source(data), joint.sha(data), member)
    gold, public = [], []
    for row in chosen:
        evaluated, inference = context.context_record(row, *original[row['file']])
        gold.append(evaluated)
        public.append(inference)
    tsv = ''.join(f"{r['id']}\t{r['input']}\n" for r in public).encode('utf-8')
    files = {'test/context.jsonl': joint.jsonl_bytes(gold),
             'test/context-inputs.jsonl': joint.jsonl_bytes(public), 'test/inputs.tsv': tsv, 'inputs.tsv': tsv}
    manifest = {
        'version': 1, 'seed': SEED, 'window': context.WINDOW,
        'selection': 'Ascending SHA256(seed + NUL + id), stratified by error/control, 200 each. No model outputs read.',
        'counts': {'test': dict(collections.Counter(r['role'] for r in gold))},
        'source_writer_counts': {s: len({r['writer'] for r in rows}) for s, rows in partitions.items()},
        'selected_writer_count': len({r['writer'] for r in gold}),
        'selected_writers': sorted({r['writer'] for r in gold}),
        'selected_id_sha256': joint.sha('\n'.join(r['id'] for r in gold).encode('utf-8')),
        'excluded_ids': {name: len(ids) for name, ids in exclusions.items()},
        'overlap_prior_ids': {name: len({r['id'] for r in gold} & ids) for name, ids in exclusions.items()},
        'novel_error_pairs': sum(r['role'] == 'error' and not r['train_seen_pair'] for r in gold),
        'context': 'Original source column only, +/-12 source rows. Annotation symbols retained.',
        'inputs_contract': 'Only id,input,left,right,markedText; targets and provenance are separate gold.',
        'base_training': 'Original 175 training writers unchanged; existing context/train-sequences.jsonl and BM training reused.',
        'calibration': 'Existing joint/devcal 200 occurrences unchanged, not resampled or copied. Their source hashes are recorded.',
        'limitations': ['New occurrence IDs from the existing 39 test writers, not a new independent writer corpus.',
                       'Words, error pairs and stories may overlap previous experiments.',
                       'Balanced errors/controls do not represent natural application prevalence.',
                       'Control spelling is unchanged in gold; surrounding grammar may still be wrong.'],
        'source_sha256': {name: joint.sha(data) for name, data in sources.items()},
        'manifest_sha256': {name: joint.sha((base / name).read_bytes()) for name in ['manifest.json', 'context/manifest.json', 'joint/manifest.json']},
        'files_sha256': {name: joint.sha(data) for name, data in files.items()},
        'license': 'Litkey Corpus, Laarmann-Quante et al. (2019), CC BY-SA 4.0; attribution and source links in ../manifest.json.'}
    files['manifest.json'] = (json.dumps(manifest, ensure_ascii=False, indent=2) + '\n').encode('utf-8')
    joint.freeze_files(base / 'gate', files)
    print(json.dumps({'output': str(base / 'gate'), 'counts': manifest['counts'], 'novel_errors': manifest['novel_error_pairs'],
                      'selected_writer_count': manifest['selected_writer_count'], 'overlap_prior_ids': manifest['overlap_prior_ids']}))
    return manifest


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base', type=Path, default=DEFAULT)
    prepare(parser.parse_args().base)
