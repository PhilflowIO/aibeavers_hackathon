"""Tests for the ingest pipeline (Spec C/D/E wiring).

Fully offline and deterministic:

* No network embeddings — a ``FakeProvider`` returns fixed-length vectors derived
  from input length.
* No network Qdrant — the REAL :class:`QdrantStore` over ``QdrantClient(":memory:")``.
* No live dump — a tiny in-memory polars DataFrame written to a tmp parquet, with
  ``settings.raw_parquet`` / ``settings.clean_parquet`` redirected at it.

The fixture covers the branches the pipeline must get right: a ``deleted=True``
row (must vanish), a null-description row (must become ``NULL_FILL`` text, never
embedded empty), list-typed taxonomy columns (contract + canonicalize), and a
Kurztext/Volltext HTML description (split into short/full).
"""

from __future__ import annotations

from pathlib import Path

import polars as pl
import pytest
from qdrant_client import QdrantClient

from foerder.config import DENSE_DIM, NULL_FILL, TAXONOMY_KEY_FIELDS, get_settings
from foerder.ingest import run_ingest
from foerder.qdrant_store import QdrantStore
from foerder.sparse import GermanSparseEncoder


class FakeProvider:
    """Deterministic embedding provider: vector derived from input length.

    Satisfies the ``EmbeddingProvider`` protocol without any network. The vector
    is constant per text length, which is plenty for alignment / count assertions.
    """

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        vectors: list[list[float]] = []
        for text in texts:
            value = float(len(text) % 97) / 97.0
            vectors.append([value] * DENSE_DIM)
        return vectors

    def embed_query(self, text: str) -> list[float]:
        value = float(len(text) % 97) / 97.0
        return [value] * DENSE_DIM


class FakeChunker:
    """Single-chunk chunker — keeps tests independent of the tokenizer download."""

    def chunk(self, text: str) -> list[str]:
        return [text]


_DESC_HTML = (
    "<article><h3>Kurztext</h3><p>Kurzer Foerdertext fuer Unternehmen.</p>"
    "<h3>Volltext</h3><p>Ausfuehrlicher Volltext zur Foerderung von "
    "Energieeffizienz in Unternehmen.</p></article>"
)


def _fixture_df() -> pl.DataFrame:
    """Four raw rows: two normal, one deleted, one with a null description."""
    return pl.DataFrame(
        {
            "id_hash": ["hash_a", "hash_b", "hash_deleted", "hash_null"],
            "url": [
                "https://example.test/a",
                "https://example.test/b",
                "https://example.test/deleted",
                "https://example.test/null",
            ],
            "title": [
                "Foerderung A",
                "Foerderung B",
                "Geloeschte Foerderung",
                "Foerderung ohne Text",
            ],
            "description": [_DESC_HTML, _DESC_HTML, _DESC_HTML, None],
            "legal_basis": ["<p>Richtlinie A</p>", None, None, None],
            "more_info": [None, None, None, None],
            "funding_body": ["BMWK", "BAFA", "X", "KfW"],
            "contact_info_institution": [None, None, None, None],
            "contact_info_street": [None, None, None, None],
            "contact_info_city": [None, None, None, None],
            "contact_info_phone": [None, None, None, None],
            "contact_info_fax": [None, None, None, None],
            "contact_info_email": [None, None, None, None],
            "contact_info_website": [None, None, None, None],
            "funding_type": [["Zuschuss"], ["Zuschuss"], ["Zuschuss"], ["Darlehen"]],
            "funding_area": [
                ["Energieeffizienz"],
                ["Energie & Effizienz"],
                ["Egal"],
                ["Forschung"],
            ],
            "funding_location": [
                ["Nordrhein-Westfalen"],
                ["nordrhein_westfalen"],
                ["Egal"],
                ["Bundesweit"],
            ],
            "eligible_applicants": [
                ["Unternehmen"],
                ["Unternehmen"],
                ["Egal"],
                ["Hochschulen"],
            ],
            "further_links": [["https://link.a"], [], [], None],
            "last_updated": [None, None, None, None],
            "on_website_from": [None, None, None, None],
            "deleted": [False, False, True, False],
        }
    )


@pytest.fixture
def wired(tmp_path: Path):  # noqa: ANN201 — fixture returns an ad-hoc namespace
    """Redirect settings at tmp parquets and yield the injected collaborators."""
    settings = get_settings()
    raw_path = tmp_path / "raw.parquet"
    clean_path = tmp_path / "clean.parquet"
    _fixture_df().write_parquet(raw_path)

    orig_raw, orig_clean = settings.raw_parquet, settings.clean_parquet
    settings.raw_parquet = raw_path
    settings.clean_parquet = clean_path
    try:
        store = QdrantStore(client=QdrantClient(":memory:"))
        # Pre-create the collection so the dry-run "store stays empty" assertion
        # tests "ingest upserted nothing" rather than "collection is absent".
        store.recreate_collection()

        class Wired:
            pass

        w = Wired()
        w.store = store
        w.clean_path = clean_path
        w.provider = FakeProvider()
        w.encoder = GermanSparseEncoder()
        w.chunker = FakeChunker()
        yield w
    finally:
        settings.raw_parquet = orig_raw
        settings.clean_parquet = orig_clean


