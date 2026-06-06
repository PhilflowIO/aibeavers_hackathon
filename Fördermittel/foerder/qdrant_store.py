"""Qdrant hybrid store + convex-combination search (Spec E).

The store holds two named vectors per chunk — a dense embedding (``dense``,
cosine) and a German sparse vector (``sparse``, server-side IDF). It accepts
PRE-COMPUTED vectors: the dense embedding comes from the embedding provider, the
sparse vector from :class:`foerder.sparse.GermanSparseEncoder`. The store owns
neither — it stays decoupled so encoder/provider can be swapped without touching
retrieval.

Search fuses the two channels with a tunable *convex combination*
(``w * dense_norm + (1 - w) * sparse_norm`` after independent min-max
normalization), deliberately NOT RRF/DBSF — the convex weight is the knob the
spec wants exposed. Chunk hits are deduped to one :class:`ProgramHit` per
program (max fused score).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from qdrant_client import QdrantClient, models

from foerder.config import (
    DEFAULT_SEMANTIC_WEIGHT,
    DENSE_DIM,
    DENSE_VECTOR_NAME,
    PREFETCH_LIMIT_MULTIPLIER,
    SPARSE_VECTOR_NAME,
    TAXONOMY_KEY_FIELDS,
    get_settings,
)
from foerder.sparse import SparseVec
from foerder.taxonomy import to_keys


@dataclass
class ProgramHit:
    """One funding programme, deduped from its best-scoring chunk."""

    uuid: str
    title: str
    score: float
    funding_type: list[str]
    funding_area: list[str]
    funding_location: list[str]
    eligible_applicants: list[str]
    funding_body: str
    url: str
    short_description: str


@dataclass
class ChunkPoint:
    """One chunk to upsert. Caller supplies the point id + pre-computed vectors."""

    point_id: str  # uuid5(project_uuid, "chunk_{i}") — caller supplies
    dense: list[float]  # 1024-dim
    sparse: SparseVec
    payload: dict[str, Any]  # project_uuid, title, *_keys lists, canonical display lists,
    # funding_body, url, short_description


def _normalize(scores: dict[str, float]) -> dict[str, float]:
    """Min-max normalize a {point_id: score} map into [0, 1].

    Constant ranges (one point, or all-equal scores) collapse to 1.0 so a
    single-hit channel still contributes its full weight rather than vanishing.
    """
    if not scores:
        return {}
    values = scores.values()
    lo, hi = min(values), max(values)
    span = hi - lo
    if span == 0.0:
        return {pid: 1.0 for pid in scores}
    return {pid: (score - lo) / span for pid, score in scores.items()}


class QdrantStore:
    """Hybrid dense+sparse store over a single Qdrant collection."""

    def __init__(self, client: QdrantClient | None = None) -> None:
        settings = get_settings()
        self._collection = settings.collection_name
        if client is not None:
            self._client = client
        elif settings.qdrant_url:
            self._client = QdrantClient(url=settings.qdrant_url)
        else:
            self._client = QdrantClient(path=str(settings.qdrant_path))

    # -- schema ----------------------------------------------------------------

    def recreate_collection(self) -> None:
        """Drop-if-exists then create the collection with both named vectors.

        Sparse uses ``Modifier.IDF`` so document frequency is applied server-side
        at query time — vectors are stored raw (BM25-saturated TF only). Payload
        keyword indexes on ``project_uuid`` and every taxonomy ``*_keys`` field
        make ``MatchAny`` filtering exact and fast.
        """
        if self._client.collection_exists(self._collection):
            self._client.delete_collection(self._collection)

        self._client.create_collection(
            collection_name=self._collection,
            vectors_config={
                DENSE_VECTOR_NAME: models.VectorParams(
                    size=DENSE_DIM,
                    distance=models.Distance.COSINE,
                ),
            },
            sparse_vectors_config={
                SPARSE_VECTOR_NAME: models.SparseVectorParams(
                    modifier=models.Modifier.IDF,
                ),
            },
        )

        for field_name in ("project_uuid", *TAXONOMY_KEY_FIELDS):
            self._client.create_payload_index(
                collection_name=self._collection,
                field_name=field_name,
                field_schema=models.PayloadSchemaType.KEYWORD,
            )

    # -- ingest ----------------------------------------------------------------

    def upsert_chunks(self, points: list[ChunkPoint], batch_size: int = 256) -> None:
        """Upsert chunk points (one point per chunk) in batches."""
        for start in range(0, len(points), batch_size):
            batch = points[start : start + batch_size]
            structs = [
                models.PointStruct(
                    id=point.point_id,
                    vector={
                        DENSE_VECTOR_NAME: point.dense,
                        SPARSE_VECTOR_NAME: models.SparseVector(
                            indices=point.sparse.indices,
                            values=point.sparse.values,
                        ),
                    },
                    payload=point.payload,
                )
                for point in batch
            ]
            self._client.upsert(collection_name=self._collection, points=structs)

    def count(self) -> int:
        """Number of points (chunks) currently stored."""
        return self._client.count(collection_name=self._collection, exact=True).count

    # -- query -----------------------------------------------------------------

    def search(
        self,
        *,
        dense_query: list[float],
        sparse_query: SparseVec,
        semantic_weight: float = DEFAULT_SEMANTIC_WEIGHT,
        limit: int = 20,
        filters: dict[str, list[str]] | None = None,
    ) -> list[ProgramHit]:
        """Convex-combination hybrid search, deduped to one hit per programme.

        ``semantic_weight`` (= ``w``) >= 1.0 is pure dense, <= 0.0 pure sparse,
        anything between fuses the two min-max-normalized channels.
        """
        query_filter = self._build_filter(filters)

        if semantic_weight >= 1.0:
            scored = self._dense_scores(dense_query, limit, query_filter)
        elif semantic_weight <= 0.0:
            scored = self._sparse_scores(sparse_query, limit, query_filter)
        else:
            scored = self._fuse(
                dense_query, sparse_query, semantic_weight, limit, query_filter
            )

        return self._dedupe_to_programs(scored, limit)

    # -- query internals -------------------------------------------------------

    def _build_filter(
        self, filters: dict[str, list[str]] | None
    ) -> models.Filter | None:
        """Map {taxonomy_column: [raw values]} to an AND-of-MatchAny Filter.

        Each raw value is normalized through the SAME taxonomy keying used at
        ingest, so a filter on ``funding_location=["Nordrhein-Westfalen"]`` hits
        the stored ``funding_location_keys=["nordrhein_westfalen"]``. Empty value
        lists are skipped; no conditions -> no filter.
        """
        if not filters:
            return None
        conditions: list[models.Condition] = []
        for column, values in filters.items():
            normalized = to_keys(values)
            if not normalized:
                continue
            conditions.append(
                models.FieldCondition(
                    key=f"{column}_keys",
                    match=models.MatchAny(any=normalized),
                )
            )
        if not conditions:
            return None
        return models.Filter(must=conditions)

    def _dense_scores(
        self,
        dense_query: list[float],
        limit: int,
        query_filter: models.Filter | None,
    ) -> dict[str, dict[str, Any]]:
        response = self._client.query_points(
            collection_name=self._collection,
            query=dense_query,
            using=DENSE_VECTOR_NAME,
            query_filter=query_filter,
            limit=limit,
            with_payload=True,
        )
        return {str(p.id): {"score": p.score, "payload": p.payload or {}} for p in response.points}

    def _sparse_scores(
        self,
        sparse_query: SparseVec,
        limit: int,
        query_filter: models.Filter | None,
    ) -> dict[str, dict[str, Any]]:
        response = self._client.query_points(
            collection_name=self._collection,
            query=models.SparseVector(
                indices=sparse_query.indices,
                values=sparse_query.values,
            ),
            using=SPARSE_VECTOR_NAME,
            query_filter=query_filter,
            limit=limit,
            with_payload=True,
        )
        return {str(p.id): {"score": p.score, "payload": p.payload or {}} for p in response.points}

    def _fuse(
        self,
        dense_query: list[float],
        sparse_query: SparseVec,
        weight: float,
        limit: int,
        query_filter: models.Filter | None,
    ) -> dict[str, dict[str, Any]]:
        """Run both channels, min-max normalize each, convex-combine per point."""
        total = max(limit, limit * PREFETCH_LIMIT_MULTIPLIER)
        dense_limit = max(limit, round(total * weight))
        sparse_limit = max(limit, round(total * (1.0 - weight)))

        dense_hits = self._dense_scores(dense_query, dense_limit, query_filter)
        sparse_hits = self._sparse_scores(sparse_query, sparse_limit, query_filter)

        dense_norm = _normalize({pid: h["score"] for pid, h in dense_hits.items()})
        sparse_norm = _normalize({pid: h["score"] for pid, h in sparse_hits.items()})

        fused: dict[str, dict[str, Any]] = {}
        for pid in dense_hits.keys() | sparse_hits.keys():
            score = weight * dense_norm.get(pid, 0.0) + (1.0 - weight) * sparse_norm.get(pid, 0.0)
            payload = (dense_hits.get(pid) or sparse_hits.get(pid))["payload"]  # type: ignore[index]
            fused[pid] = {"score": score, "payload": payload}
        return fused

    def _dedupe_to_programs(
        self, scored: dict[str, dict[str, Any]], limit: int
    ) -> list[ProgramHit]:
        """Collapse chunk hits to one ProgramHit per project_uuid (max score)."""
        best: dict[str, tuple[float, dict[str, Any]]] = {}
        for hit in scored.values():
            payload = hit["payload"]
            project_uuid = str(payload.get("project_uuid", ""))
            score = float(hit["score"])
            current = best.get(project_uuid)
            if current is None or score > current[0]:
                best[project_uuid] = (score, payload)

        ranked = sorted(best.items(), key=lambda kv: kv[1][0], reverse=True)[:limit]
        return [
            self._to_hit(project_uuid, score, payload)
            for project_uuid, (score, payload) in ranked
        ]

    @staticmethod
    def _to_hit(project_uuid: str, score: float, payload: dict[str, Any]) -> ProgramHit:
        def _list(key: str) -> list[str]:
            value = payload.get(key)
            return list(value) if isinstance(value, list) else []

        return ProgramHit(
            uuid=project_uuid,
            title=str(payload.get("title", "")),
            score=score,
            funding_type=_list("funding_type"),
            funding_area=_list("funding_area"),
            funding_location=_list("funding_location"),
            eligible_applicants=_list("eligible_applicants"),
            funding_body=str(payload.get("funding_body", "")),
            url=str(payload.get("url", "")),
            short_description=str(payload.get("short_description", "")),
        )
