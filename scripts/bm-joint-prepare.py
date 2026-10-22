"""Freeze writer-disjoint fit/calibration/new-test contexts before joint ranking.

Selection reads source partitions and previous sample IDs only, never predictions.
Inference files contain original spellings; gold/provenance stay separate.
"""
import argparse
import collections
import hashlib
import importlib.util
import json
from pathlib import Path
import zipfile

ROOT = Path(__file__).resolve().parents[1]
DEFAULT = ROOT / 'tests/benchmark-artifacts/brillmoore'
SEED = 'tagebuch-bm-joint-v1-2026-10-22'
PHASES = [('trainfit', 'dev', 200), ('devcal', 'dev', 100), ('test', 'test', 100)]
WRITER_SEED = 'tagebuch-bm-joint-dev-writers-v1-2026-10-22'
PUBLIC_KEYS = {'id', 'input', 'left', 'right', 'markedText'}
spec = importlib.util.spec_from_file_location('joint_context_helpers', ROOT / 'scripts/bm-context-prepare.py')
context = importlib.util.module_from_spec(spec)
spec.loader.exec_module(context)


def sha(data):
    return hashlib.sha256(data).hexdigest()


def order(row):
    return sha((SEED + '\0' + row['id']).encode('utf-8'))


def ranker_writers(partitions, fit_writer_count=20):
    writers = sorted({row['writer'] for row in partitions['dev']},
                     key=lambda writer: sha((WRITER_SEED + '\0' + writer).encode('utf-8')))
    if not 0 < fit_writer_count < len(writers):
        raise ValueError('Need nonempty disjoint fit and calibration writer pools')
    return {'trainfit': set(writers[:fit_writer_count]),
            'devcal': set(writers[fit_writer_count:]),
            'test': {row['writer'] for row in partitions['test']}}


def select(partitions, previous_context, previous_mini, phases=PHASES, fit_writer_count=20):
    """Stratify by recorded error/control role, with ID-only ordering thereafter."""
    writer_sets = [{row['writer'] for row in partitions[split]} for split in ['train', 'dev', 'test']]
    if any(writer_sets[i] & writer_sets[j] for i in range(3) for j in range(i)):
        raise ValueError('Writer partition leakage')
    all_ids = [row['id'] for rows in partitions.values() for row in rows]
    if len(all_ids) != len(set(all_ids)):
        raise ValueError('Duplicate occurrence IDs')
    phase_writers = ranker_writers(partitions, fit_writer_count)
    selected, exclusions = [], {}
    for phase, split, count in phases:
        pool = [row for row in partitions[split] if row['writer'] in phase_writers[phase]]
        if any(row['split'] != split for row in pool):
            raise ValueError('Source partition label mismatch')
        excluded_ids = previous_context | (previous_mini if phase == 'test' else set())
        exclusions[phase] = {
            'pool': len(pool),
            'prior_context': sum(row['id'] in previous_context for row in pool),
            'prior_mini': sum(row['id'] in previous_mini for row in pool),
            'excluded_union': sum(row['id'] in excluded_ids for row in pool),
            'eligible': dict(collections.Counter(row['role'] for row in pool if row['id'] not in excluded_ids)),
        }
        for role in ['error', 'control']:
            eligible = sorted((row for row in pool if row['role'] == role and row['id'] not in excluded_ids), key=order)
            if len(eligible) < count:
                raise ValueError(f'Insufficient {phase} {role}: {len(eligible)} < {count}')
            selected.extend({**row, 'phase': phase} for row in eligible[:count])
    return selected, exclusions


def jsonl_bytes(rows):
    return ''.join(json.dumps(row, ensure_ascii=False) + '\n' for row in rows).encode('utf-8')


def freeze_files(output, files):
    """Idempotent byte verification; never silently replace a frozen experiment."""
    for name, data in files.items():
        path = output / name
        if path.exists() and path.read_bytes() != data:
            raise ValueError(f'Frozen artifact differs; refusing overwrite: {path}')
    for name, data in files.items():
        path = output / name
        path.parent.mkdir(parents=True, exist_ok=True)
        if not path.exists():
            with path.open('xb') as handle:
                handle.write(data)


