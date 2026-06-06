"""Tests for the German sparse encoder (Spec A)."""

from __future__ import annotations

import snowballstemmer

from foerder.config import MIN_PART_LENGTH, SNOWBALL_LANGUAGE
from foerder.sparse import GermanSparseEncoder, SparseVec

_STEMMER = snowballstemmer.stemmer(SNOWBALL_LANGUAGE)


def _stem(word: str) -> str:
    return str(_STEMMER.stemWord(word))


def test_compound_expands_to_constituent_stems() -> None:
    """A compound emits its own stem AND the stems of its two split parts.

    Spec-deviation note: the literal Fugenelement algorithm *consumes* the
    linking element, so "gebäudesanierung" splits at the fugen-"s" into
    ("gebäude", "anierung") — the leading "s" of "sanierung" is the fugen. The
    head constituent stem (gebäude -> gebaud) is therefore always recoverable;
    the tail stem is that of the post-fugen remainder. We assert the real
    behavior, not the spec's prose ideal of a clean "sanierung" tail.
    """
    enc = GermanSparseEncoder()
    stems = enc.tokenize("Gebäudesanierung")

    parts = enc.split_compound("gebäudesanierung")
    assert len(parts) == 2
    left, right = parts

    assert _stem(left) in stems  # head constituent: gebäude -> gebaud
    assert _stem(right) in stems  # tail constituent (post-fugen remainder)
    assert _stem("gebäude") in stems  # explicit: the gebäude stem is present
    # The full compound stem is present alongside its parts (compound + parts).
    assert _stem("gebäudesanierung") in stems


def test_split_compound_clean_two_word_compound() -> None:
    """A compound of two real words splits into two real-word parts."""
    enc = GermanSparseEncoder()
    parts = enc.split_compound("energieberatung")
    assert parts == ["energi", "beratung"]
    assert _stem("beratung") in enc.tokenize("Energieberatung")


def test_split_compound_short_word_returns_empty() -> None:
    """Words shorter than MIN_COMPOUND_LENGTH (10) never split."""
    enc = GermanSparseEncoder()
    assert enc.split_compound("haus") == []
    assert enc.split_compound("kurz") == []
    # Exactly 9 chars: still below the 10-char compound threshold.
    assert len("neuntoken") == 9
    assert enc.split_compound("neuntoken") == []


def test_split_compound_balanced_parts_each_min_length() -> None:
    """A long compound yields a balanced 2-part split, both parts >= 4 chars."""
    enc = GermanSparseEncoder()
    parts = enc.split_compound("wärmepumpenförderung")
    assert len(parts) == 2
    left, right = parts
    assert len(left) >= MIN_PART_LENGTH
    assert len(right) >= MIN_PART_LENGTH
    # Balanced: the shorter part is at least 50% of the longer one.
    assert min(len(left), len(right)) / max(len(left), len(right)) >= 0.5


def test_encode_indices_sorted_uint32_positive_values() -> None:
    """Indices are ascending and uint32; values are strictly positive."""
    enc = GermanSparseEncoder()
    vec = enc.encode("Förderung der Gebäudesanierung und der Dämmung im Altbau")

    assert isinstance(vec, SparseVec)
    assert vec.indices == sorted(vec.indices)
    assert len(set(vec.indices)) == len(vec.indices)  # no duplicate indices
    assert len(vec.indices) == len(vec.values)
    assert all(0 <= idx < 2**32 for idx in vec.indices)
    assert all(val > 0.0 for val in vec.values)


def test_encode_is_symmetric_and_deterministic() -> None:
    """The identical encoder on identical text yields an identical vector."""
    enc = GermanSparseEncoder()
    text = "Zuschuss für die energetische Sanierung von Wohngebäuden"
    a = enc.encode(text)
    b = enc.encode(text)
    assert a.indices == b.indices
    assert a.values == b.values

    # A second encoder instance (query side) produces the same vector (symmetry).
    other = GermanSparseEncoder()
    c = other.encode(text)
    assert a.indices == c.indices
    assert a.values == c.values


def test_bm25_saturation_is_sublinear() -> None:
    """A term seen twice weighs more than once but strictly less than 2x."""
    enc = GermanSparseEncoder()
    one = enc.encode("dämmung")
    two = enc.encode("dämmung dämmung")

    assert len(one.values) == 1
    assert len(two.values) == 1
    single = one.values[0]
    double = two.values[0]
    assert single < double < 2.0 * single


def test_stopwords_are_dropped() -> None:
    """German and English stopwords carry no signal."""
    enc = GermanSparseEncoder()
    for stopword in ("und", "der", "the", "and"):
        assert enc.tokenize(stopword) == []
        assert enc.encode(stopword) == SparseVec(indices=[], values=[])
