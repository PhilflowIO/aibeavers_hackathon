"""Tests for the Qdrant hybrid store + convex-combination search (Spec E).

Runs fully offline against Qdrant's in-memory backend (``QdrantClient(":memory:")``),
injected into the store. Vectors are hand-built so the dense-only and sparse-only
orderings deliberately disagree — proving the convex fusion actually combines
both channels rather than mirroring one.
"""

from __future__ import annotations

import pytest
from qdrant_client import QdrantClient

from foerder.config import DENSE_DIM
from foerder.qdrant_store import ChunkPoint, ProgramHit, QdrantStore
from foerder.sparse import SparseVec


def _dense(*pairs: tuple[int, float]) -> list[float]:
    """Build a DENSE_DIM vector with the given (index, value) entries set."""
    vec = [0.0] * DENSE_DIM
    for idx, val in pairs:
        vec[idx] = val
    return vec


def _payload(
    project_uuid: str,
    title: str,
    *,
    location_keys: list[str] | None = None,
) -> dict:
    return {
        "project_uuid": project_uuid,
        "title": title,
        "funding_type": ["Zuschuss"],
        "funding_area": ["Energieeffizienz"],
        "funding_location": ["Bundesweit"],
        "funding_location_keys": location_keys if location_keys is not None else ["bundesweit"],
        "eligible_applicants": ["Unternehmen"],
        "funding_type_keys": ["zuschuss"],
        "funding_area_keys": ["energieeffizienz"],
        "eligible_applicants_keys": ["unternehmen"],
        "funding_body": "BMWK",
        "url": "https://example.test/" + project_uuid,
        "short_description": f"Kurzbeschreibung {title}",
    }


@pytest.fixture
def store() -> QdrantStore:
    s = QdrantStore(client=QdrantClient(":memory:"))
    s.recreate_collection()
    return s


def test_recreate_upsert_count(store: QdrantStore) -> None:
    points = [
        ChunkPoint(
            point_id=f"00000000-0000-0000-0000-00000000000{i}",
            dense=_dense((0, 1.0)),
            sparse=SparseVec(indices=[1, 2], values=[1.0, 1.0]),
            payload=_payload(f"prog-{i}", f"Programm {i}"),
        )
        for i in range(3)
    ]
    store.upsert_chunks(points)
    assert store.count() == 3
    # idempotent recreate wipes the collection
    store.recreate_collection()
    assert store.count() == 0


def test_pure_dense_ordering(store: QdrantStore) -> None:
    # A is closest to the dense query, B second, C orthogonal.
    store.upsert_chunks(
        [
            ChunkPoint("00000000-0000-0000-0000-0000000000a1", _dense((0, 1.0)),
                       SparseVec([5], [0.1]), _payload("A", "A")),
            ChunkPoint("00000000-0000-0000-0000-0000000000b1", _dense((0, 1.0), (1, 1.0)),
                       SparseVec([5], [0.1]), _payload("B", "B")),
            ChunkPoint("00000000-0000-0000-0000-0000000000c1", _dense((2, 1.0)),
                       SparseVec([5], [0.1]), _payload("C", "C")),
        ]
    )
    hits = store.search(
        dense_query=_dense((0, 1.0)),
        sparse_query=SparseVec([5], [0.1]),
        semantic_weight=1.0,
        limit=10,
    )
    order = [h.uuid for h in hits]
    assert order[0] == "A"  # exact cosine match
    assert order.index("B") < order.index("C")  # partial beats orthogonal


def test_pure_sparse_ordering(store: QdrantStore) -> None:
    # Sparse ordering is the INVERSE of the dense ordering above.
    store.upsert_chunks(
        [
            ChunkPoint("00000000-0000-0000-0000-0000000000a2", _dense((0, 1.0)),
                       SparseVec([10], [0.2]), _payload("A", "A")),
            ChunkPoint("00000000-0000-0000-0000-0000000000b2", _dense((0, 1.0), (1, 1.0)),
                       SparseVec([10, 11], [5.0, 5.0]), _payload("B", "B")),
            ChunkPoint("00000000-0000-0000-0000-0000000000c2", _dense((2, 1.0)),
                       SparseVec([10], [9.0]), _payload("C", "C")),
        ]
    )
    hits = store.search(
        dense_query=_dense((0, 1.0)),
        sparse_query=SparseVec([10, 11], [1.0, 1.0]),
        semantic_weight=0.0,
        limit=10,
    )
    # B matches both sparse dims -> top; A & C match only dim 10.
    assert hits[0].uuid == "B"


