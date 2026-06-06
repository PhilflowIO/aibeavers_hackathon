"""Tests for the FastMCP server surface (foerder.mcp_server).

Runs fully offline:

* a **fake** embedding provider whose ``embed_query`` returns a fixed
  ``DENSE_DIM`` vector (no network, no token),
* a **real** :class:`GermanSparseEncoder`,
* a **real** :class:`QdrantStore` over ``QdrantClient(":memory:")`` populated
  with a handful of hand-built :class:`ChunkPoint`s,
* a **real** :class:`DetailStore` over a tmp parquet written with polars.

No transport is ever started.
"""

from __future__ import annotations

from pathlib import Path

import anyio
import polars as pl
import pytest
from qdrant_client import QdrantClient

from foerder.config import DENSE_DIM
from foerder.embedding import EmbeddingProvider
from foerder.mcp_server import FundingService, _coerce_filters, build_server
from foerder.qdrant_store import ChunkPoint, QdrantStore
from foerder.sparse import GermanSparseEncoder

_ENCODER = GermanSparseEncoder()


class FakeProvider:
    """Embedding provider that returns a fixed dense vector, no network."""

    def __init__(self, vector: list[float]) -> None:
        self._vector = vector

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        return [list(self._vector) for _ in texts]

    def embed_query(self, text: str) -> list[float]:
        return list(self._vector)


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
    location_keys: list[str],
) -> dict[str, object]:
    return {
        "project_uuid": project_uuid,
        "title": title,
        "funding_type": ["Zuschuss"],
        "funding_area": ["Energieeffizienz"],
        "funding_location": ["Bundesweit"],
        "eligible_applicants": ["Privatperson"],
        "funding_type_keys": ["zuschuss"],
        "funding_area_keys": ["energieeffizienz"],
        "funding_location_keys": location_keys,
        "eligible_applicants_keys": ["privatperson"],
        "funding_body": "BAFA",
        "url": f"https://example.test/{project_uuid}",
        "short_description": f"Kurzbeschreibung {title}",
    }


# The fake provider always returns this query vector; it matches DACH best.
_QUERY_VEC = _dense((0, 1.0))


@pytest.fixture
def populated_store() -> QdrantStore:
    """In-memory Qdrant with three programmes, dense+sparse hand-built.

    DACH (dim 0) is the exact dense match for the query vector; SOLAR (dim 1)
    is partial; HEIZ (dim 2) is orthogonal. SOLAR sits in Bayern, the other two
    in Nordrhein-Westfalen — so a location filter can restrict results.
    """
    store = QdrantStore(client=QdrantClient(":memory:"))
    store.recreate_collection()
    store.upsert_chunks(
        [
            ChunkPoint(
                point_id="11111111-1111-1111-1111-111111111101",
                dense=_dense((0, 1.0)),
                sparse=_ENCODER.encode("Dachdämmung Sanierung Dach"),
                payload=_payload("dach", "Dachdämmung", location_keys=["nordrhein_westfalen"]),
            ),
            ChunkPoint(
                point_id="11111111-1111-1111-1111-111111111102",
                dense=_dense((0, 1.0), (1, 1.0)),
                sparse=_ENCODER.encode("Solaranlage Photovoltaik"),
                payload=_payload("solar", "Solaranlage", location_keys=["bayern"]),
            ),
            ChunkPoint(
                point_id="11111111-1111-1111-1111-111111111103",
                dense=_dense((2, 1.0)),
                sparse=_ENCODER.encode("Heizungstausch Wärmepumpe"),
                payload=_payload("heiz", "Heizungstausch", location_keys=["nordrhein_westfalen"]),
            ),
        ]
    )
    return store


