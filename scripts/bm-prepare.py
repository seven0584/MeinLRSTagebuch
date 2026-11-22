"""Prepare a fixed, writer-disjoint word-level Brill/Moore feasibility corpus.

No diary input, no test-derived lexicon and no downloaded executable code.
All third-party material stays in the ignored benchmark-artifacts directory.
"""
import argparse
import collections
import csv
import hashlib
import io
import json
from pathlib import Path
import re
import urllib.request
import zipfile

ROOT = Path(__file__).resolve().parents[1]
DEFAULT = ROOT / 'tests/benchmark-artifacts/brillmoore'
SEED = 'tagebuch-bm-feasibility-v1-2026-10-22'
LIT_REV = '150c90bd6994a4b664e69afd9fb74fc152cc6b6a'
DYS_REV = '4900e693d1771cba03e1d15e3f80d80c9dc61fc0'
ASSETS = {
    'litkey-data.zip': f'https://raw.githubusercontent.com/catalpa-cl/spellchecker-evaluation-german-children/{LIT_REV}/litkey-data.zip',
    'dyslist.csv': f'https://raw.githubusercontent.com/Rauschii/DysListGerman/{DYS_REV}/German_Annotation_V028.csv',
    'dyslist-LICENSE': f'https://raw.githubusercontent.com/Rauschii/DysListGerman/{DYS_REV}/LICENSE',
}
EXPECTED_HASHES = {
    'litkey-data.zip': '13ada44559188056c754c97d78f45ed496ca6326e3763ca10364bc50d207ed98',
    'dyslist.csv': '6002bb4c2e423b2f55ad018fe8e7c93298f60f4b59b74f4dfe1a8199e567cadb',
    'dyslist-LICENSE': 'ee3f4bef73597a15e6870580a69ec4ca56ec7b77d45db1bec25ba0e719115dc8',
}
DATA_OUTPUTS = [
    f'{split}{suffix}.jsonl'
    for split in ['train', 'dev', 'test']
    for suffix in ['', '-errors', '-controls']
] + ['dev-novel-pairs.jsonl', 'test-novel-pairs.jsonl', 'excluded.jsonl',
     'dyslist.jsonl', 'dyslist-excluded.jsonl', 'lexicon.txt',
     'lexicon-frequency.tsv', 'train-errors.tsv', 'mini.jsonl']
PREPARED_OUTPUTS = ['train.tsv', 'dictionary.tsv', 'inputs.tsv', 'mini.jsonl']
DATA_README = '''# Word-level Brill & Moore feasibility data

This is a single-word candidate-generation experiment, not a sentence-level
spelling or grammar benchmark. Litkey targets correct orthography only; unchanged
word controls do not establish that their surrounding sentences are grammatical.

The pinned Litkey mirror provides headerless original<TAB>target files. The
second filename component identifies the child. All texts from each child stay
in one deterministic 70/15/15 training/development/test partition. The original
case is preserved. Only single words consisting of German alphabetic letters
are retained; one-letter targets, punctuation, unreadable or ambiguous
annotations, and word-boundary annotations are excluded without repair. Tokens
whose target is Lea, Lars or Dodo are excluded because these are predefined story
characters; this is not general proper-name detection. Exclusions retain their
original values in excluded.jsonl.

The lexicon and its priors use valid target occurrences from training children
only, including original words that were already correct. Test targets are never
added. The lexicon is small and story-specific. Common stories and spelling
pairs may occur across different children; train_seen_pair exposes exact pair
overlap, and separate novel-pairs files retain the harder unseen-pair subset.

DysList is an external word list without writer identities or sentence context.
Its source CSV uses Windows-1252 and contains underscores and other artifacts;
unsupported words are excluded rather than guessed. External data can still
contain spelling pairs present in Litkey training.

The mini sample was fixed by seeded hashes before model evaluation: 200 held-out
error occurrences, 200 truly unchanged original word occurrences, and 100 DysList
errors. Sampling counts occurrences, not unique word types.

Prepared contracts (headerless TSV, UTF-8):
- train.tsv: original, target, occurrence count (unique training error pairs).
- dictionary.tsv: word, prior = train target count / total, no smoothing.
- inputs.tsv: occurrence ID, original input; no gold or hint columns.
- mini.jsonl: full evaluation metadata, including target, role, writer, file,
  line, train_seen_pair and target_in_lexicon. Keep gold out of model inputs.

data-manifest.json records source URLs, pinned revisions, hashes, counts,
licenses and citations. Litkey is CC BY-SA 4.0; DysList's pinned repository
provides an MIT license. Third-party data and derived artifacts stay local in
the ignored benchmark-artifacts directory. No diary data is used.
'''
WORD = re.compile(r'[A-Za-zÄÖÜäöüß]+\Z')


