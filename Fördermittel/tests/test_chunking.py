"""Tests for chunking + embedding pure logic (no network)."""

from __future__ import annotations

import pytest

from foerder.chunking import (
    _snap_to_sentence,
    build_contextual_header,
    window_token_ids,
)
from foerder.config import (
    ADAPTIVE_CHUNK_THRESHOLD,
    CHUNK_MAX_TOKENS,
    CHUNK_OVERLAP_TOKENS,
    INSTRUCT_TASK,
    NULL_FILL,
)
from foerder.embedding import build_query_text, sanitize_input

# --------------------------------------------------------------------------
# build_contextual_header
# --------------------------------------------------------------------------


def test_header_exact_format() -> None:
    assert build_contextual_header("X", ["a", "b"]) == "Title: X\nFunding area: a, b\n\n"


def test_header_empty_funding_area() -> None:
    assert build_contextual_header("X", []) == "Title: X\nFunding area: \n\n"


# --------------------------------------------------------------------------
# _snap_to_sentence
# --------------------------------------------------------------------------


def test_snap_truncates_after_last_boundary() -> None:
    text = "One. Two. Three end no boundary"
    # min_keep_chars=0 -> last boundary is after "Two."
    out = _snap_to_sentence(text, 0)
    assert out == "One. Two."


def test_snap_respects_min_keep_chars() -> None:
    text = "One. Two. Three."
    # Floor past "One." but before "Two." -> snaps to "Two." boundary.
    out = _snap_to_sentence(text, len("One. T"))
    assert out == "One. Two."


def test_snap_no_boundary_returns_unchanged() -> None:
    text = "no sentence boundary here at all"
    assert _snap_to_sentence(text, 0) == text


def test_snap_no_boundary_after_floor_returns_unchanged() -> None:
    text = "Early. then a long tail with no terminal punctuation following"
    # Floor is past the only boundary -> nothing qualifies.
    out = _snap_to_sentence(text, len("Early. then a"))
    assert out == text


def test_snap_handles_newline_boundary() -> None:
    text = "First line.\nSecond part continues"
    assert _snap_to_sentence(text, 0) == "First line."


# --------------------------------------------------------------------------
# window_token_ids
# --------------------------------------------------------------------------


def test_short_doc_single_window() -> None:
    ids = list(range(ADAPTIVE_CHUNK_THRESHOLD))  # below threshold handled in Chunker
    windows = window_token_ids(
        ids, max_tokens=CHUNK_MAX_TOKENS, overlap_tokens=CHUNK_OVERLAP_TOKENS
    )
    # 600 ids, 512 window, step 450 -> windows at [0,512), [450,600)
    assert windows[0] == (0, 512)
    assert windows[-1][1] == 600


def test_windows_overlap_by_configured_amount() -> None:
    ids = list(range(2000))
    windows = window_token_ids(ids, max_tokens=512, overlap_tokens=62)
    step = 512 - 62
    assert windows[0] == (0, 512)
    assert windows[1][0] == step
    # Consecutive windows overlap by exactly overlap_tokens (except final clamp).
    overlap = windows[0][1] - windows[1][0]
    assert overlap == 62


def test_window_progress_guard_no_infinite_loop() -> None:
    ids = list(range(100))
    # overlap >= max would zero/negative step; guard forces progress.
    windows = window_token_ids(ids, max_tokens=10, overlap_tokens=20)
    assert windows[-1][1] == 100
    assert len(windows) <= 100


def test_empty_ids_no_windows() -> None:
    assert window_token_ids([]) == []


# --------------------------------------------------------------------------
# embedding pure helpers
# --------------------------------------------------------------------------


def test_query_wrapper_format() -> None:
    assert build_query_text("hallo") == f"Instruct: {INSTRUCT_TASK}\nQuery: hallo"


def test_sanitize_empty_to_null_fill() -> None:
    assert sanitize_input("") == NULL_FILL
    assert sanitize_input("   \n\t ") == NULL_FILL


def test_sanitize_keeps_real_text() -> None:
    assert sanitize_input("Förderung") == "Förderung"


# --------------------------------------------------------------------------
# Integration: real tokenizer (skipped if unavailable / no network)
# --------------------------------------------------------------------------


def _make_chunker():  # type: ignore[no-untyped-def]
    pytest.importorskip("transformers")
    from foerder.chunking import Chunker

    try:
        return Chunker()
    except Exception as exc:  # noqa: BLE001
        pytest.skip(f"Qwen tokenizer unavailable (no network?): {exc}")


def test_real_short_doc_single_chunk() -> None:
    chunker = _make_chunker()
    text = "Dies ist ein kurzer Foerdertext. " * 5
    chunks = chunker.chunk(text)
    assert chunks == [text]


def test_real_long_doc_multiple_overlapping_chunks() -> None:
    chunker = _make_chunker()
    sentence = (
        "Das Foerderprogramm unterstuetzt die energetische Sanierung von "
        "Wohngebaeuden mit zinsguenstigen Krediten und Zuschuessen. "
    )
    # Build a doc well over the 600-token threshold.
    text = sentence * 120
    ids = chunker.tokenizer.encode(text, add_special_tokens=False)
    assert len(ids) > ADAPTIVE_CHUNK_THRESHOLD
    chunks = chunker.chunk(text)
    assert len(chunks) > 1
    # Overlap: the two windows share token-id ranges, so the same repeated
    # sentence content appears in both adjacent chunks.
    snippet = "energetische Sanierung"
    assert snippet in chunks[0] and snippet in chunks[1]
    # Each chunk's token length must respect the window cap.
    for c in chunks:
        assert len(chunker.tokenizer.encode(c, add_special_tokens=False)) <= CHUNK_MAX_TOKENS + 5
