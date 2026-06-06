"""German sparse encoder (Spec A) — the value core of the hybrid retrieval.

A symmetric encoder: the *identical* transform is applied to documents and to
queries. IDF / document-frequency weighting is deliberately NOT applied here —
Qdrant applies it at search time. Baking it in would break the symmetry and
double-count.

Why a hand-written encoder rather than a stock BM25 function: stock BM25 is
English-centric and would discard the two things that carry German retrieval
signal — Snowball stemming and Fugenelement compound splitting. Dropping those
is the exact "English sparse model on a German corpus" mistake we avoid.

Pipeline (per :meth:`GermanSparseEncoder.tokenize`):
  1. lowercase
  2. ``\\b\\w+\\b`` word tokens
  3. drop German+English stopwords (set built once in ``__init__``)
  4. Snowball-German-stem each surviving token; if the *original* token is a
     compound, also emit the Snowball stems of its two constituent parts
  5. count term frequencies, BM25-saturate, hash each stem to a uint32 index,
     sum on collision, return indices+values sorted ascending.

All algorithm constants come from :mod:`foerder.config` so ingest and query can
never drift.
"""

from __future__ import annotations

import hashlib
import re
from collections import Counter
from dataclasses import dataclass, field
from typing import Final

import snowballstemmer
from stop_words import get_stop_words

from foerder.config import (
    BM25_K1,
    FUGEN_ELEMENTS,
    MIN_COMPOUND_LENGTH,
    MIN_PART_LENGTH,
    SNOWBALL_LANGUAGE,
)

_WORD_RE: Final = re.compile(r"\b\w+\b")
_UINT32: Final = 2**32


@dataclass
class SparseVec:
    """A sparse vector as parallel index/value lists, sorted by index ascending."""

    indices: list[int] = field(default_factory=list)
    values: list[float] = field(default_factory=list)


def _bm25_saturate(tf: float) -> float:
    """BM25 term-frequency saturation: sublinear, asymptotic to ``K1 + 1``."""
    return (tf * (BM25_K1 + 1.0)) / (tf + BM25_K1)


def _token_to_index(token: str) -> int:
    """Hash a stem to a stable uint32 index (first 32 bits of its MD5 digest)."""
    return int(hashlib.md5(token.encode("utf-8")).hexdigest()[:8], 16)


class GermanSparseEncoder:
    """Symmetric German sparse encoder (documents and queries use this same call)."""

    def __init__(self) -> None:
        # Built once: stopword set (German ∪ English) and the Snowball stemmer.
        self._stopwords: frozenset[str] = frozenset(
            get_stop_words("german") + get_stop_words("english")
        )
        self._stemmer = snowballstemmer.stemmer(SNOWBALL_LANGUAGE)

    def split_compound(self, word: str) -> list[str]:
        """Split a German compound at its most balanced Fugenelement boundary.

        Returns ``[left, right]`` (both parts ≥ ``MIN_PART_LENGTH`` chars) for the
        split whose two parts are closest to equal length, or ``[]`` if the word
        is too short or no valid fugen split exists. Operates on the *original*
        (pre-stem) token.
        """
        if len(word) < MIN_COMPOUND_LENGTH:
            return []

        best: tuple[str, str] | None = None
        best_balance = 0.0
        for i in range(MIN_PART_LENGTH, len(word) - MIN_PART_LENGTH + 1):
            for fugen in FUGEN_ELEMENTS:
                end = i + len(fugen)
                if word[i:end] != fugen:
                    continue
                left, right = word[:i], word[end:]
                if len(left) < MIN_PART_LENGTH or len(right) < MIN_PART_LENGTH:
                    continue
                balance = min(len(left), len(right)) / max(len(left), len(right))
                if balance > best_balance:
                    best_balance = balance
                    best = (left, right)

        return list(best) if best is not None else []

    def tokenize(self, text: str) -> list[str]:
        """Return the stem list (with duplicates) for term-frequency counting."""
        raw_tokens = [
            tok for tok in _WORD_RE.findall(text.lower()) if tok not in self._stopwords
        ]
        stems = self._stemmer.stemWords(raw_tokens)

        expanded: list[str] = []
        for original, stem in zip(raw_tokens, stems, strict=True):
            expanded.append(stem)
            parts = self.split_compound(original)
            if parts:
                expanded.extend(self._stemmer.stemWords(parts))
        return expanded

    def encode(self, text: str) -> SparseVec:
        """Encode text into a BM25-saturated, hashed, index-sorted sparse vector."""
        counts = Counter(self.tokenize(text))

        merged: dict[int, float] = {}
        for token, tf in counts.items():
            idx = _token_to_index(token)
            merged[idx] = merged.get(idx, 0.0) + _bm25_saturate(float(tf))

        ordered = sorted(merged.items())
        return SparseVec(
            indices=[idx for idx, _ in ordered],
            values=[val for _, val in ordered],
        )
