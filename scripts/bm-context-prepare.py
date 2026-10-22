"""Freeze original-only context windows for a held-out candidate-selection pilot.

Gold and training targets are written separately from inference inputs. This is
not a sentence reconstruction: original annotation symbols remain visible.
"""
import argparse
import collections
import hashlib
import json
from pathlib import Path
import zipfile

ROOT = Path(__file__).resolve().parents[1]
DEFAULT = ROOT / 'tests/benchmark-artifacts/brillmoore'
SEED = 'tagebuch-bm-context-v1-2026-10-22'
WINDOW = 12
RAW_SHA = '13ada44559188056c754c97d78f45ed496ca6326e3763ca10364bc50d207ed98'


def sha(data):
    return hashlib.sha256(data).hexdigest()


def read_jsonl(path):
    return [json.loads(line) for line in path.read_text(encoding='utf-8').splitlines() if line]


def write_jsonl(path, rows):
    path.write_text(''.join(json.dumps(row, ensure_ascii=False) + '\n' for row in rows), encoding='utf-8')


def order(row):
    return sha((SEED + '\0' + row['id']).encode('utf-8'))


def parse_source(data):
    """Keep byte provenance and original tokens without target-based repair."""
    rows, offset = [], 0
    for number, raw in enumerate(data.splitlines(keepends=True), 1):
        line = raw.decode('utf-8').rstrip('\r\n')
        if number == 1:
            line = line.removeprefix('\ufeff')
        parts = line.split('\t')
        if len(parts) != 2:
            raise ValueError(f'Expected two columns at line {number}')
        rows.append({'original': parts[0], 'target': parts[1],
                     'byte_start': offset, 'byte_end': offset + len(raw)})
        offset += len(raw)
    return rows


def context_record(row, source, source_sha, member):
    index = row.get('line', row.get('index')) - 1
    if source[index]['original'] != row['input'] or source[index]['target'] != row['target']:
        raise ValueError(f"Corpus alignment mismatch: {row['id']}")
    start, end = max(0, index - WINDOW), min(len(source), index + WINDOW + 1)
    tokens = [item['original'] for item in source[start:end]]
    position = index - start
    left, right = ' '.join(tokens[:position]), ' '.join(tokens[position + 1:])
    marked = ' '.join(part for part in [left, '[[' + row['input'] + ']]', right] if part)
    public = {'id': row['id'], 'input': row['input'], 'left': left,
              'right': right, 'markedText': marked}
    gold = {**row, **public, 'line': index + 1, 'windowStartLine': start + 1,
            'windowEndLine': end, 'markedTokenIndex': position,
            'rawOriginalTokens': tokens, 'sourceMember': member,
            'sourceFileSha256': source_sha,
            'sourceRowByteStart': source[index]['byte_start'],
            'sourceRowByteEnd': source[index]['byte_end']}
    return gold, public


