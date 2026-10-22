#!/usr/bin/env python3
"""Conservative, inspectable pre-scoring; no model calls or semantic grading.

Usage: python scripts/benchmark-score.py results.jsonl [more.jsonl ...]
Ambiguous locations/alignments require manual review. Exact matches are a lower
bound: valid alternative corrections can differ from the supplied reference.
"""
import argparse
import collections
import difflib
import json
from pathlib import Path
import re
import unicodedata


def tokens(text):
    # Ignore whitespace only, preserve spelling, case, punctuation and accents.
    return re.findall(r"\w+|[^\w\s]", unicodedata.normalize("NFC", text), re.UNICODE)


def occurrences(haystack, needle):
    return [(i, i + len(needle)) for i in range(len(haystack) - len(needle) + 1)
            if needle and haystack[i:i + len(needle)] == needle]


def edits(source, target):
    return [{"op": op, "inputRange": [a, b], "outputRange": [c, d],
             "original": source[a:b], "replacement": target[c:d]}
            for op, a, b, c, d in difflib.SequenceMatcher(
                None, source, target, autojunk=False).get_opcodes() if op != "equal"]


def project(source, target, span):
    """Return replacement tokens only if every intersecting edit stays in span.

    Insertion on either boundary and replacement across a boundary are ambiguous.
    SequenceMatcher can itself have alternative alignments; repeated span text
    is rejected by the caller, and all opcodes remain in the report for audit.
    """
    start, end = span
    covered = []
    for op, a, b, c, d in difflib.SequenceMatcher(
            None, source, target, autojunk=False).get_opcodes():
        if op == "insert":
            if a in (start, end):
                return None
            if start < a < end:
                covered.extend(range(c, d))
        elif a < end and b > start:
            if op != "equal" and (a < start or b > end):
                return None
            if op == "equal":
                covered.extend(range(c + max(start, a) - a, c + min(end, b) - a))
            else:
                covered.extend(range(c, d))
    return target[min(covered):max(covered) + 1] if covered else []


def site_scores(item, output, sites, names_reference):
    source, reference = tokens(item["input"]), tokens(item["reference"])
    locations = {s["id"]: occurrences(source, tokens(s["original"])) for s in sites}
    result = []
    for site in sites:
        row = {"id": site["id"], "expectation": site.get("expectation"),
               "original": site["original"], "expected": site["expected"]}
        spans = locations[site["id"]]
        reason = None
        if tokens(site["original"]) == tokens(site["expected"]):
            reason = "Reine Leerraumänderung wird vom Tokenvergleich ignoriert; separat prüfen."
        elif site.get("expectation") == "Stilhinweis":
            reason = "Optionaler Stilhinweis; keine Pflichtkorrektur."
        elif site.get("expectation") == "Namensabgleich" and not names_reference:
            reason = "Namensreferenz wurde nicht als Modellkontext bestätigt."
        elif len(spans) != 1:
            reason = f"Originalstelle nicht eindeutig: {len(spans)} Vorkommen."
        elif any(a < spans[0][1] and b > spans[0][0]
                 for other in sites if other["id"] != site["id"]
                 for a, b in locations[other["id"]]):
            reason = "Prüfstelle überlappt mit einer weiteren Prüfstelle."
        else:
            row["inputTokenRange"] = list(spans[0])
            gold = project(source, reference, spans[0])
            actual = project(source, output, spans[0])
            expected = tokens(site["expected"])
            if gold != expected:
                reason = "Referenzalignment bestätigt die Sollstelle nicht eindeutig."
            elif actual is None:
                reason = "Ausgabeänderung überschreitet die Grenze der Prüfstelle."
            else:
                row["actualTokens"] = actual
                row["status"] = "exact_expected" if actual == expected else (
                    "unchanged" if actual == source[spans[0][0]:spans[0][1]] else "different")
        if reason:
            row.update(status="manual", reason=reason)
        result.append(row)
    return result


def load_results(path):
    rows = []
    with path.open(encoding="utf-8-sig") as handle:
        for number, line in enumerate(handle, 1):
            if line.strip():
                row = json.loads(line)
                if not isinstance(row, dict) or "id" not in row:
                    raise ValueError(f"{path}:{number}: Ergebnis ohne ID")
                rows.append(row)
    counts = collections.Counter(row["id"] for row in rows)
    duplicate = [key for key, value in counts.items() if value > 1]
    if duplicate:
        raise ValueError(f"Doppelte Ergebnis-IDs in {path}: {duplicate}")
    return {row["id"]: row for row in rows}


