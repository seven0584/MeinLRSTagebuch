"""Reproducible word-candidate evaluation; scores are not probabilities.

The baseline reads only evaluation ID/input and the training-derived dictionary.
Gold target words are used exclusively by evaluate(), never by baseline().
"""
import argparse
import collections
import hashlib
import json
import math
from pathlib import Path
import time

ROOT = Path(__file__).resolve().parents[1]
DEFAULT = ROOT / 'tests/benchmark-artifacts/brillmoore/prepared'


def read_jsonl(path):
    rows = []
    for n, line in enumerate(path.read_text(encoding='utf-8-sig').splitlines(), 1):
        if line.strip():
            row = json.loads(line)
            if not isinstance(row, dict):
                raise ValueError(f'{path}:{n}: expected object')
            rows.append(row)
    return rows


def unique(rows, label):
    result = {}
    for row in rows:
        if row['id'] in result:
            raise ValueError(f'Duplicate ID in {label}: {row["id"]}')
        result[row['id']] = row
    return result


def dictionary(path):
    result = {}
    for n, line in enumerate(path.read_text(encoding='utf-8-sig').splitlines(), 1):
        if not line.strip():
            continue
        word, prior = line.split('\t')
        if n == 1 and word.lower() == 'word' and prior.lower() == 'prior':
            continue
        if word in result:
            raise ValueError(f'Duplicate dictionary word: {word}')
        value = float(prior)
        if not math.isfinite(value) or value < 0:
            raise ValueError(f'Invalid prior: {word}')
        result[word] = value
    if not result:
        raise ValueError('Empty dictionary')
    return result


def levenshtein(a, b):
    if len(a) > len(b):
        a, b = b, a
    previous = list(range(len(a) + 1))
    for j, bc in enumerate(b, 1):
        current = [j]
        for i, ac in enumerate(a, 1):
            current.append(min(previous[i] + 1, current[-1] + 1,
                               previous[i - 1] + (ac != bc)))
        previous = current
    return previous[-1]


def baseline(inputs, lexicon, output):
    # Memoization changes runtime only, not ranking. No target field is consulted.
    cache = {}
    words = sorted(lexicon, key=lambda w: (-lexicon[w], w))
    with output.open('w', encoding='utf-8') as stream:
        for row in inputs:
            start = time.perf_counter()
            original = row['input']
            cached = original in cache
            if not cached:
                best = []
                for word in words:
                    # A length difference is a lower bound on edit distance.
                    if len(best) == 10 and abs(len(word) - len(original)) > best[-1][0]:
                        continue
                    distance = levenshtein(original, word)
                    best.append((distance, -lexicon[word], word))
                    best.sort()
                    del best[10:]
                cache[original] = [{'word': word, 'cost': cost} for cost, _, word in best]
            result = {'id': row['id'], 'input': original, 'candidates': cache[original],
                      'elapsedMs': (time.perf_counter() - start) * 1000,
                      'cached': cached, 'engine': 'levenshtein-train-frequency'}
            stream.write(json.dumps(result, ensure_ascii=False, allow_nan=False) + '\n')
    return output


