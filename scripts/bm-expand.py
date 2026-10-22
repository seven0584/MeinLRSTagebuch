"""Prepare a broad, gold-blind lexicon shortlist for the BM experiment.

Run with the existing isolated Python environment after installing
RapidFuzz==3.14.1 there. No system packages, application data or settings change.
The source's redistribution license is unresolved: keep all assets local.
"""
import argparse
import collections
import hashlib
import json
from pathlib import Path
import re
import shutil
import time
import urllib.request

from rapidfuzz import __version__ as rapidfuzz_version, process
from rapidfuzz.distance import Levenshtein

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'tests/benchmark-artifacts/brillmoore'
REVISION = '150c90bd6994a4b664e69afd9fb74fc152cc6b6a'
URL = ('https://raw.githubusercontent.com/catalpa-cl/'
       'spellchecker-evaluation-german-children/' + REVISION +
       '/Lexicons/hunspell_dict_de.txt')
SHA256 = '2eee2f196024b439bb02e2fad198618a415542af7438e3b6bb24276d82792f10'
WORD = re.compile(r'[A-Za-zÄÖÜäöüß]+\Z')
K = 100  # Fixed before evaluation; not selected on held-out results.


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write_json(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base', type=Path, default=BASE)
    parser.add_argument('--inputs', type=Path, help='Gold-free id TAB input TSV')
    parser.add_argument('--output', type=Path, help='Output directory, default BASE/expanded')
    parser.add_argument('--seed-results', type=Path, nargs='+', help='Previous BM result JSONL files')
    parser.add_argument('--gold', type=Path, help='Optional evaluation JSONL, opened only after retrieval')
    args = parser.parse_args()
    if rapidfuzz_version != '3.14.1':
        raise RuntimeError('Use the pinned RapidFuzz==3.14.1 in the isolated environment')
    base = args.base.resolve()
    out = args.output.resolve() if args.output else base / 'expanded'
    out.mkdir(parents=True, exist_ok=True)
    raw = base / 'expanded/raw/hunspell_dict_de.txt'
    raw.parent.mkdir(parents=True, exist_ok=True)
    if not raw.exists():
        with urllib.request.urlopen(URL, timeout=120) as response:
            raw.write_bytes(response.read())
    if sha(raw) != SHA256:
        raise RuntimeError('Pinned independent lexicon hash mismatch')
    source_lines = raw.read_text(encoding='utf-8').splitlines()
    supported = {word for word in source_lines if WORD.fullmatch(word)}
    counts = {}
    for row in (base / 'lexicon-frequency.tsv').read_text(encoding='utf-8').splitlines():
        word, count = row.split('\t')
        if word in counts or not WORD.fullmatch(word):
            raise ValueError('Invalid training lexicon')
        counts[word] = int(count)
    vocabulary = supported | set(counts)
    # extract() breaks equal-distance ties by original choice index. This order
    # fixes the tie policy using training counts, then codepoint lexical order.
    choices = sorted(vocabulary, key=lambda word: (-counts.get(word, 0), word))
    total = sum(counts.values()) + len(vocabulary)
    (out / 'dictionary.tsv').write_text(''.join(
        word + '\t' + repr((counts.get(word, 0) + 1) / total) + '\n'
        for word in sorted(vocabulary)), encoding='utf-8')
    inputs = []
    inputs_path = args.inputs.resolve() if args.inputs else base / 'prepared/inputs.tsv'
    for row in inputs_path.read_text(encoding='utf-8').splitlines():
        fields = row.split('\t')
        if len(fields) != 2:
            raise ValueError('Inputs must be id TAB input only, without gold')
        inputs.append(tuple(fields))
    if len({item_id for item_id, _ in inputs}) != len(inputs):
        raise ValueError('Duplicate input IDs')
    previous = {}
    seed_files = args.seed_results if args.seed_results else [base / 'bm-results.jsonl']
    for old in seed_files:
        if not old.exists():
            raise ValueError('Missing seed result: ' + str(old))
        for line in old.read_text(encoding='utf-8').splitlines():
            record = json.loads(line)
            previous[record['id']] = record
    shortlist, cache, times = {}, {}, []
    started = time.perf_counter()
    print(f'Vocabulary: {len(vocabulary)}; shortlist K={K}; inputs={len(inputs)}', flush=True)
    with (out / 'per-input-candidates.tsv').open('w', encoding='utf-8', newline='') as writer:
        for index, (item_id, text) in enumerate(inputs, 1):
            before = time.perf_counter()
            if text not in cache:
                ranked = process.extract(text, choices, scorer=Levenshtein.distance,
                                         processor=None, limit=K)
                cache[text] = [word for word, distance, choice_index in ranked]
            candidates = list(cache[text])
            record = previous.get(item_id)
            if record:
                if record['input'] != text:
                    raise ValueError('Previous BM input mismatch')
                candidates.extend(c['word'] for c in record['candidates'][:10]
                                  if c['word'] in vocabulary)
            if text in vocabulary:
                candidates.append(text)
            candidates = list(dict.fromkeys(candidates))
            shortlist[item_id] = candidates
            writer.write('\t'.join([item_id] + candidates) + '\n')
            times.append((time.perf_counter() - before) * 1000)
            if index == 1 or index % 50 == 0:
                print(f'Shortlists: {index}/{len(inputs)}', flush=True)
    # Only after every candidate list has been generated and persisted do we
    # open evaluation labels. Labels never enter retrieval or its tie policy.
    groups = collections.defaultdict(collections.Counter)
    golden = []
    gold_path = args.gold if args.gold else (None if args.inputs else base / 'prepared/mini.jsonl')
    for line in gold_path.read_text(encoding='utf-8').splitlines() if gold_path else []:
        record = json.loads(line)
        item_id, target = record['id'], record['target']
        if item_id not in shortlist:
            raise ValueError('Evaluation ID absent from generated lists')
        group = 'dyslist' if item_id.startswith('dyslist:') else 'litkey-' + record['role']
        groups[group]['n'] += 1
        groups[group]['target_in_expanded_lexicon'] += target in vocabulary
        groups[group]['target_in_shortlist'] += target in shortlist[item_id]
        record['target_in_original_lexicon'] = record['target_in_lexicon']
        record['target_in_lexicon'] = target in vocabulary
        record['target_in_shortlist'] = target in shortlist[item_id]
        golden.append(record)
    if golden:
        (out / 'mini.jsonl').write_text(''.join(json.dumps(r, ensure_ascii=False) + '\n'
                                                for r in golden), encoding='utf-8')
    shutil.copyfile(base / 'prepared/train.tsv', out / 'train.tsv')
    shutil.copyfile(inputs_path, out / 'inputs.tsv')
    manifest = {
        'source': {'url': URL, 'revision': REVISION, 'sha256': SHA256,
                   'bytes': raw.stat().st_size, 'lines': len(source_lines),
                   'supported_unique_wordforms': len(supported)},
        'license': {'status': 'UNRESOLVED - local research only; not cleared for redistribution',
                    'evidence': 'Pinned repository tree contains no LICENSE or Lexicons README; '
                                'filename says Hunspell but exact dictionary provenance/license is absent.',
                    'rapidfuzz': 'MIT; version 3.14.1',
                    'train_derived_priors': 'Litkey training targets only, CC BY-SA 4.0'},
        'vocabulary_size': len(vocabulary), 'training_wordforms': len(counts),
        'new_wordforms': len(vocabulary - set(counts)),
        'prior': '(training_target_count + 1) / (all_training_target_tokens + full_vocabulary_size)',
        'shortlist': {'k': K, 'distance': 'case-sensitive unit-cost Levenshtein',
                      'ties': 'descending training target count, then Unicode codepoint lexical order',
                      'union': 'old BM top 10 (if present), plus original when in broad lexicon',
                      'gold_used': False, 'hyperparameters_tuned_on_test': False},
        'input_count': len(inputs), 'unique_inputs': len(cache),
        'elapsed_ms': (time.perf_counter() - started) * 1000,
        'mean_retrieval_ms_per_occurrence': sum(times) / len(times),
        'evaluation_after_generation': {key: dict(value) for key, value in groups.items()},
        'files': {str(p.resolve()): sha(p) for p in
                  [out / 'dictionary.tsv', out / 'per-input-candidates.tsv',
                   out / 'mini.jsonl', out / 'train.tsv', out / 'inputs.tsv'] + list(seed_files)
                  if p.exists()},
    }
    write_json(out / 'manifest.json', manifest)
    print(json.dumps(manifest['evaluation_after_generation'], ensure_ascii=False), flush=True)


if __name__ == '__main__':
    main()
