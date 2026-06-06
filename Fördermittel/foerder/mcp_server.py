"""FastMCP server surface for the funding-matching backend (Phase 3).

Two tools are exposed:

* ``search_funding`` — hybrid dense+German-sparse retrieval over Qdrant, with
  optional taxonomy filters and a tunable convex ``semantic_weight``.
* ``get_program`` — full programme record by ``uuid`` from the DuckDB detail
  store.

The retrieval *logic* lives in :class:`FundingService`, deliberately separated
from the MCP decoration so it is unit-testable without a running transport.
The service lazily builds its real provider/encoder/store/detail backends on
first use, so constructing ``FundingService()`` (and importing this module)
opens no network or Qdrant connections.
"""

from __future__ import annotations

import argparse
import os
from typing import Any

from fastmcp import FastMCP

from foerder.config import DEFAULT_SEMANTIC_WEIGHT, get_settings
from foerder.detail_store import DetailStore
from foerder.embedding import EmbeddingProvider, get_provider
from foerder.qdrant_store import ProgramHit, QdrantStore
from foerder.sparse import GermanSparseEncoder

#: Default MCP transport when neither env nor CLI overrides it.
DEFAULT_TRANSPORT = "stdio"
#: Env var selecting the transport (``stdio`` locally, ``streamable-http`` in Docker).
TRANSPORT_ENV = "FOERDER_MCP_TRANSPORT"


def _hit_to_dict(hit: ProgramHit) -> dict[str, Any]:
    """Map a :class:`ProgramHit` to the documented JSON-serializable result dict."""
    return {
        "uuid": hit.uuid,
        "title": hit.title,
        "score": hit.score,
        "funding_type": hit.funding_type,
        "funding_area": hit.funding_area,
        "funding_location": hit.funding_location,
        "eligible_applicants": hit.eligible_applicants,
        "funding_body": hit.funding_body,
        "url": hit.url,
        "short_description": hit.short_description,
    }


class FundingService:
    """Retrieval logic behind the MCP tools, decoupled from the transport.

    Backends are injectable for tests; when omitted they are built lazily from
    config on first use so neither construction nor import touches the network
    or opens a Qdrant connection.
    """

    def __init__(
        self,
        *,
        provider: EmbeddingProvider | None = None,
        encoder: GermanSparseEncoder | None = None,
        store: QdrantStore | None = None,
        detail: DetailStore | None = None,
    ) -> None:
        self._provider = provider
        self._encoder = encoder
        self._store = store
        self._detail = detail

    # -- lazy backends ---------------------------------------------------------

    def _get_provider(self) -> EmbeddingProvider:
        if self._provider is None:
            self._provider = get_provider()
        return self._provider

    def _get_encoder(self) -> GermanSparseEncoder:
        if self._encoder is None:
            self._encoder = GermanSparseEncoder()
        return self._encoder

    def _get_store(self) -> QdrantStore:
        if self._store is None:
            self._store = QdrantStore()
        return self._store

    def _get_detail(self) -> DetailStore:
        if self._detail is None:
            self._detail = DetailStore()
        return self._detail

    # -- tool logic ------------------------------------------------------------

    def search_funding(
        self,
        query: str,
        filters: dict[str, list[str]] | None = None,
        semantic_weight: float = DEFAULT_SEMANTIC_WEIGHT,
        limit: int = 20,
    ) -> list[dict[str, Any]]:
        """Hybrid-search funding programmes for a free-text ``query``.

        ``filters`` keys are taxonomy columns (``funding_type``,
        ``funding_area``, ``funding_location``, ``eligible_applicants``), each a
        list of RAW values that the store normalizes. The dense query embedding
        carries the instruct prefix internally (applied by the provider); the
        sparse query is the raw symmetric encoding. Results are deduped to one
        programme per ``uuid`` and sorted by fused score descending.
        """
        dense = self._get_provider().embed_query(query)
        sparse = self._get_encoder().encode(query)
        hits = self._get_store().search(
            dense_query=dense,
            sparse_query=sparse,
            semantic_weight=semantic_weight,
            limit=limit,
            filters=filters,
        )
        return [_hit_to_dict(hit) for hit in hits]

    def get_program(self, uuid: str) -> dict[str, Any] | None:
        """Return the full programme record for ``uuid``, or ``None`` if absent."""
        return self._get_detail().get_program(uuid)


def build_server(service: FundingService | None = None) -> FastMCP:
    """Build the FastMCP server, registering the two tools against ``service``.

    A fresh :class:`FundingService` (lazy backends) is created when none is
    supplied, so importing/building the server opens no connections.
    """
    svc = service if service is not None else FundingService()
    mcp: FastMCP = FastMCP("foerder")

    @mcp.tool(
        name="search_funding",
        description=(
            "Suche passende deutsche Förderprogramme per hybrider "
            "Dense+Sparse-Retrieval. `query` ist Freitext (z.B. ein "
            "Vorhaben oder Profil). `filters` optional, Schlüssel aus "
            "funding_type, funding_area, funding_location, eligible_applicants "
            "mit je einer Liste von Rohwerten (der Store normalisiert sie). "
            "`semantic_weight` gewichtet Dense (1.0) gegen Sparse (0.0). "
            "Liefert eine nach Score absteigend sortierte Trefferliste."
        ),
    )
    def search_funding(
        query: str,
        filters: dict[str, list[str]] | None = None,
        semantic_weight: float = DEFAULT_SEMANTIC_WEIGHT,
        limit: int = 20,
    ) -> list[dict[str, Any]]:
        return svc.search_funding(query, filters, semantic_weight, limit)

    @mcp.tool(
        name="get_program",
        description=(
            "Hole den vollständigen Datensatz eines Förderprogramms anhand "
            "seiner `uuid` (aus den search_funding-Treffern). Gibt das ganze "
            "Programm als Objekt zurück, oder null wenn die uuid unbekannt ist."
        ),
    )
    def get_program(uuid: str) -> dict[str, Any] | None:
        return svc.get_program(uuid)

    return mcp


def _select_transport(cli_transport: str | None) -> str:
    """CLI flag beats env var beats the stdio default."""
    if cli_transport is not None:
        return cli_transport
    return os.environ.get(TRANSPORT_ENV, DEFAULT_TRANSPORT)


def main() -> None:
    """``foerder-mcp`` entrypoint: select transport, then run the server.

    Transport is ``stdio`` by default (local), ``streamable-http`` in Docker.
    Pick it via ``--transport`` (CLI) or the ``FOERDER_MCP_TRANSPORT`` env var;
    HTTP binds to ``settings.mcp_host`` / ``settings.mcp_port``.
    """
    parser = argparse.ArgumentParser(prog="foerder-mcp")
    parser.add_argument(
        "--transport",
        choices=["stdio", "streamable-http"],
        default=None,
        help="MCP transport; overrides FOERDER_MCP_TRANSPORT (default: stdio).",
    )
    args = parser.parse_args()
    transport = _select_transport(args.transport)

    mcp = build_server()

    if transport == "streamable-http":
        settings = get_settings()
        mcp.run(
            transport="streamable-http",
            host=settings.mcp_host,
            port=settings.mcp_port,
        )
    else:
        mcp.run(transport="stdio")


if __name__ == "__main__":
    main()