def validate(prepared, gold):
    unique(gold, 'mini')
    evidence = {'duplicate_mini_ids': False, 'writer_overlap': {}, 'hashes_checked': 0,
                'writer_validation': 'not available'}
    source_dir = prepared if (prepared / 'train.jsonl').exists() else prepared.parent
    memberships = {}
    for split in ('train', 'dev', 'test'):
        path = source_dir / f'{split}.jsonl'
        if path.exists():
            rows = read_jsonl(path)
            unique(rows, split)
            memberships[split] = {r['writer'] for r in rows if r.get('writer') is not None}
    for a, b in (('train', 'dev'), ('train', 'test'), ('dev', 'test')):
        if a in memberships and b in memberships:
            shared = sorted(memberships[a] & memberships[b])
            evidence['writer_overlap'][f'{a}/{b}'] = shared
            if shared:
                raise ValueError(f'Writer leakage {a}/{b}: {shared}')
    if len(memberships) == 3:
        evidence['writer_validation'] = 'train/dev/test writer sets disjoint'
        train = unique(read_jsonl(source_dir / 'train.jsonl'), 'train')
        overlap = set(train) & {r['id'] for r in gold}
        if overlap:
            raise ValueError(f'Train/evaluation ID overlap: {sorted(overlap)[:5]}')
        pairs = {(r['input'], r['target']) for r in train.values() if r['input'] != r['target']}
        for item in gold:
            if 'train_seen_pair' in item and item['train_seen_pair'] != ((item['input'], item['target']) in pairs):
                raise ValueError(f'Incorrect train_seen_pair: {item["id"]}')
        evidence['train_pair_flags_verified'] = True
    manifest = prepared / 'data-manifest.json'
    if not manifest.exists():
        manifest = prepared / 'manifest.json'
    if manifest.exists():
        data = json.loads(manifest.read_text(encoding='utf-8'))
        for base, field in ((source_dir, 'output_sha256'), (prepared, 'prepared_sha256')):
            for name, expected in data.get(field, {}).items():
                path = base / name
                if not path.exists():
                    raise ValueError(f'Manifest file missing: {path}')
                actual = hashlib.sha256(path.read_bytes()).hexdigest()
                if actual != expected:
                    raise ValueError(f'Manifest hash mismatch: {name}')
                evidence['hashes_checked'] += 1
    return evidence


def candidates(row):
    if not row or row.get('error'):
        return [], []
    valid, invalid = [], []
    for c in row.get('candidates', []):
        try:
            cost = float(c['cost'])
            if not isinstance(c['word'], str) or not math.isfinite(cost):
                raise ValueError()
            valid.append(c['word'])
        except (KeyError, TypeError, ValueError):
            invalid.append(c)
    return valid, invalid


def group_score(gold, results, lexicon):
    out = {'n': len(gold), 'missing': 0, 'errors': 0, 'empty_candidates': 0,
           'invalid_candidates': 0, 'invalid_candidate_rows': 0,
           'unavailable_dictionary_scores': 0, 'rows_with_unavailable_dictionary_scores': 0,
           'target_in_lexicon': 0, 'target_in_lexicon_lowercase': 0,
           'conservative_policy': {'exact_hits': 0, 'lowercase_hits': 0,
                                   'denominator': len(gold), 'changes': 0, 'no_choice': 0},
           'topk': {}, 'controls': {'n': 0, 'raw_top1_changes': 0,
                                  'conservative_policy_changes': 0, 'missing_top1': 0}}
    lowerlex = {w.lower() for w in lexicon}
    timings = []
    for mode in ('exact', 'lowercase'):
        out['topk'][mode] = {str(k): {'hits': 0, 'denominator': len(gold),
                                     'hits_when_target_in_lexicon': 0,
                                     'target_in_lexicon_denominator': 0} for k in (1, 3, 10)}
    for item in gold:
        row = results.get(item['id'])
        if row is None:
            out['missing'] += 1
        elif row.get('error'):
            out['errors'] += 1
        elif row.get('input') != item['input']:
            raise ValueError(f'Input mismatch: {item["id"]}')
        words, invalid = candidates(row)
        unavailable = row.get('unavailableCount', 0) if row else 0
        out['unavailable_dictionary_scores'] += unavailable
        out['rows_with_unavailable_dictionary_scores'] += bool(unavailable)
        out['invalid_candidates'] += len(invalid)
        out['invalid_candidate_rows'] += bool(invalid)
        if row and not row.get('error') and not words:
            out['empty_candidates'] += 1
        elapsed = row.get('elapsedMs') if row else None
        if isinstance(elapsed, (float, int)) and math.isfinite(elapsed):
            timings.append(elapsed)
        exact_covered = item['target'] in lexicon
        lower_covered = item['target'].lower() in lowerlex
        out['target_in_lexicon'] += exact_covered
        out['target_in_lexicon_lowercase'] += lower_covered
        chosen = item['input'] if item['input'] in lexicon else words[0] if words else None
        policy = out['conservative_policy']
        policy['exact_hits'] += chosen == item['target']
        policy['lowercase_hits'] += chosen is not None and chosen.lower() == item['target'].lower()
        policy['changes'] += chosen is not None and chosen != item['input']
        policy['no_choice'] += chosen is None
        for mode in ('exact', 'lowercase'):
            target = item['target'] if mode == 'exact' else item['target'].lower()
            ranked = words if mode == 'exact' else [w.lower() for w in words]
            covered = exact_covered if mode == 'exact' else lower_covered
            for k in (1, 3, 10):
                metric = out['topk'][mode][str(k)]
                hit = target in ranked[:k]
                metric['hits'] += hit
                metric['target_in_lexicon_denominator'] += covered
                metric['hits_when_target_in_lexicon'] += hit and covered
        if item['input'] == item['target']:
            ctl = out['controls']
            ctl['n'] += 1
            if not words:
                ctl['missing_top1'] += 1
            else:
                ctl['raw_top1_changes'] += words[0] != item['input']
                chosen = item['input'] if item['input'] in lexicon else words[0]
                ctl['conservative_policy_changes'] += chosen != item['input']
    out['mean_elapsed_ms'] = sum(timings) / len(timings) if timings else None
    out['timing_rows'] = len(timings)
    return out