def test_deleted_filtered_and_cleaned_parquet(wired) -> None:  # noqa: ANN001
    summary = run_ingest(
        provider=wired.provider,
        store=wired.store,
        encoder=wired.encoder,
        chunker=wired.chunker,
    )
    # The deleted row is excluded -> 3 programs survive.
    assert summary["programs"] == 3

    clean = pl.read_parquet(wired.clean_path)
    assert clean.height == 3
    assert "Geloeschte Foerderung" not in clean["title"].to_list()
    # Deterministic uuid count: one unique uuid per surviving program.
    assert clean["uuid"].n_unique() == 3


def test_null_description_gets_null_fill(wired) -> None:  # noqa: ANN001
    run_ingest(
        provider=wired.provider,
        store=wired.store,
        encoder=wired.encoder,
        chunker=wired.chunker,
    )
    clean = pl.read_parquet(wired.clean_path)
    null_row = clean.filter(pl.col("title") == "Foerderung ohne Text").to_dicts()[0]
    # Null description -> both descriptions are NULL_FILL, never an empty string.
    assert null_row["short_description"] == NULL_FILL
    assert null_row["full_description"] == NULL_FILL


def test_kurztext_volltext_split(wired) -> None:  # noqa: ANN001
    run_ingest(
        provider=wired.provider,
        store=wired.store,
        encoder=wired.encoder,
        chunker=wired.chunker,
    )
    clean = pl.read_parquet(wired.clean_path)
    row = clean.filter(pl.col("title") == "Foerderung A").to_dicts()[0]
    assert "Kurzer Foerdertext" in row["short_description"]
    assert "Ausfuehrlicher Volltext" in row["full_description"]
    # No HTML markup leaks through.
    assert "<" not in row["full_description"]


def test_points_payload_and_count(wired) -> None:  # noqa: ANN001
    summary = run_ingest(
        provider=wired.provider,
        store=wired.store,
        encoder=wired.encoder,
        chunker=wired.chunker,
    )
    # FakeChunker yields one chunk per program -> points == programs.
    assert summary["chunks"] == summary["programs"]
    assert summary["points"] == summary["programs"]
    assert wired.store.count() == summary["points"]

    # Inspect an upserted payload directly from the in-memory store.
    records, _ = wired.store._client.scroll(  # noqa: SLF001 — test-only inspection
        collection_name=get_settings().collection_name,
        limit=10,
        with_payload=True,
    )
    payloads = [r.payload for r in records]
    assert all("project_uuid" in p for p in payloads)
    # Both display lists and normalized key lists are present.
    for p in payloads:
        for key_field in TAXONOMY_KEY_FIELDS:
            assert key_field in p
        assert "funding_type" in p and "funding_area" in p

    # Taxonomy keys are normalized: the two surface forms of NRW
    # ("Nordrhein-Westfalen" / "nordrhein_westfalen") collapse to one key.
    location_keys = {
        k for p in payloads for k in p.get("funding_location_keys", [])
    }
    assert "nordrhein_westfalen" in location_keys


def test_dry_run_writes_parquet_but_leaves_store_empty(wired) -> None:  # noqa: ANN001
    summary = run_ingest(
        provider=wired.provider,
        store=wired.store,
        encoder=wired.encoder,
        chunker=wired.chunker,
        dry_run=True,
    )
    assert summary["programs"] == 3
    assert summary["points"] == 0
    assert summary["chunks"] == 0
    # Cleaned parquet still written...
    assert wired.clean_path.is_file()
    assert pl.read_parquet(wired.clean_path).height == 3
    # ...but no chunks were upserted: the pre-existing collection stays empty.
    assert wired.store.count() == 0


def test_real_chunker_if_cached(wired) -> None:  # noqa: ANN001
    """Use the real Chunker only when the tokenizer is already cached offline."""
    if not Path(get_settings().hf_cache_dir).exists():
        pytest.skip("tokenizer not cached; skipping real-Chunker path")
    from foerder.chunking import Chunker

    summary = run_ingest(
        provider=wired.provider,
        store=wired.store,
        encoder=wired.encoder,
        chunker=Chunker(),
    )
    # Short fixture texts stay single-chunk, so points still equal programs.
    assert summary["points"] == summary["programs"] == 3
    assert wired.store.count() == 3