def prepare(base):
    parent_manifest = json.loads((base / 'manifest.json').read_text(encoding='utf-8'))
    context_manifest = json.loads((base / 'context/manifest.json').read_text(encoding='utf-8'))
    source_names = ['train.jsonl', 'dev.jsonl', 'test.jsonl', 'prepared/mini.jsonl',
                    'context/context.jsonl', 'context/train-sequences.jsonl', 'raw/litkey-data.zip']
    expected = {name: parent_manifest['output_sha256'][name] for name in ['train.jsonl', 'dev.jsonl', 'test.jsonl']}
    expected['prepared/mini.jsonl'] = parent_manifest['prepared_sha256']['mini.jsonl']
    expected.update({'context/' + name: context_manifest['files_sha256'][name]
                     for name in ['context.jsonl', 'train-sequences.jsonl']})
    expected['raw/litkey-data.zip'] = context.RAW_SHA
    sources = {name: (base / name).read_bytes() for name in source_names}
    for name, data in sources.items():
        if sha(data) != expected[name]:
            raise ValueError(f'Source hash mismatch: {name}')
    partitions = {split: context.read_jsonl(base / f'{split}.jsonl') for split in ['train', 'dev', 'test']}
    previous_context = {row['id'] for row in context.read_jsonl(base / 'context/context.jsonl')}
    previous_mini = {row['id'] for row in context.read_jsonl(base / 'prepared/mini.jsonl')}
    selected, exclusions = select(partitions, previous_context, previous_mini)
    source_rows = {}
    with zipfile.ZipFile(base / 'raw/litkey-data.zip') as archive:
        needed = {row['file'] for row in selected}
        for member in sorted(archive.namelist()):
            if Path(member).name in needed:
                raw = archive.read(member)
                source_rows[Path(member).name] = (context.parse_source(raw), sha(raw), member)
    gold, inputs = [], []
    for row in selected:
        evaluated, public = context.context_record(row, *source_rows[row['file']])
        gold.append(evaluated)
        inputs.append(public)
    train_writers = {row['writer'] for row in partitions['train']}
    sequences = context.read_jsonl(base / 'context/train-sequences.jsonl')
    if {row['writer'] for row in sequences} != train_writers:
        raise ValueError('LM sequence writers do not match training partition')
    files = {'context.jsonl': jsonl_bytes(gold), 'context-inputs.jsonl': jsonl_bytes(inputs),
             'inputs.tsv': ''.join(f"{row['id']}\t{row['input']}\n" for row in inputs).encode('utf-8'),
             'train-sequences.jsonl': sources['context/train-sequences.jsonl']}
    for phase, _, _ in PHASES:
        chosen = [row for row in gold if row['phase'] == phase]
        public = [{key: row[key] for key in ['id', 'input', 'left', 'right', 'markedText']} for row in chosen]
        files[f'{phase}/context.jsonl'] = jsonl_bytes(chosen)
        files[f'{phase}/context-inputs.jsonl'] = jsonl_bytes(public)
        files[f'{phase}/inputs.tsv'] = ''.join(f"{row['id']}\t{row['input']}\n" for row in public).encode('utf-8')
    manifest = {
        'version': 1, 'seed': SEED, 'window': context.WINDOW,
        'selection': 'Ascending SHA256(seed + NUL + id), separately by original writer split and role; fixed counts before candidate/ranker outputs.',
        'counts': {phase: dict(collections.Counter(row['role'] for row in gold if row['phase'] == phase)) for phase, _, _ in PHASES},
        'phase_split': {phase: split for phase, split, _ in PHASES},
        'selected_writer_counts': {phase: len({r['writer'] for r in gold if r['phase'] == phase}) for phase, _, _ in PHASES},
        'source_writer_counts': {split: len({r['writer'] for r in rows}) for split, rows in partitions.items()},
        'writer_partition': {'seed': WRITER_SEED,
                             'selection': 'Original development writers ordered by SHA256(seed + NUL + writer); first 20 fit ranker, remaining 17 calibrate. Original training writers fit BM and LM only.',
                             'writers': {phase: sorted(writers) for phase, writers in ranker_writers(partitions).items()}},
        'exclusions': exclusions,
        'previous_context_ids': len(previous_context), 'previous_mini_ids': len(previous_mini),
        'new_test_overlap_previous_context': len({r['id'] for r in gold if r['phase'] == 'test'} & previous_context),
        'new_test_overlap_previous_mini': len({r['id'] for r in gold if r['phase'] == 'test'} & previous_mini),
        'novel_error_pair_counts': {phase: sum(r['role'] == 'error' and not r['train_seen_pair'] for r in gold if r['phase'] == phase) for phase, _, _ in PHASES},
        'context': 'Original source column only, +/-12 source rows; annotation symbols retained, no gold-based neighbor repair.',
        'inputs_contract': 'Only id,input,left,right,markedText. Phase, split, role, target and provenance appear in gold files only.',
        'train_sequences': 'Byte-identical copy of previous train-only LM sequences, containing target text only for original training writers.',
        'limitations': ['Ranker fit and calibration use disjoint original development writers, both held out from base BM and LM training.',
                        'New test occurrence IDs were not evaluated previously; spelling pairs and stories may overlap prior tests and training.',
                        'The original test writer pool was used in prior experiments; new positions are not an independent new-writer corpus.',
                        'Balanced word-error/control sampling is artificial and does not estimate natural application prevalence.',
                        'Controls refer to original=target word spellings, not grammatical correctness of the surrounding sentence.'],
        'source_sha256': {name: sha(data) for name, data in sources.items()},
        'manifest_sha256': {name: sha((base / name).read_bytes()) for name in ['manifest.json', 'context/manifest.json']},
        'files_sha256': {name: sha(data) for name, data in files.items()},
        'license': 'Litkey Corpus, Laarmann-Quante et al. (2019), CC BY-SA 4.0; source attribution and citations in ../manifest.json.',
    }
    files['manifest.json'] = (json.dumps(manifest, ensure_ascii=False, indent=2) + '\n').encode('utf-8')
    files['README.md'] = (
        '# Frozen joint-ranking contexts\n\n'
        '400 trainfit occurrences (200 errors + 200 controls), 200 devcal occurrences '
        '(100 + 100), and 200 NEW test occurrences (100 + 100). All texts by a writer '
        'stay in their original train/dev/test partition. Twenty of the 37 original '
        'development writers fit the ranker; the remaining 17 calibrate it. These '
        'groups are writer-disjoint and neither trained base BM or LM. Original '
        'training writers supply BM and LM training only. Prior context IDs are excluded '
        'from every phase; every prior mini sample ID is additionally excluded from test.\n\n'
        'Selection is by seeded ID hashes and reads no model output. New occurrence IDs '
        'do not imply unseen words, spelling pairs, or stories. The original test '
        'writer pool was examined previously: this is a new-occurrence test, '
        'not a new independent collection of writers.\n\n'
        'context-inputs.jsonl and inputs.tsv have no target or evaluation metadata. '
        'context.jsonl is evaluation/training gold, with original split and explicit phase. '
        'Only original neighboring spellings are exposed as context. Annotation symbols '
        'remain unchanged. Source byte offsets and hashes are included in gold.\n\n'
        'train-sequences.jsonl is copied from the original train-writer-only LM source; '
        'it must never be sent as inference input. Phase subfolders contain matching '
        'gold and input subsets. Existing frozen files are checked byte-for-byte, '
        'and differing files cannot be overwritten.\n\n'
        'Attribution: Litkey Corpus, Laarmann-Quante et al. (2019), CC BY-SA 4.0; '
        'see ../manifest.json for source URLs, citation and license details.\n'
    ).encode('utf-8')
    freeze_files(base / 'joint', files)
    print(json.dumps({'output': str(base / 'joint'), 'counts': manifest['counts'],
                      'novel_errors': manifest['novel_error_pair_counts'], 'exclusions': exclusions}, ensure_ascii=False))
    return manifest


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base', type=Path, default=DEFAULT)
    prepare(parser.parse_args().base)