def score(corpus, results, names_reference=False):
    units = []
    sites_by_unit = collections.defaultdict(list)
    for site in corpus.get("sites", []):
        sites_by_unit[site["unit"]].append(site)
    for category, items in (("text", corpus["items"]), ("control", corpus["controls"])):
        for item in items:
            row = {"id": item["id"], "category": category, "input": item["input"]}
            result = results.get(item["id"])
            if not result or result.get("error") or not isinstance(result.get("correction"), str):
                row.update(status="error" if result else "missing",
                           error=result.get("error", "Keine Textausgabe") if result else "Kein Ergebnis")
            elif result.get("input", item["input"]) != item["input"]:
                row.update(status="error", error="Ergebniseingabe stimmt nicht mit dem Korpus überein")
            else:
                output = tokens(result["correction"])
                row.update(status="ok", correction=result["correction"], elapsedMs=result.get("elapsedMs"),
                           changed=output != tokens(item["input"]), edits=edits(tokens(item["input"]), output))
                if category == "text":
                    row.update(reference=item["reference"], exactReference=output == tokens(item["reference"]),
                               referenceEdits=edits(tokens(item["input"]), tokens(item["reference"])),
                               sites=site_scores(item, output, sites_by_unit[item["id"]], names_reference))
            units.append(row)
    texts = [u for u in units if u["category"] == "text" and u["status"] == "ok"]
    controls = [u for u in units if u["category"] == "control" and u["status"] == "ok"]
    timings = sorted(u["elapsedMs"] for u in units if u["status"] == "ok"
                     and isinstance(u.get("elapsedMs"), (int, float)))
    summary = {"textTotal": len(corpus["items"]), "textSuccessful": len(texts),
               "textExactReference": sum(u["exactReference"] for u in texts),
               "controlTotal": len(corpus["controls"]), "controlSuccessful": len(controls),
               "controlsChanged": sum(u["changed"] for u in controls),
               "controlChangeRate": sum(u["changed"] for u in controls) / len(controls) if controls else None,
               "statuses": dict(collections.Counter(u["status"] for u in units)),
               "sites": dict(collections.Counter(s["status"] for u in texts for s in u["sites"])),
               "sitesByExpectation": {
                   expectation: dict(collections.Counter(
                       s["status"] for u in texts for s in u["sites"]
                       if s["expectation"] == expectation))
                   for expectation in ("Korrektur", "Namensabgleich", "Stilhinweis")},
               "meanElapsedMs": sum(timings) / len(timings) if timings else None}
    return {"summary": summary, "units": units,
            "unknownResultIds": sorted(set(results) - {u["id"] for u in units})}


def markdown(reports):
    lines = ["# Automatische Vorbewertung", "",
             "Exakte Referenztreffer sind keine semantische Qualitätsbewertung. Gleichwertige Alternativen benötigen Sichtung.",
             "Tokenvergleich ignoriert Leerraum, erhält Großschreibung, Akzente und Satzzeichen. Kontrollfall-Änderungsquote ist keine Precision.",
             "Mehrdeutige oder überlappende Prüfstellen werden als `manual` ausgewiesen. Optionale Stilhinweise werden nicht als Pflichtkorrekturen gewertet.", "",
             "| Lauf | Text erfolgreich | Referenz exakt | Kontrollen geändert / geprüft | Fehler / fehlend | Ø Sekunden |",
             "|---|---:|---:|---:|---:|---:|"]
    for name, report in reports.items():
        s = report["summary"]
        elapsed = f'{s["meanElapsedMs"] / 1000:.2f}' if s["meanElapsedMs"] is not None else "–"
        lines.append(f'| {name} | {s["textSuccessful"]}/{s["textTotal"]} | {s["textExactReference"]} | '
                     f'{s["controlsChanged"]}/{s["controlSuccessful"]} | '
                     f'{s["statuses"].get("error", 0)}/{s["statuses"].get("missing", 0)} | {elapsed} |')
    for name, report in reports.items():
        lines.extend(["", f"## {name}", "", "Stellenstatus: " + json.dumps(report["summary"]["sitesByExpectation"], ensure_ascii=False), ""])
        for unit in report["units"]:
            lines.extend([f'### {unit["id"]} ({unit["category"]}, {unit["status"]})', ""])
            if unit["status"] != "ok":
                lines.extend([str(unit["error"]), ""])
                continue
            lines.extend(["Eingabe:", "", "```text", unit["input"], "```", "", "Ausgabe:", "", "```text", unit["correction"], "```", ""])
            if "reference" in unit:
                lines.extend(["Referenz:", "", "```text", unit["reference"], "```", ""])
            for edit in unit["edits"]:
                lines.append(f'- Token {edit["inputRange"]}: {json.dumps(edit["original"], ensure_ascii=False)} → {json.dumps(edit["replacement"], ensure_ascii=False)}')
            if unit.get("sites"):
                lines.extend(["", "Prüfstellen: " + "; ".join(f'{s["id"]}: {s["status"]}' for s in unit["sites"])])
            lines.append("")
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("results", nargs="+", type=Path)
    parser.add_argument("--corpus", type=Path, default=Path("tests/benchmark-artifacts/corpus.json"))
    parser.add_argument("--output", type=Path, default=Path("tests/benchmark-artifacts/comparison"))
    parser.add_argument("--names-reference", action="store_true", help="Nur wenn alle Läufe die Namensreferenz erhielten")
    args = parser.parse_args()
    corpus = json.loads(args.corpus.read_text(encoding="utf-8-sig"))
    reports = {}
    for path in args.results:
        name = path.stem
        if name in reports:
            raise ValueError(f"Doppelter Laufname: {name}")
        reports[name] = score(corpus, load_results(path), args.names_reference)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.with_suffix(".json").write_text(json.dumps({"reports": reports}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    args.output.with_suffix(".md").write_text(markdown(reports) + "\n", encoding="utf-8")
    print(args.output.with_suffix(".json"))
    print(args.output.with_suffix(".md"))


if __name__ == "__main__":
    main()
