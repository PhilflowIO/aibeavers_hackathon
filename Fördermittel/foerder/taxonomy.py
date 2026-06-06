"""Taxonomy normalization + canonical-display contract (Spec B).

Raw taxonomy values (funding_type, funding_area, ...) arrive in many surface
forms that mean the same thing: "Schleswig-Holstein", "Schleswig Holstein",
"schleswig_holstein". We collapse them to a stable *key* via :func:`normalize_key`
and, across all rows of a column, build a *contract* that maps each key to the
nicest human-readable display alias seen for it.

Ingest builds one contract per taxonomy column over ALL rows, then per program
emits both the canonical display list and the keys list. Query-time filters must
go through the SAME :func:`normalize_key` / :func:`to_keys` so they hit the keys
stored in the payload.
"""

from __future__ import annotations

import re
import unicodedata
from collections.abc import Iterable

from foerder.config import (
    INVALID_TAXONOMY_VALUES,
    MIN_TAXONOMY_KEY_LENGTH,
    UMLAUT_MAP,
)

_SEPARATOR_RE = re.compile(r"[\s\-&/]+")
_NON_WORD_RE = re.compile(r"[^\w]")


def normalize_key(value: str | None) -> str:
    """Collapse a raw taxonomy value to a stable, comparable key.

    "Förderung & Entwicklung" -> "foerderung_entwicklung"
    "Schleswig-Holstein"      -> "schleswig_holstein"
    """
    if value is None:
        return ""
    text = value.strip().lower()
    for umlaut, replacement in UMLAUT_MAP.items():
        text = text.replace(umlaut, replacement)
    text = unicodedata.normalize("NFKD", text)
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = _SEPARATOR_RE.sub("_", text)
    text = _NON_WORD_RE.sub("", text)
    return text.strip("_")


def is_invalid_taxonomy_value(value: str | None, key: str) -> bool:
    """True if the (value, key) pair should be dropped from the taxonomy."""
    if key == "":
        return True
    if value is not None and value.lower() in INVALID_TAXONOMY_VALUES:
        return True
    return len(key) < MIN_TAXONOMY_KEY_LENGTH


def score_display(value: str | None) -> int:
    """Score how good a raw value is as a human-readable display alias.

    Higher is better: prefer Mixed Case with spaces over lowercase_underscore.
    """
    if value is None:
        return -1
    score = 0
    if any(ch.isupper() for ch in value):
        score += 2
    if " " in value:
        score += 2
    if "_" in value:
        score -= 1
    has_letters = any(ch.isalpha() for ch in value)
    if has_letters and value == value.lower():
        score -= 1
    return score


def to_keys(values: Iterable[str | None] | None) -> list[str]:
    """Normalize each value, drop invalid ones, dedupe preserving first-seen order."""
    if values is None:
        return []
    keys: list[str] = []
    seen: set[str] = set()
    for value in values:
        key = normalize_key(value)
        if is_invalid_taxonomy_value(value, key):
            continue
        if key not in seen:
            seen.add(key)
            keys.append(key)
    return keys


def build_contract(raw_values: Iterable[str | None]) -> dict[str, str]:
    """Group raw values by key; per key pick the display value with max score.

    Returns ``{key: canonical_display}``. Ties keep the first-seen value.
    """
    best: dict[str, tuple[int, str]] = {}
    for value in raw_values:
        key = normalize_key(value)
        if is_invalid_taxonomy_value(value, key):
            continue
        display = value if value is not None else ""
        score = score_display(value)
        current = best.get(key)
        if current is None or score > current[0]:
            best[key] = (score, display)
    return {key: display for key, (_, display) in best.items()}


def to_display(
    values: Iterable[str | None] | None, contract: dict[str, str]
) -> list[str]:
    """Map each value's key to its canonical display, dedupe preserving order.

    Falls back to the original value if the key is missing from the contract.
    """
    if values is None:
        return []
    displays: list[str] = []
    seen: set[str] = set()
    for value in values:
        key = normalize_key(value)
        if is_invalid_taxonomy_value(value, key):
            continue
        display = contract.get(key, value if value is not None else "")
        if display not in seen:
            seen.add(display)
            displays.append(display)
    return displays


def canonicalize(
    values: Iterable[str | None] | None, contract: dict[str, str]
) -> tuple[list[str], list[str]]:
    """Convenience: return ``(displays, keys)`` for one program's values."""
    materialized = list(values) if values is not None else []
    return to_display(materialized, contract), to_keys(materialized)
