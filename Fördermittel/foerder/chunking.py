"""Token-based chunking with the Qwen tokenizer + contextual headers (Spec C/D).

The chunker tokenizes with the SAME tokenizer used at embed time (Qwen3
embedding model), so the 512-token window is honest rather than a character
approximation. Short documents (<= ADAPTIVE_CHUNK_THRESHOLD tokens) stay a
single chunk; longer ones are split with a sliding window that overlaps by
CHUNK_OVERLAP_TOKENS and snaps the cut to a sentence boundary in the trailing
quarter so chunks don't end mid-sentence.

The pure windowing/snapping logic is factored into module-level functions that
operate on plain token-id lists and strings, so it is testable without
downloading the model. The ``Chunker`` class wires the real tokenizer into
those functions.
"""

from __future__ import annotations

from typing import Protocol, cast

from foerder.config import (
    ADAPTIVE_CHUNK_THRESHOLD,
    CHUNK_MAX_TOKENS,
    CHUNK_OVERLAP_TOKENS,
    SENTENCE_SNAP_FRACTION,
    get_settings,
)

# Sentence-boundary markers: a terminal punctuation followed by space or newline.
_SENTENCE_BOUNDARIES: tuple[str, ...] = (". ", "? ", "! ", ".\n", "?\n", "!\n")


class TokenizerLike(Protocol):
    """Minimal surface of a HF tokenizer used by the chunking logic."""

    def encode(self, text: str, add_special_tokens: bool = ...) -> list[int]: ...

    def decode(self, ids: list[int]) -> str: ...


def build_contextual_header(title: str, funding_area: list[str]) -> str:
    """Build the structured header prepended to every chunk before embedding.

    Enriches each chunk with the programme title and funding areas so a chunk
    carries its context into the embedding. Empty ``funding_area`` yields an
    empty area value rather than crashing.
    """
    area = ", ".join(funding_area)
    return f"Title: {title}\nFunding area: {area}\n\n"


def _snap_to_sentence(text: str, min_keep_chars: int) -> str:
    """Truncate ``text`` right after the last sentence boundary at/after a cutoff.

    Searches for the LAST sentence-boundary marker whose punctuation lands at or
    after ``min_keep_chars`` and truncates the string just after that
    punctuation. If no such boundary exists, returns ``text`` unchanged. Keeping
    ``min_keep_chars`` in the trailing-quarter range means the cut never removes
    more than the last ~25% of the window.
    """
    best_end = -1
    for marker in _SENTENCE_BOUNDARIES:
        idx = text.rfind(marker)
        # Position of the punctuation char itself must be at/after the floor.
        if idx >= min_keep_chars:
            # Truncate right after the punctuation (drop the trailing space/newline).
            end = idx + 1
            if end > best_end:
                best_end = end
    if best_end == -1:
        return text
    return text[:best_end]


def window_token_ids(
    ids: list[int],
    *,
    max_tokens: int = CHUNK_MAX_TOKENS,
    overlap_tokens: int = CHUNK_OVERLAP_TOKENS,
) -> list[tuple[int, int]]:
    """Compute sliding-window (start, end) index pairs over a token-id list.

    Windows are ``max_tokens`` wide and step forward by
    ``max_tokens - overlap_tokens`` so consecutive windows overlap. Progress is
    guaranteed (step >= 1) to avoid infinite loops even with a pathological
    overlap configuration. Pure function — no tokenizer needed, so it is unit
    testable in isolation.
    """
    if not ids:
        return []
    step = max_tokens - overlap_tokens
    if step < 1:
        step = 1
    windows: list[tuple[int, int]] = []
    start = 0
    n = len(ids)
    while start < n:
        end = min(start + max_tokens, n)
        windows.append((start, end))
        if end == n:
            break
        start += step
    return windows


class Chunker:
    """Token-based chunker bound to the Qwen embedding tokenizer."""

    def __init__(self) -> None:
        # Imported lazily so importing this module never requires transformers
        # (keeps pure-logic tests import-clean).
        from transformers import AutoTokenizer

        self.tokenizer: TokenizerLike
        settings = get_settings()
        try:
            # AutoTokenizer returns a concrete backend; we only rely on the
            # structural TokenizerLike surface (encode/decode), so cast.
            self.tokenizer = cast(
                TokenizerLike,
                AutoTokenizer.from_pretrained(
                    settings.tokenizer_model,
                    cache_dir=str(settings.hf_cache_dir),
                ),
            )
        except Exception as exc:  # noqa: BLE001 — re-raised with context
            raise RuntimeError(
                f"Failed to load tokenizer '{settings.tokenizer_model}'. The Qwen "
                "tokenizer must be downloadable from the HF Hub on first use "
                "(no auth token required). Check network access. "
                f"Underlying error: {exc}"
            ) from exc

    def chunk(self, text: str) -> list[str]:
        """Split ``text`` into <=512-token chunks with sentence-snapped overlap.

        Short docs (<= ADAPTIVE_CHUNK_THRESHOLD tokens) return as a single chunk
        verbatim. Longer docs are split with a sliding window; every window but
        the last is snapped to a sentence boundary in its trailing quarter.
        """
        ids = self.tokenizer.encode(text, add_special_tokens=False)
        if len(ids) <= ADAPTIVE_CHUNK_THRESHOLD:
            return [text]

        windows = window_token_ids(ids)
        chunks: list[str] = []
        for i, (start, end) in enumerate(windows):
            window_ids = ids[start:end]
            decoded = self.tokenizer.decode(window_ids)
            is_last = i == len(windows) - 1
            if not is_last:
                keep_ids = window_ids[: int(len(window_ids) * SENTENCE_SNAP_FRACTION)]
                min_keep_chars = len(self.tokenizer.decode(keep_ids))
                decoded = _snap_to_sentence(decoded, min_keep_chars)
            chunks.append(decoded)
        return chunks