@pytest.fixture
def detail_parquet(tmp_path: Path) -> Path:
    """A tmp cleaned-parquet keyed by uuid, written with polars."""
    df = pl.DataFrame(
        {
            "uuid": ["dach", "solar", "heiz"],
            "title": ["Dachdämmung", "Solaranlage", "Heizungstausch"],
            "funding_body": ["BAFA", "KfW", "BAFA"],
            "long_description": [
                "Förderung für die Dämmung des Dachs.",
                "Förderung für Photovoltaik-Anlagen.",
                "Förderung für den Heizungstausch.",
            ],
        }
    )
    path = tmp_path / "funding_clean.parquet"
    df.write_parquet(path)
    return path


@pytest.fixture
def service(populated_store: QdrantStore, detail_parquet: Path) -> FundingService:
    from foerder.detail_store import DetailStore

    provider: EmbeddingProvider = FakeProvider(_QUERY_VEC)
    return FundingService(
        provider=provider,
        encoder=_ENCODER,
        store=populated_store,
        detail=DetailStore(detail_parquet),
    )


_RESULT_KEYS = {
    "uuid",
    "title",
    "score",
    "funding_type",
    "funding_area",
    "funding_location",
    "eligible_applicants",
    "funding_body",
    "url",
    "short_description",
}


def test_search_returns_dicts_sorted_by_score(service: FundingService) -> None:
    results = service.search_funding("Dachdämmung", limit=5)

    assert isinstance(results, list)
    assert results, "expected at least one hit"
    for row in results:
        assert isinstance(row, dict)
        assert _RESULT_KEYS <= row.keys()

    scores = [row["score"] for row in results]
    assert scores == sorted(scores, reverse=True)
    # DACH is the exact dense match for the query vector -> ranks first.
    assert results[0]["uuid"] == "dach"


def test_filter_restricts_results(service: FundingService) -> None:
    # Raw value "Nordrhein-Westfalen" is normalized by the store; SOLAR (Bayern)
    # must be excluded.
    results = service.search_funding(
        "Förderung",
        filters={"funding_location": ["Nordrhein-Westfalen"]},
        limit=10,
    )
    uuids = {row["uuid"] for row in results}
    assert uuids == {"dach", "heiz"}
    assert "solar" not in uuids


def test_get_program_known_and_missing(service: FundingService) -> None:
    record = service.get_program("dach")
    assert record is not None
    assert record["uuid"] == "dach"
    assert record["title"] == "Dachdämmung"
    assert record["long_description"] == "Förderung für die Dämmung des Dachs."

    assert service.get_program("missing") is None


def test_lazy_service_opens_no_connections() -> None:
    """Constructing a default FundingService must not build any backend."""
    svc = FundingService()
    assert svc._provider is None
    assert svc._encoder is None
    assert svc._store is None
    assert svc._detail is None


def test_build_server_registers_tools(service: FundingService) -> None:
    server = build_server(service)
    # list_tools() is async on FastMCP; drive it from a sync test without a
    # pytest async plugin via anyio.run.
    tools = anyio.run(server.list_tools)
    names = {tool.name for tool in tools}
    assert {"search_funding", "get_program"} <= names


def test_build_server_without_service_constructs() -> None:
    """build_server() with no service still constructs (lazy backends)."""
    server = build_server()
    assert server is not None


def test_coerce_filters_passes_through_dict_and_none() -> None:
    assert _coerce_filters(None) is None
    d = {"funding_location": ["Nordrhein-Westfalen", "bundesweit"]}
    assert _coerce_filters(d) is d


def test_coerce_filters_parses_json_string() -> None:
    # Qwen on the DashScope-compat endpoint emits nested args as a JSON string.
    parsed = _coerce_filters('{"funding_location": ["Nordrhein-Westfalen", "bundesweit"]}')
    assert parsed == {"funding_location": ["Nordrhein-Westfalen", "bundesweit"]}


def test_coerce_filters_rejects_non_object() -> None:
    with pytest.raises(ValueError):
        _coerce_filters("not json")
    with pytest.raises(ValueError):
        _coerce_filters("[1, 2, 3]")
