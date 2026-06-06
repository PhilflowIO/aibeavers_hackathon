"""Ingest pipeline — raw dump -> cleaned parquet + hybrid Qdrant collection.

This is the wiring layer that turns the offline funding parquet into the two
artifacts the query side reads: a cleaned parquet (DetailStore, Spec F) and a
hybrid dense+sparse Qdrant collection (Spec E). It composes the pure building
blocks (cleaning, taxonomy, chunking, embedding, sparse) without re-implementing
any of them.

The whole flow is a single testable core, :func:`run_ingest`, that takes its
heavy collaborators (embedding provider, vector store, sparse encoder, chunker)
as arguments so tests inject deterministic fakes / in-memory backends. The
``--dry-run`` path still writes the cleaned parquet (cheap, no network) but skips
chunk/embed/upsert (the expensive, network-bound stage). :func:`main` wires the
real collaborators and is the ``foerder-ingest`` entry point.

Invariants honored here (the gotchas that bite if dropped):

* ``deleted == true`` rows are filtered before anything else touches them.
* Taxonomy contracts are built once over ALL rows per column, then applied per
  program, so the key/display mapping is globally consistent.
* No empty string is ever embedded — cleaning fills ``NULL_FILL`` and we keep it.
* The Instruct prefix is QUERY-SIDE ONLY; documents embed raw via
  ``embed_documents`` (which adds no prefix), so ingest stays correct by simply
  not adding one.
* Chunk <-> embedding <-> program alignment is preserved by carrying a flat
  index map alongside the flat enriched-chunk list.
"""

from __future__ import annotations

import argparse
import subprocess
import uuid
from pathlib import Path
from typing import TYPE_CHECKING, Any

import polars as pl

from foerder.cleaning import clean_html, extract_descriptions, program_uuid
from foerder.config import (
    NULL_FILL,
    TAXONOMY_COLUMNS,
    get_settings,
)
from foerder.qdrant_store import ChunkPoint
from foerder.taxonomy import build_contract, canonicalize

if TYPE_CHECKING:
    from foerder.chunking import Chunker
    from foerder.embedding import EmbeddingProvider
    from foerder.qdrant_store import QdrantStore
    from foerder.sparse import GermanSparseEncoder

# Scalar text fields cleaned with clean_html (NULL_FILL on empty). title is
# handled separately because it is also needed for the contextual header.
_SCALAR_TEXT_FIELDS: tuple[str, ...] = (
    "legal_basis",
    "more_info",
    "funding_body",
    "contact_info_institution",
    "contact_info_street",
    "contact_info_city",
    "contact_info_phone",
    "contact_info_fax",
    "contact_info_email",
    "contact_info_website",
)


def _ensure_raw_parquet(raw_parquet: Path, dump_url: str) -> None:
    """Make sure the raw parquet exists; fetch it on demand if it is missing.

    The offline file normally already exists (it is the primary path). If it is
    absent we try ``fetch_data.sh`` first (it extracts the dump into the right
    place and is the canonical fetch), falling back to nothing else — a missing
    file after the fetch is a hard error the caller must see.
    """
    if raw_parquet.is_file():
        return

    fetch_script = Path(__file__).resolve().parent.parent / "fetch_data.sh"
    if fetch_script.is_file():
        subprocess.run(
            [str(fetch_script), str(raw_parquet.parent)],
            check=True,
        )
    if not raw_parquet.is_file():
        raise FileNotFoundError(
            f"Raw parquet {raw_parquet} is missing and the fetch (from {dump_url}) "
            "did not produce it. Run ./fetch_data.sh manually and retry."
        )


def _build_contracts(df: pl.DataFrame) -> dict[str, dict[str, str]]:
    """Build one ``{key: display}`` contract per taxonomy column over ALL rows.

    The taxonomy columns are ``list[str]`` per row, so we flatten every row's
    values into a single stream before handing it to :func:`build_contract`.
    """
    contracts: dict[str, dict[str, str]] = {}
    for column in TAXONOMY_COLUMNS:
        flat: list[str | None] = []
        for row_values in df[column].to_list():
            if row_values is None:
                continue
            flat.extend(row_values)
        contracts[column] = build_contract(flat)
    return contracts


def _clean_program(
    row: dict[str, Any], contracts: dict[str, dict[str, str]]
) -> dict[str, Any]:
    """Turn one raw row into a cleaned, flat program record.

    Produces the row written to the cleaned parquet (one row per program). All
    scalar text is HTML-stripped and ``NULL_FILL``-filled; each taxonomy column
    yields both a display list and a normalized keys list.
    """
    short, full = extract_descriptions(row.get("description"))
    record: dict[str, Any] = {
        "uuid": program_uuid(row["id_hash"]),
        "title": clean_html(row.get("title")),
        "short_description": short,
        "full_description": full,
    }

    for field_name in _SCALAR_TEXT_FIELDS:
        record[field_name] = clean_html(row.get(field_name))

    for column in TAXONOMY_COLUMNS:
        displays, keys = canonicalize(row.get(column), contracts[column])
        record[column] = displays
        record[f"{column}_keys"] = keys

    further_links = row.get("further_links")
    record["url"] = row.get("url") or NULL_FILL
    record["further_links"] = list(further_links) if further_links else []
    record["last_updated"] = row.get("last_updated")
    record["on_website_from"] = row.get("on_website_from")
    return record