def evaluate(gold, results, lexicon):
    results = unique(results, 'results')
    extras = sorted(set(results) - {r['id'] for r in gold})
    subsets = {'all': gold,
               'litkey_errors': [r for r in gold if r.get('split') != 'external' and r.get('role') == 'error'],
               'litkey_controls': [r for r in gold if r.get('split') != 'external' and r.get('role') == 'control'],
               'external': [r for r in gold if r.get('split') == 'external' or r.get('role') == 'external'],
               'novel_errors': [r for r in gold if r['input'] != r['target'] and r.get('train_seen_pair') is False],
               'litkey_novel_errors': [r for r in gold if r.get('split') != 'external' and r.get('role') == 'error' and r.get('train_seen_pair') is False],
               'litkey_case_only_errors': [r for r in gold if r.get('split') != 'external' and r.get('role') == 'error' and r['input'].lower() == r['target'].lower()],
               'litkey_non_case_errors': [r for r in gold if r.get('split') != 'external' and r.get('role') == 'error' and r['input'].lower() != r['target'].lower()],
               'litkey_novel_non_case_errors': [r for r in gold if r.get('split') != 'external' and r.get('role') == 'error' and r.get('train_seen_pair') is False and r['input'].lower() != r['target'].lower()],
               'external_novel_errors': [r for r in gold if (r.get('split') == 'external' or r.get('role') == 'external') and r['input'] != r['target'] and r.get('train_seen_pair') is False]}
    report = {'groups': {name: group_score(rows, results, lexicon) for name, rows in subsets.items()},
              'unexpected_result_ids': extras, 'examples': {'top1_success': [], 'top10_only': [], 'miss': [], 'changed_control': []}}
    for item in gold:
        words, _ = candidates(results.get(item['id']))
        if item['input'] == item['target']:
            kind = 'changed_control' if words and words[0] != item['input'] else None
        else:
            kind = 'top1_success' if words and words[0] == item['target'] else 'top10_only' if item['target'] in words[:10] else 'miss'
        if kind and (kind == 'changed_control' or len(report['examples'][kind]) < 8):
            report['examples'][kind].append({**item, 'top3': words[:3]})
    return report