def prepare(base):
    output = base / 'context'
    output.mkdir(parents=True, exist_ok=True)
    raw_path = base / 'raw/litkey-data.zip'
    if sha(raw_path.read_bytes()) != RAW_SHA:
        raise ValueError('Pinned Litkey archive hash mismatch')
    train = read_jsonl(base / 'train.jsonl')
    dev = read_jsonl(base / 'dev.jsonl')
    mini = read_jsonl(base / 'prepared/mini.jsonl')
    train_writers = {row['writer'] for row in train}
    dev_writers = {row['writer'] for row in dev}
    test_pool = [row for row in mini if row['split'] == 'test']
    test_writers = {row['writer'] for row in test_pool}
    if train_writers & dev_writers or train_writers & test_writers or dev_writers & test_writers:
        raise ValueError('Writer partition leakage')
    selected = []
    for pool, split, count in [(dev, 'dev', 30), (test_pool, 'test', 50)]:
        for role in ['error', 'control']:
            eligible = sorted((row for row in pool if row['role'] == role), key=order)
            if len(eligible) < count:
                raise ValueError(f'Insufficient {split} {role}')
            selected.extend(eligible[:count])
    sources, sequences = {}, []
    with zipfile.ZipFile(raw_path) as archive:
        for member in sorted(archive.namelist()):
            if not member.endswith('.csv'):
                continue
            file = Path(member).name
            writer = file.removesuffix('.csv').split('-')[1]
            data = archive.read(member)
            source = parse_source(data)
            sources[file] = (source, sha(data), member)
            if writer in train_writers:
                sequences.append({'file': file, 'writer': writer,
                                  'tokens': [row['target'] for row in source]})
    gold, inputs = [], []
    for row in selected:
        evaluated, public = context_record(row, *sources[row['file']])
        gold.append(evaluated)
        inputs.append(public)
    write_jsonl(output / 'context.jsonl', gold)
    write_jsonl(output / 'context-inputs.jsonl', inputs)
    write_jsonl(output / 'train-sequences.jsonl', sequences)
    (output / 'inputs.tsv').write_text(''.join(f"{r['id']}\t{r['input']}\n" for r in inputs), encoding='utf-8')
    novel_test = [row['id'] for row in gold if row['split'] == 'test' and row['role'] == 'error' and not row['train_seen_pair']]
    counts = {split: dict(collections.Counter(row['role'] for row in gold if row['split'] == split)) for split in ['dev', 'test']}
    manifest = {'version': 1, 'seed': SEED, 'window': WINDOW,
                'selection': 'Ascending SHA256(seed + NUL + id), separately by split and role; no performance/gold-based selection',
                'counts': counts, 'dev_writer_pool': len(dev_writers),
                'train_writer_count': len(train_writers),
                'selected_writer_counts': {split: len({r['writer'] for r in gold if r['split'] == split}) for split in ['dev', 'test']},
                'test_source': 'Existing frozen 200-error + 200-control mini pool, not the full test partition',
                'test_novel_pair_occurrence_ids': novel_test,
                'test_novel_pairs_selected': len(novel_test),
                'mini_test_novel_pairs_total': sum(r['role'] == 'error' and not r['train_seen_pair'] for r in test_pool),
                'context': 'Only ORIGINAL column, exactly +/-12 source rows; annotations retained literally, including ^ and underscores. Space-joined display is not raw prose.',
                'provenance': 'Gold file has exact source member, source bytes SHA256, row byte interval (end exclusive), 1-based line and exact original token window. Byte interval refers to decompressed original file.',
                'inputs_contract': 'Only id,input,left,right,markedText; no target, role, split, names list, correction hints or neighbor target columns',
                'dyslist': 'Excluded from context experiment: no sentence context; no invented context',
                'train_sequences': 'Target-column sequences ONLY for training writers; annotation symbols retained for downstream documented LM token filtering',
                'source_sha256': {'raw/litkey-data.zip': RAW_SHA},
                'source_manifest': '../manifest.json; Litkey attribution and CC BY-SA 4.0 apply to these local derived artifacts',
                'files_sha256': {name: sha((output / name).read_bytes()) for name in ['context.jsonl', 'context-inputs.jsonl', 'inputs.tsv', 'train-sequences.jsonl']}}
    (output / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    (output / 'README.md').write_text('# Frozen original-only context pilot\n\n'
        '60 development occurrences (30 errors, 30 controls), and 100 test occurrences '
        '(50 errors, 50 controls) hash-sampled before context inference. Training, development '
        'and test writers are disjoint. Test comes from the previous frozen mini benchmark. '
        'Word controls can still occur in erroneous surrounding text.\n\n'
        'context-inputs.jsonl and inputs.tsv contain no gold. context.jsonl is evaluation-only. '
        'train-sequences.jsonl is explicitly training-only target text for a statistical LM. '
        'Never pass those target sequences or evaluation metadata to Qwen.\n\n'
        'Context uses original spellings only. Annotation markers are deliberately not repaired. '
        'A display with space-separated source tokens is not a reconstructed grammatical sentence. '
        'Byte offsets and file hashes in the gold file allow verification against decompressed ZIP members.\n\n'
        f'Of the prior mini sample\'s {manifest["mini_test_novel_pairs_total"]} unseen error-pair occurrences, '
        f'{len(novel_test)} are in this fixed 50-error test subset. Their exact IDs are listed in manifest.json. '
        'No inference or tuning is performed by this script. DysList has no context and is excluded.\n\n'
        'Data attribution/license: see ../manifest.json (Litkey Corpus, Laarmann-Quante et al., 2019; CC BY-SA 4.0).\n', encoding='utf-8')
    print(json.dumps({'output': str(output), 'counts': counts, 'novel_test': len(novel_test)}, ensure_ascii=False))
    return manifest


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base', type=Path, default=DEFAULT)
    args = parser.parse_args()
    prepare(args.base)
