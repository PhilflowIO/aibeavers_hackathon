"""Embedding provider interface + DeepInfra client + query/doc asymmetry (Spec D).

The provider is behind a ``Protocol`` so swapping DeepInfra for a self-hosted
TEI endpoint is a config switch, not a rewrite.

The critical asymmetry is baked into code, not left to callers:

* **Documents** are embedded as their raw text (contextual-header + chunk) with
  NO prefix.
* **Queries** are wrapped as ``Instruct: <task>\\nQuery: <text>`` before
  embedding. The instruct prefix is QUERY-SIDE ONLY — putting it on documents
  would poison the index.

DeepInfra returns HTTP 422 for the WHOLE batch if any input string is
empty/blank, so empty inputs are defensively replaced with ``"N/A"`` here too
(upstream cleaning also does this).
"""

from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from typing import Protocol, runtime_checkable

import httpx

from foerder.config import INSTRUCT_TASK, NULL_FILL, get_settings


def build_query_text(text: str) -> str:
    """Wrap a query with the instruct prefix (query-side only)."""
    return f"Instruct: {INSTRUCT_TASK}\nQuery: {text}"


def sanitize_input(text: str) -> str:
    """Replace empty/whitespace-only input with NULL_FILL to avoid DeepInfra 422."""
    return text if text.strip() else NULL_FILL


def _batched(items: list[str], size: int) -> list[list[str]]:
    """Split ``items`` into consecutive batches of at most ``size``."""
    if size < 1:
        size = 1
    return [items[i : i + size] for i in range(0, len(items), size)]


@runtime_checkable
class EmbeddingProvider(Protocol):
    """Interface for dense embedding backends."""

    def embed_documents(self, texts: list[str]) -> list[list[float]]: ...

    def embed_query(self, text: str) -> list[float]: ...


class DeepInfraProvider:
    """OpenAI-compatible embedding client for the DeepInfra endpoint.

    Construction never requires a token (so imports/tests work offline); the
    token is validated only when an embed call actually hits the network.
    """

    def __init__(self) -> None:
        settings = get_settings()
        self._endpoint = settings.embedding_endpoint
        self._model = settings.embedding_model
        self._token = settings.deepinfra_token
        self._batch_size = settings.embedding_batch_size
        self._concurrency = settings.embedding_concurrency

    def _require_token(self) -> str:
        if not self._token:
            raise RuntimeError(
                "DEEPINFRA_TOKEN is empty. Set it in the environment / .env before "
                "making embedding calls."
            )
        return self._token

    def _embed_batch(self, client: httpx.Client, batch: list[str]) -> list[list[float]]:
        """Embed a single batch, returning vectors in the input order."""
        payload = {
            "model": self._model,
            "input": [sanitize_input(t) for t in batch],
            "encoding_format": "float",
        }
        resp = client.post(
            self._endpoint,
            json=payload,
            headers={"Authorization": f"Bearer {self._token}"},
        )
        resp.raise_for_status()
        data = resp.json()["data"]
        # Sort by reported index to be robust against any reordering.
        ordered = sorted(data, key=lambda d: int(d["index"]))
        return [list(map(float, item["embedding"])) for item in ordered]

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        """Embed documents (no prefix), batched + concurrent, input order preserved."""
        if not texts:
            return []
        self._require_token()
        batches = _batched(texts, self._batch_size)
        results: list[list[list[float]]] = [[] for _ in batches]
        with httpx.Client(timeout=httpx.Timeout(120.0)) as client:
            with ThreadPoolExecutor(max_workers=max(1, self._concurrency)) as pool:
                futures = {
                    pool.submit(self._embed_batch, client, batch): idx
                    for idx, batch in enumerate(batches)
                }
                for future in futures:
                    idx = futures[future]
                    results[idx] = future.result()
        # Flatten in original batch order.
        return [vec for batch_vecs in results for vec in batch_vecs]

    def embed_query(self, text: str) -> list[float]:
        """Embed a single query, applying the instruct wrapper (query-side only)."""
        self._require_token()
        wrapped = build_query_text(text)
        with httpx.Client(timeout=httpx.Timeout(120.0)) as client:
            return self._embed_batch(client, [wrapped])[0]


def get_provider() -> EmbeddingProvider:
    """Factory dispatching on the configured embedding provider."""
    settings = get_settings()
    provider = settings.embedding_provider
    if provider == "deepinfra":
        return DeepInfraProvider()
    raise ValueError(f"Unknown embedding provider: {provider!r}")