def _doc_text(program: dict[str, Any]) -> str:
    """Pick the embedding source text: full description, else the short one.

    Both are already ``NULL_FILL``-filled by cleaning, so the result is never an
    empty string (which would trip the embedding backend).
    """
    full = str(program["full_description"])
    return full if full != NULL_FILL else str(program["short_description"])


def _payload(program: dict[str, Any]) -> dict[str, Any]:
    """Build the per-chunk Qdrant payload (display lists + key lists + scalars)."""
    payload: dict[str, Any] = {
        "project_uuid": program["uuid"],
        "title": program["title"],
        "funding_body": program["funding_body"],
        "url": program["url"],
        "short_description": program["short_description"],
    }
    for column in TAXONOMY_COLUMNS:
        payload[column] = program[column]
        payload[f"{column}_keys"] = program[f"{column}_keys"]
    return payload


def run_ingest(
    *,
    provider: EmbeddingProvider,
    store: QdrantStore,
    encoder: GermanSparseEncoder,
    chunker: Chunker,
    limit: int | None = None,
    dry_run: bool = False,
) -> dict[str, Any]:
    """Run the full ingest and return a summary dict.

    Steps: load raw parquet (fetch if missing) -> drop ``deleted`` rows ->
    build taxonomy contracts over all rows -> clean each program -> write the
    cleaned parquet (always, even on ``dry_run``) -> chunk/embed/sparse/upsert
    (skipped on ``dry_run``).

    Returns ``{programs, chunks, points, collection}``.
    """
    from foerder.chunking import build_contextual_header

    settings = get_settings()
    _ensure_raw_parquet(settings.raw_parquet, settings.dump_url)

    df = pl.read_parquet(settings.raw_parquet)
    if limit is not None:
        df = df.head(limit)

    # 2. Filter deleted rows (boolean column; treat null as not-deleted).
    if "deleted" in df.columns:
        df = df.filter(~pl.col("deleted").fill_null(False))

    # 3. Taxonomy contracts over ALL surviving rows.
    contracts = _build_contracts(df)

    # 4. Clean each program.
    programs = [_clean_program(row, contracts) for row in df.iter_rows(named=True)]

    # 5. Write the cleaned parquet (always, even dry-run). One row per program.
    settings.clean_parquet.parent.mkdir(parents=True, exist_ok=True)
    pl.DataFrame(programs).write_parquet(settings.clean_parquet)

    summary: dict[str, Any] = {
        "programs": len(programs),
        "chunks": 0,
        "points": 0,
        "collection": settings.collection_name,
    }
    if dry_run:
        return summary

    # 6. Chunk + embed + sparse + upsert.
    enriched_chunks: list[str] = []
    # For chunk j in the flat list: which program produced it, and its in-program index.
    chunk_owner: list[tuple[int, int]] = []
    for prog_idx, program in enumerate(programs):
        header = build_contextual_header(program["title"], program["funding_area"])
        chunks = chunker.chunk(_doc_text(program))
        for local_idx, chunk in enumerate(chunks):
            enriched_chunks.append(header + chunk)
            chunk_owner.append((prog_idx, local_idx))

    summary["chunks"] = len(enriched_chunks)

    # Documents embed RAW (no instruct prefix) — embed_documents adds none.
    dense_vectors = provider.embed_documents(enriched_chunks)
    if len(dense_vectors) != len(enriched_chunks):
        raise RuntimeError(
            f"Embedding count mismatch: {len(dense_vectors)} vectors for "
            f"{len(enriched_chunks)} chunks — chunk/embedding alignment broken."
        )

    points: list[ChunkPoint] = []
    for enriched, dense, (prog_idx, local_idx) in zip(
        enriched_chunks, dense_vectors, chunk_owner, strict=True
    ):
        program = programs[prog_idx]
        sparse = encoder.encode(enriched)
        point_id = str(
            uuid.uuid5(uuid.UUID(program["uuid"]), f"chunk_{local_idx}")
        )
        points.append(
            ChunkPoint(
                point_id=point_id,
                dense=dense,
                sparse=sparse,
                payload=_payload(program),
            )
        )

    store.recreate_collection()
    store.upsert_chunks(points)
    summary["points"] = len(points)
    return summary


def main() -> None:
    """CLI entry point (``foerder-ingest``). Wires the real collaborators."""
    from foerder.chunking import Chunker
    from foerder.embedding import get_provider
    from foerder.qdrant_store import QdrantStore
    from foerder.sparse import GermanSparseEncoder

    parser = argparse.ArgumentParser(
        prog="foerder-ingest",
        description="Ingest the funding dump into cleaned parquet + Qdrant.",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Only ingest the first N raw rows (smoke runs).",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Write the cleaned parquet but skip embed/upsert.",
    )
    args = parser.parse_args()

    summary = run_ingest(
        provider=get_provider(),
        store=QdrantStore(),
        encoder=GermanSparseEncoder(),
        chunker=Chunker(),
        limit=args.limit,
        dry_run=args.dry_run,
    )
    print(
        f"ingest complete: {summary['programs']} programs, "
        f"{summary['chunks']} chunks, {summary['points']} points "
        f"-> collection {summary['collection']!r}"
        + (" (dry-run: store untouched)" if args.dry_run else "")
    )


if __name__ == "__main__":
    main()