def markdown(report):
    lines = ['# Brill/Moore: begrenzter Wortkandidaten-Versuch', '',
             'Bewertungspunkte sind keine kalibrierten Wahrscheinlichkeiten. Keine Satzkorrektur oder Freigabe für unbegleitete Nutzung.', '',
             'Top-k: Zielwort unter den ersten k gültigen Kandidaten. Fehlende/fehlerhafte Antworten zählen im Nenner als Misserfolg. Groß-/Kleinschreibung wird separat ausgewertet. Ohne Beachtung der Großschreibung erfolgt keine neue Sortierung.', '',
             'Die konservative Kontroll-Policy behält ein exakt im Lexikon vorhandenes Eingabewort, ansonsten nimmt sie den besten Kandidaten. Das ist keine nachgewiesene Sicherheitsentscheidung: gültige Wörter können im Kontext falsch sein. Eine Rohkandidaten-Änderung ist kein gemessener Fehlalarm einer Fehlererkennung; eine solche Erkennung wird hier nicht getestet.', '',
             '## Datenprüfung', '', '```json', json.dumps(report['validation'], ensure_ascii=False, indent=2), '```', '',
             '## Ergebnisse', '']
    def frac(a, b):
        return f'{a}/{b} ({100*a/b:.1f}%)' if b else '—'
    for engine, result in report['engines'].items():
        lines.extend([f'### {engine}', '', '| Verfahren / Teilmenge | n | Lexikon exakt | Top1 exakt | Top3 exakt | Top10 exakt | Top1 klein | Top10 exakt bei Ziel im Lexikon | Fehlend / Fehler / ungültige Kandidaten |',
                      '|---|---:|---:|---:|---:|---:|---:|---:|---:|'])
        for group, score in result['groups'].items():
            n = score['n']
            exact = score['topk']['exact']
            cond = exact['10']
            lines.append('| ' + ' | '.join([f'{engine} / {group}', str(n), frac(score['target_in_lexicon'], n),
                *[frac(exact[str(k)]['hits'], n) for k in (1, 3, 10)],
                frac(score['topk']['lowercase']['1']['hits'], n),
                frac(cond['hits_when_target_in_lexicon'], cond['target_in_lexicon_denominator']),
                f'{score["missing"]} / {score["errors"]} / {score["invalid_candidates"]}']) + ' |')
        all_score = result['groups']['all']
        lines.extend(['', f'Nicht verfügbare Wörterbuch-Kandidatenscores (z. B. unendliche Transformationskosten): {all_score["unavailable_dictionary_scores"]} über {all_score["rows_with_unavailable_dictionary_scores"]} Eingaben. Diese Kandidaten wurden nicht künstlich in Top10 aufgenommen.'])
        lines.extend(['', '#### Unveränderte Policy: Nutzen und Verlust', '',
                      'Vorab definierte Policy „exakt im Lexikon → beibehalten, sonst Top1“. Echte Realwortfehler wie das → dass können damit bestehen bleiben. Keine Fehlererkennung und keine nachträgliche Sicherheitsgrenze.', '',
                      '| Teilmenge | n | Roh-Top1 richtig | Policy richtig | Policy Änderungen | Policy ohne Wahl |', '|---|---:|---:|---:|---:|---:|'])
        for group in ('litkey_errors', 'litkey_novel_errors', 'litkey_controls', 'external', 'external_novel_errors'):
            score = result['groups'][group]
            policy = score['conservative_policy']
            lines.append(f'| {group} | {score["n"]} | {frac(score["topk"]["exact"]["1"]["hits"], score["n"])} | {frac(policy["exact_hits"], score["n"])} | {policy["changes"]} | {policy["no_choice"]} |')
        lines.extend(['', f'### {engine}: korrekte Kontrollwörter', '', '| Teilmenge | Kontrollen | Top1 verändert | Policy verändert | Ohne Top1 |', '|---|---:|---:|---:|---:|'])
        for group in ('litkey_controls', 'external'):
            c = result['groups'][group]['controls']
            lines.append(f'| {group} | {c["n"]} | {c["raw_top1_changes"]} | {c["conservative_policy_changes"]} | {c["missing_top1"]} |')
        lines += ['', '### Beispiele', '', 'Erste bis zu acht Fälle je Kategorie in der vorab festgelegten Korpusreihenfolge; sämtliche veränderten Kontrollwörter werden aufgeführt. Keine nachträgliche Auswahl der besten Beispiele.', '', '| Kategorie | ID | Eingabe | Ziel | Top3 |', '|---|---|---|---|---|']
        for kind, rows in result['examples'].items():
            for row in rows:
                cells = [kind, row['id'], row['input'], row['target'], ', '.join(row['top3'])]
                lines.append('| ' + ' | '.join(str(c).replace('|', '\\|').replace('\n', ' ') for c in cells) + ' |')
        lines.append('')
    lines += ['## Grenzen', '',
              '- Das Ziellexikon stammt ausschließlich aus Trainingskindern und ist domänenbegrenzt; kein umfassendes deutsches Wörterbuch.',
              '- Schreibertrennung verhindert keine gemeinsamen Wörter, Geschichten oder bekannten Fehlerpaare. Novel-pair-Ergebnisse werden separat ausgewiesen.',
              '- DysList ist extern, aber ohne Schreibertrennung und ohne garantierte Fehlerpaar-Neuheit.',
              '- Keine Aussage über Satzkontext, Fehlererkennung in freien Texten oder pädagogisch richtige Erklärungen.',
              '- Ergebnisse werden je Wortvorkommen gezählt. Top-k ist Kandidatenabdeckung, nicht Präzision angebotener Korrekturen.',
              '- Laufzeiten können durch Cache, Java-Aufwärmung und Systemlast beeinflusst sein; keine belastbare Geschwindigkeitsrangliste.', '']
    return '\n'.join(lines)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--prepared', type=Path, default=DEFAULT)
    parser.add_argument('--baseline', action='store_true', help='Generate fixed edit-distance baseline from input fields only')
    parser.add_argument('--baseline-output', type=Path, help='Baseline JSONL path, default prepared/levenshtein-results.jsonl')
    parser.add_argument('--results', type=Path, nargs='*', default=[])
    parser.add_argument('--output', type=Path, help='Output prefix, defaults to prepared/comparison')
    args = parser.parse_args()
    prepared = args.prepared
    gold = read_jsonl(prepared / 'mini.jsonl')
    validation = validate(prepared, gold)
    lexpath = prepared / 'dictionary.tsv'
    if not lexpath.exists():
        lexpath = prepared / 'lexicon-frequency.tsv'
    lexicon = dictionary(lexpath)
    paths = list(args.results)
    if args.baseline:
        target = args.baseline_output or prepared / 'levenshtein-results.jsonl'
        inputs = [{'id': r['id'], 'input': r['input']} for r in gold]
        baseline(inputs, lexicon, target)
        if target not in paths:
            paths.append(target)
    if not paths:
        parser.error('Specify --baseline and/or --results PATH...')
    report = {'version': 1, 'validation': validation, 'lexicon_size': len(lexicon),
              'baseline_ranking': 'Levenshtein(input,word) ascending, train prior descending, Unicode lexical ascending; case-sensitive; top10',
              'policy': 'Exact input in lexicon: preserve; otherwise top1; no tuned threshold, no calibrated probability',
              'engines': {}}
    for path in paths:
        name = path.stem
        if name in report['engines']:
            raise ValueError(f'Duplicate engine stem: {name}')
        report['engines'][name] = evaluate(gold, read_jsonl(path), lexicon)
        report['engines'][name]['path'] = str(path)
    output = args.output or prepared / 'comparison'
    output.with_suffix('.json').write_text(json.dumps(report, ensure_ascii=False, indent=2, allow_nan=False) + '\n', encoding='utf-8')
    output.with_suffix('.md').write_text(markdown(report), encoding='utf-8')
    print(json.dumps({'output': str(output), 'engines': list(report['engines']), 'n': len(gold)}, ensure_ascii=False))


if __name__ == '__main__':
    main()
