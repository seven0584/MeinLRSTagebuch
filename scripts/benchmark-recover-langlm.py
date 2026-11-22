"""Apply the model author's answer parser offline; never invoke a model.

Primary implementation, parse_answer, inspected at the pinned author commit:
https://github.com/afchatfield/language_lm/blob/b6d6aa7df8348ba5e4c853a218a87617b5a17e74/src/langlm/train/format.py

The author first accepts a complete JSON object with a string correction.
Otherwise only a fully quoted, JSON-decodable correction string is recovered;
changes are empty and complete=False. No quote repair or text guessing occurs.
The original JSONL remains untouched. The derivative retains raw data and the
original strict error while allowing the scorer to assess recovered wording.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path

ARTIFACTS = Path(__file__).resolve().parents[1] / "tests" / "benchmark-artifacts"
CORRECTION = re.compile(r'"correction"\s*:\s*"((?:[^"\\]|\\.)*)"')
SOURCE = "https://github.com/afchatfield/language_lm/blob/b6d6aa7df8348ba5e4c853a218a87617b5a17e74/src/langlm/train/format.py"


def parse_answer(text: str) -> dict | None:
    text = text.strip()
    try:
        payload = json.loads(text)
    except json.JSONDecodeError:
        payload = None
    if isinstance(payload, dict) and isinstance(payload.get("correction"), str):
        changes = payload.get("changes")
        return {"correction": payload["correction"], "changes": changes if isinstance(changes, list) else [], "complete": True}
    found = CORRECTION.search(text)
    if found is None:
        return None
    try:
        correction = json.loads(f'"{found.group(1)}"')
    except json.JSONDecodeError:
        return None
    return {"correction": correction, "changes": [], "complete": False}


def recover_row(row: dict) -> tuple[dict, str]:
    result = dict(row)
    result["parserRecovery"] = False
    result["complete"] = isinstance(row.get("correction"), str) and not row.get("error")
    if result["complete"]:
        return result, "strictSuccess"
    raw = row.get("raw")
    content = raw.get("content") if isinstance(raw, dict) else None
    source_field = "raw.content"
    # The original benchmark runner stores failed JSON verbatim after this
    # exact diagnostic prefix instead of retaining a raw response object.
    prefix = "invalid JSON: "
    if not isinstance(content, str) and isinstance(row.get("error"), str) and row["error"].startswith(prefix):
        content = row["error"][len(prefix):]
        source_field = "error after exact literal prefix 'invalid JSON: '"
    if not isinstance(content, str):
        return result, "unrecoverable"
    result["rawContent"] = content
    result["parserSource"] = source_field
    parsed = parse_answer(content)
    if parsed is None:
        return result, "unrecoverable"
    result.update(parsed)
    result["parserRecovery"] = True
    result["originalError"] = row.get("error")
    result.pop("error", None)
    return result, "recovered"


def self_test() -> None:
    broken_tail = '{"correction": "Er sagt \\"ja\\" .", "changes\u201d: []}'
    parsed = parse_answer(broken_tail)
    assert parsed == {"correction": 'Er sagt "ja" .', "changes": [], "complete": False}
    assert parse_answer('{"correction": "nicht geschlossen') is None
    assert parse_answer('{"correction": "ungueltig\\q"}') is None
    assert parse_answer('{"correction": "Gut .", "changes": []}')["complete"] is True
    original = {"id": "S01", "correction": None, "error": "invalid JSON", "raw": {"content": broken_tail}}
    recovered, status = recover_row(original)
    assert status == "recovered" and recovered["parserRecovery"] and not recovered["complete"]
    assert recovered["originalError"] == "invalid JSON" and recovered["raw"] == original["raw"]
    assert original["correction"] is None and original["error"] == "invalid JSON"
    runner_row = {"id": "S35", "input": "Beispiel", "error": "invalid JSON: " + broken_tail, "elapsedMs": 12}
    recovered, status = recover_row(runner_row)
    assert status == "recovered" and recovered["correction"] == 'Er sagt "ja" .'
    assert recovered["rawContent"] == broken_tail and recovered["originalError"] == runner_row["error"]
    assert recovered["parserSource"] == "error after exact literal prefix 'invalid JSON: '"
    assert "correction" not in runner_row and "rawContent" not in runner_row


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, default=ARTIFACTS / "langlm.jsonl")
    parser.add_argument("--output", type=Path, default=ARTIFACTS / "langlm-recovered.jsonl")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    self_test()
    if args.self_test:
        print("Author-parser recovery checks passed; no corpus or model accessed.")
        return
    before = args.input.read_bytes()
    rows = [json.loads(line) for line in before.decode("utf-8").splitlines() if line.strip()]
    expected_ids = {f"S{i:02d}" for i in range(1, 61)} | {f"K{i:02d}" for i in range(1, 20)}
    if len(rows) != 79 or {row.get("id") for row in rows} != expected_ids:
        raise ValueError("Recovery requires the complete original 79-item run.")
    counts = {"strictSuccess": 0, "recovered": 0, "unrecoverable": 0}
    recovered_rows, outcomes = [], []
    for row in rows:
        recovered, status = recover_row(row)
        counts[status] += 1
        recovered_rows.append(recovered)
        if status != "strictSuccess":
            outcomes.append({"id": row["id"], "status": status, "complete": recovered["complete"], "parserSource": recovered.get("parserSource"), "originalError": row.get("error")})
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text("".join(json.dumps(row, ensure_ascii=False) + "\n" for row in recovered_rows), encoding="utf-8")
    if args.input.read_bytes() != before:
        raise RuntimeError("The original results changed during recovery; repeat once the run is settled.")
    report = {"source": SOURCE, "original_sha256": hashlib.sha256(before).hexdigest(), "items": len(rows), **counts, "outcomes": outcomes}
    args.output.with_name("langlm-recovery-report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"items": len(rows), **counts}))


if __name__ == "__main__":
    main()