def digest(data):
    return hashlib.sha256(data).hexdigest()


def stable_key(value):
    return digest((SEED + '\0' + value).encode('utf-8'))


def write_json(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def write_jsonl(path, rows):
    path.write_text(''.join(json.dumps(x, ensure_ascii=False) + '\n' for x in rows), encoding='utf-8')


def prepare(output, download=True):
    raw = output / 'raw'
    raw.mkdir(parents=True, exist_ok=True)
    sources = []
    for name, url in ASSETS.items():
        path = raw / name
        if not path.exists():
            if not download:
                raise FileNotFoundError(path)
            with urllib.request.urlopen(url, timeout=60) as response:
                data = response.read()
            path.write_bytes(data)
        data = path.read_bytes()
        if digest(data) != EXPECTED_HASHES[name]:
            raise ValueError(f'Pinned source hash mismatch: {name}')
        sources.append({'path': f'raw/{name}', 'url': url, 'sha256': digest(data), 'bytes': len(data)})

    rows, excluded = [], []
    file_names = []
    with zipfile.ZipFile(raw / 'litkey-data.zip') as archive:
        for name in sorted(archive.namelist()):
            if not name.endswith('.csv'):
                continue
            filename = Path(name).name
            parts = filename.removesuffix('.csv').split('-')
            if len(parts) != 5 or not parts[1].isdigit():
                raise ValueError(f'Unexpected Litkey filename: {filename}')
            file_names.append(filename)
            text = archive.read(name).decode('utf-8-sig')
            for index, line in enumerate(text.splitlines(), 1):
                fields = line.split('\t')
                if len(fields) != 2:
                    raise ValueError(f'Unexpected row: {filename}:{index}')
                original, target = fields
                record = {'id': f'litkey:{filename}:{index}', 'input': original,
                          'target': target, 'writer': parts[1], 'file': filename,
                          'index': index, 'role': 'control' if original == target else 'error'}
                # Deliberately keep annotated word-boundary errors out of this single-word
                # prototype. Removing _ / | would otherwise silently fix some errors.
                reason = None
                if not WORD.fullmatch(original) or not WORD.fullmatch(target):
                    reason = 'non_single_word_or_annotation'
                elif len(target) < 2:
                    reason = 'one_letter_target'
                elif target in {'Lea', 'Lars', 'Dodo'}:
                    reason = 'story_character_name'
                if reason:
                    excluded.append({**record, 'reason': reason})
                else:
                    rows.append(record)
    writers = sorted({r['writer'] for r in rows}, key=stable_key)
    # Fixed counts after deterministic hash ordering: all texts by one child stay together.
    train_n, dev_n = int(len(writers) * .70), int(len(writers) * .15)
    split_by_writer = {w: ('train' if i < train_n else 'dev' if i < train_n + dev_n else 'test')
                       for i, w in enumerate(writers)}
    for row in rows:
        row['split'] = split_by_writer[row['writer']]
    train_pairs = {(r['input'], r['target']) for r in rows if r['split'] == 'train' and r['role'] == 'error'}
    frequencies = collections.Counter(r['target'] for r in rows if r['split'] == 'train')
    lexicon = sorted(frequencies, key=lambda w: (-frequencies[w], w))[:20000]
    lexicon_set = set(lexicon)
    for row in rows:
        row['train_seen_pair'] = (row['input'], row['target']) in train_pairs
        row['target_in_lexicon'] = row['target'] in lexicon_set

    dys_rows, dys_excluded = [], []
    # Published CSV is Windows-1252, semicolon-delimited. Underscores occur in
    # the source itself; they are not guessed or repaired here.
    reader = csv.DictReader(io.StringIO((raw / 'dyslist.csv').read_bytes().decode('cp1252'), newline=None), delimiter=';')
    for item in reader:
        original, target = item['Error_Word'], item['Correct_Word']
        record = {'id': 'dyslist:' + item['ID'], 'input': original, 'target': target,
                  'writer': None, 'file': 'German_Annotation_V028.csv', 'index': int(item['ID']),
                  'role': 'error' if original != target else 'control', 'split': 'external',
                  'train_seen_pair': (original, target) in train_pairs,
                  'target_in_lexicon': target in lexicon_set,
                  'error_type': item['Error_Type'], 'real_word_error': item['Real_World_Error']}
        if not WORD.fullmatch(original) or not WORD.fullmatch(target) or len(target) < 2:
            dys_excluded.append({**record, 'reason': 'non_single_german_word_or_source_artifact'})
        else:
            dys_rows.append(record)

    for split in ['train', 'dev', 'test']:
        selected = [r for r in rows if r['split'] == split]
        write_jsonl(output / f'{split}.jsonl', selected)
        write_jsonl(output / f'{split}-errors.jsonl', [r for r in selected if r['role'] == 'error'])
        write_jsonl(output / f'{split}-controls.jsonl', [r for r in selected if r['role'] == 'control'])
        if split != 'train':
            write_jsonl(output / f'{split}-novel-pairs.jsonl', [r for r in selected if r['role'] == 'error' and not r['train_seen_pair']])
    write_jsonl(output / 'excluded.jsonl', excluded)
    write_jsonl(output / 'dyslist.jsonl', dys_rows)
    write_jsonl(output / 'dyslist-excluded.jsonl', dys_excluded)
    (output / 'lexicon.txt').write_text('\n'.join(lexicon) + '\n', encoding='utf-8')
    (output / 'lexicon-frequency.tsv').write_text(''.join(f'{w}\t{frequencies[w]}\n' for w in lexicon), encoding='utf-8')
    training_errors = [r for r in rows if r['split'] == 'train' and r['role'] == 'error']
    # Explicit headerless original<TAB>target; original occurrences are retained.
    (output / 'train-errors.tsv').write_text(''.join(f"{r['input']}\t{r['target']}\n" for r in training_errors), encoding='utf-8')
    mini = []
    for role in ['error', 'control']:
        eligible = [r for r in rows if r['split'] == 'test' and r['role'] == role]
        mini.extend(sorted(eligible, key=lambda r: stable_key(r['id']))[:200])
    mini.extend(sorted(dys_rows, key=lambda r: stable_key(r['id']))[:100])
    write_jsonl(output / 'mini.jsonl', mini)
    prepared = output / 'prepared'
    prepared.mkdir(exist_ok=True)
    mini_contract = [{**r, 'role': 'external' if r['split'] == 'external' else r['role'],
                      'line': r['index']} for r in mini]
    write_jsonl(prepared / 'mini.jsonl', mini_contract)
    (prepared / 'inputs.tsv').write_text(''.join(f"{r['id']}\t{r['input']}\n" for r in mini_contract), encoding='utf-8')
    pair_counts = collections.Counter((r['input'], r['target']) for r in training_errors)
    (prepared / 'train.tsv').write_text(''.join(f'{original}\t{target}\t{count}\n'
                                             for (original, target), count in sorted(pair_counts.items())), encoding='utf-8')
    total_frequency = sum(frequencies[w] for w in lexicon)
    (prepared / 'dictionary.tsv').write_text(''.join(f'{w}\t{frequencies[w] / total_frequency:.17g}\n' for w in lexicon), encoding='utf-8')
    stats = {}
    for split in ['train', 'dev', 'test']:
        selected = [r for r in rows if r['split'] == split]
        errors = [r for r in selected if r['role'] == 'error']
        stats[split] = {'writers': len({r['writer'] for r in selected}), 'rows': len(selected),
                        'errors': len(errors), 'controls': len(selected) - len(errors),
                        'novel_error_pairs_occurrences': sum(not r['train_seen_pair'] for r in errors),
                        'error_targets_in_lexicon': sum(r['target_in_lexicon'] for r in errors)}
    manifest = {'version': 1, 'seed': SEED, 'sources': sources,
                'litkey_commit': LIT_REV, 'dyslist_commit': DYS_REV,
                'split': 'SHA256(seed + NUL + writer), ascending; floor(70%) train, floor(15%) dev, remainder test',
                'writer_id': 'second hyphen-separated filename component',
                'files': len(file_names), 'writers': len(writers), 'stats': stats,
                'excluded_litkey': len(excluded), 'dyslist_included': len(dys_rows), 'dyslist_excluded': len(dys_excluded),
                'excluded_litkey_reasons': dict(collections.Counter(r['reason'] for r in excluded)),
                'lexicon': {'source': 'all valid target wordforms from train writers ONLY, including unchanged original words',
                            'size': len(lexicon), 'cap': 20000, 'ordering': 'descending train token frequency, lexical ties',
                            'test_gold_added': False},
                'mini': {'selection': 'ascending SHA256(seed + NUL + occurrence ID), before model evaluation',
                         'test_errors': 200, 'test_controls': 200, 'external_dyslist': 100},
                'scope': 'Single-word candidate feasibility; not sentence/grammar correction; original case preserved',
                'licenses': {'litkey': 'Original corpus distributed CC BY-SA 4.0; mirror has no repository LICENSE. Attribution required; local experiment only.',
                             'litkey_source': 'https://www.linguistics.rub.de/litkeycorpus/access.html',
                             'litkey_citation': 'Laarmann-Quante, Ortmann, Ehlert, Masloch, Scholz, Belke & Dipper (2019). The Litkey Corpus: A richly annotated longitudinal corpus of German texts written by primary school children. Behavior Research Methods. DOI 10.3758/s13428-019-01261-x.',
                             'dyslist': 'MIT per pinned repository LICENSE; cite DOI 10.5281/zenodo.809801',
                             'dyslist_citation': 'Rauschenberger, Rello, Fuechse & Thomaschewski (2016). A Language Resource of German Errors Written by Children with Dyslexia. LREC 2016.'},
                'limitations': ['Common stories create lexical overlap across different children.',
                               'Writer split does not imply novel spelling-pair split; train_seen_pair and novel-pairs outputs expose this.',
                               'Story-character names Lea/Lars/Dodo excluded; other proper names may remain.',
                               'Word-boundary, punctuation, ambiguous annotation and illegible words excluded without repair.',
                               'DysList has no writer IDs or sentence context; external does not mean zero overlap with training pairs.',
                               'Target lexicon from train is domain-limited and is not an independent broad German dictionary.']}
    (output / 'README.md').write_text(DATA_README, encoding='utf-8')
    manifest['output_sha256'] = {name: digest((output / name).read_bytes()) for name in DATA_OUTPUTS}
    manifest['prepared_contract'] = {'train.tsv': 'headerless original TAB target TAB occurrence count; unique train error pairs only',
                                     'dictionary.tsv': 'headerless word TAB prior; prior=count/sum(train target counts), no smoothing',
                                     'inputs.tsv': 'headerless id TAB original input; no target or hint columns',
                                     'mini.jsonl': 'id,input,target,writer,file,line,role(error/control/external),train_seen_pair,target_in_lexicon,split',
                                     'dictionary_prior_sum': sum(frequencies[w] / total_frequency for w in lexicon),
                                     'unique_training_pairs': len(pair_counts)}
    manifest['prepared_sha256'] = {name: digest((prepared / name).read_bytes()) for name in PREPARED_OUTPUTS}
    write_json(output / 'manifest.json', manifest)
    write_json(prepared / 'data-manifest.json', manifest)
    print(json.dumps({'stats': stats, 'lexicon': len(lexicon), 'dyslist': len(dys_rows), 'mini': len(mini)}, ensure_ascii=False))
    return manifest


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=DEFAULT)
    parser.add_argument('--offline', action='store_true')
    args = parser.parse_args()
    prepare(args.output, not args.offline)
