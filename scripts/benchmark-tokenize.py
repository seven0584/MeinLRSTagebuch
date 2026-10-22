"""Prepare langlm's documented spaCy input format; never call a model.

Primary sources, inspected at b6d6aa7df8348ba5e4c853a218a87617b5a17e74:
https://github.com/afchatfield/language_lm/blob/b6d6aa7df8348ba5e4c853a218a87617b5a17e74/src/langlm/eval/errant_core/__init__.py
https://github.com/afchatfield/language_lm/blob/b6d6aa7df8348ba5e4c853a218a87617b5a17e74/scripts/correct.py
https://github.com/afchatfield/language_lm/blob/b6d6aa7df8348ba5e4c853a218a87617b5a17e74/environment.yml

The trained prompt is plain completion, not a chat template:
Correct the German sentence, then list what changed.\n\nInput: {source}\nOutput:

Reproduce from the repository root in PowerShell, without a system pip install:
    py -3.11 -m venv tests/benchmark-artifacts/runtime/pyenv
    & ./tests/benchmark-artifacts/runtime/pyenv/Scripts/python.exe -m pip install -r scripts/benchmark-tokenizer-requirements.txt
    & ./tests/benchmark-artifacts/runtime/pyenv/Scripts/python.exe scripts/benchmark-tokenize.py

No fallback: a regex tokenizer is not the documented spaCy tokenizer. Only
spacing changes here; original text, punctuation, case, Unicode and typos
remain unchanged at the character level after removing whitespace.
"""

from __future__ import annotations

import argparse
import importlib.metadata
import json
import platform
import re
from functools import cache
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ARTIFACTS = ROOT / "tests" / "benchmark-artifacts"
MODEL = "de_core_news_sm"
MODEL_VERSION = "3.8.0"
AUTHOR_COMMIT = "b6d6aa7df8348ba5e4c853a218a87617b5a17e74"


@cache
def tokenizer():
    try:
        import spacy
    except ImportError as error:
        raise RuntimeError("Use the isolated benchmark Python environment with spaCy>=3.8,<4 installed.") from error
    version = tuple(map(int, spacy.__version__.split(".")[:2]))
    if not (3, 8) <= version < (4, 0):
        raise RuntimeError("The author requires spaCy>=3.8,<4.")
    if importlib.metadata.version(MODEL) != MODEL_VERSION:
        raise RuntimeError(f"Expected official {MODEL}-{MODEL_VERSION}.")
    # The author invokes nlp.tokenizer only. Excluding annotators saves memory;
    # the model's tokenizer and its exceptions are loaded without alteration.
    nlp = spacy.load(MODEL, exclude=["tok2vec", "tagger", "morphologizer", "parser", "lemmatizer", "attribute_ruler", "ner", "senter"])
    return nlp.tokenizer


def tokenize(text: str) -> str:
    if not isinstance(text, str):
        raise TypeError("Expected original plaintext, not a corpus item or gold object.")
    result = " ".join(token.text for token in tokenizer()(text) if not token.is_space)
    if "".join(result.split()) != "".join(text.split()):
        raise ValueError("Tokenization changed non-whitespace characters.")
    return result


def upstream_display(text: str) -> str:
    """Author's display-only detokenizer, solely for normalization diagnostics.

    This is NOT applied to model output before saving. Its identity-round-trip
    changes must not be credited to a language model (e.g. corpus F243).
    """
    text = re.sub(r"\s+([.,;:!?%\u00bb\u201c\)\]\u2026])", r"\1", text)
    text = re.sub(r"([\u00ab\u201e\(\[])\s+", r"\1", text)
    parts = text.split('"')
    result = parts[0]
    for index, part in enumerate(parts[1:], start=1):
        result = f'{result}"{part.lstrip()}' if index % 2 else f'{result.rstrip()}"{part}'
    return result.strip()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--corpus", type=Path, default=ARTIFACTS / "corpus.json")
    parser.add_argument("--output", type=Path, default=ARTIFACTS / "tokenized.json")
    args = parser.parse_args()
    corpus = json.loads(args.corpus.read_text(encoding="utf-8"))
    # Deliberately read only input strings. Gold/reference/sites/names never
    # enter tokenization or the resulting model-input map.
    items = [(item["id"], item["input"]) for item in corpus["items"] + corpus["controls"]]
    if len(items) != 79 or len({key for key, _ in items}) != 79:
        raise ValueError("Expected 60 input units plus 19 unique controls.")
    prepared = {key: tokenize(text) for key, text in items}
    normalization = [
        {"id": key, "input": text, "display_only_roundtrip": upstream_display(prepared[key])}
        for key, text in items if upstream_display(prepared[key]) != text
    ]
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(prepared, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    metadata = {
        "author_commit": AUTHOR_COMMIT,
        "python": platform.python_version(),
        "spacy": importlib.metadata.version("spacy"),
        "model": MODEL,
        "model_version": importlib.metadata.version(MODEL),
        "official_model_wheel": "https://github.com/explosion/spacy-models/releases/download/de_core_news_sm-3.8.0/de_core_news_sm-3.8.0-py3-none-any.whl",
        "requirements_file": "scripts/benchmark-tokenizer-requirements.txt",
        "setup_commands_from_repo_root": [
            "py -3.11 -m venv tests/benchmark-artifacts/runtime/pyenv",
            "tests/benchmark-artifacts/runtime/pyenv/Scripts/python.exe -m pip install -r scripts/benchmark-tokenizer-requirements.txt",
            "tests/benchmark-artifacts/runtime/pyenv/Scripts/python.exe scripts/benchmark-tokenize.py",
        ],
        "implementation": "join token.text from model nlp.tokenizer; exclude is_space",
        "items": len(items),
        "non_whitespace_characters_preserved": True,
        "normalization_only_changes": normalization,
        "warning": "Display round-trip whitespace changes, including F243/S59, are preprocessing effects, not model corrections. Model answers must be stored raw.",
    }
    info = args.output.with_name(args.output.stem + "-info.json")
    info.write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"items": len(items), "spacy": metadata["spacy"], "model": MODEL + "-" + MODEL_VERSION, "normalization_only_units": len(normalization)}))


if __name__ == "__main__":
    main()