def test_fusion_blends_channels(store: QdrantStore) -> None:
    # Dense favours A (exact), sparse favours C (strong term overlap).
    # A pure-dense search ranks A first; pure-sparse ranks C first.
    # A balanced fusion must let the sparse signal lift C above where dense alone
    # would put it — proving both channels contribute.
    store.upsert_chunks(
        [
            ChunkPoint("00000000-0000-0000-0000-0000000000a3", _dense((0, 1.0)),
                       SparseVec([20], [0.01]), _payload("A", "A")),
            ChunkPoint("00000000-0000-0000-0000-0000000000c3", _dense((1, 1.0)),
                       SparseVec([20, 21], [9.0, 9.0]), _payload("C", "C")),
        ]
    )
    dense_q = _dense((0, 1.0))
    sparse_q = SparseVec([20, 21], [1.0, 1.0])

    dense_only = store.search(dense_query=dense_q, sparse_query=sparse_q,
                              semantic_weight=1.0, limit=10)
    sparse_only = store.search(dense_query=dense_q, sparse_query=sparse_q,
                               semantic_weight=0.0, limit=10)
    assert dense_only[0].uuid == "A"
    assert sparse_only[0].uuid == "C"

    # Heavy sparse weight: the sparse-favoured program wins the blend.
    fused = store.search(dense_query=dense_q, sparse_query=sparse_q,
                         semantic_weight=0.2, limit=10)
    assert fused[0].uuid == "C"
    # Heavy dense weight: the dense-favoured program wins the blend.
    fused_dense = store.search(dense_query=dense_q, sparse_query=sparse_q,
                               semantic_weight=0.8, limit=10)
    assert fused_dense[0].uuid == "A"


def test_dedupe_chunks_to_one_program(store: QdrantStore) -> None:
    # Two chunks share project_uuid "X"; the higher-scoring chunk's score wins.
    store.upsert_chunks(
        [
            ChunkPoint("00000000-0000-0000-0000-0000000000d1", _dense((0, 1.0)),
                       SparseVec([30], [1.0]), _payload("X", "X chunk 0")),
            ChunkPoint("00000000-0000-0000-0000-0000000000d2", _dense((0, 0.5), (1, 0.5)),
                       SparseVec([30], [1.0]), _payload("X", "X chunk 1")),
            ChunkPoint("00000000-0000-0000-0000-0000000000d3", _dense((2, 1.0)),
                       SparseVec([30], [1.0]), _payload("Y", "Y")),
        ]
    )
    hits = store.search(dense_query=_dense((0, 1.0)), sparse_query=SparseVec([30], [1.0]),
                        semantic_weight=1.0, limit=10)
    uuids = [h.uuid for h in hits]
    assert uuids.count("X") == 1  # collapsed to a single ProgramHit
    assert "Y" in uuids
    x_hit = next(h for h in hits if h.uuid == "X")
    assert isinstance(x_hit, ProgramHit)


def test_filter_matchany_normalizes_raw_value(store: QdrantStore) -> None:
    store.upsert_chunks(
        [
            ChunkPoint("00000000-0000-0000-0000-0000000000e1", _dense((0, 1.0)),
                       SparseVec([40], [1.0]),
                       _payload("NRW", "NRW prog", location_keys=["nordrhein_westfalen"])),
            ChunkPoint("00000000-0000-0000-0000-0000000000e2", _dense((0, 1.0)),
                       SparseVec([40], [1.0]),
                       _payload("BY", "Bayern prog", location_keys=["bayern"])),
        ]
    )
    # Raw user value "Nordrhein-Westfalen" must normalize to "nordrhein_westfalen".
    hits = store.search(
        dense_query=_dense((0, 1.0)),
        sparse_query=SparseVec([40], [1.0]),
        semantic_weight=1.0,
        limit=10,
        filters={"funding_location": ["Nordrhein-Westfalen"]},
    )
    assert [h.uuid for h in hits] == ["NRW"]


def test_empty_filter_values_skipped(store: QdrantStore) -> None:
    store.upsert_chunks(
        [
            ChunkPoint("00000000-0000-0000-0000-0000000000f1", _dense((0, 1.0)),
                       SparseVec([50], [1.0]), _payload("Z", "Z")),
        ]
    )
    # An all-empty filter dict must not restrict anything.
    hits = store.search(dense_query=_dense((0, 1.0)), sparse_query=SparseVec([50], [1.0]),
                        semantic_weight=1.0, limit=10, filters={"funding_location": []})
    assert [h.uuid for h in hits] == ["Z"]
