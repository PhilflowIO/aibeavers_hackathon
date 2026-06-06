"""Embedding provider interface + OpenAI-compatible backends + query/doc asymmetry (Spec D).

Providers sit behind a ``Protocol`` so swapping backends is a config switch, not a
rewrite. Two concrete backends ship today, both speaking the OpenAI embeddings API:

* **DeepInfra** (``Qwen/Qwen3-Embedding-0.6B``) — the calibrated default the eval
  gold-set was tuned against. Needs ``DEEPINFRA_TOKEN``.
* **Ollama** (``bge-m3``) — a fully-local, sovereign fallback (no external token,
  no data leaving the box). 1024-dim like the default, so the Qdrant schema is
  unchanged. Selected with ``FOERDER_EMBEDDING_PROVIDER=ollama``.

The query/document asymmetry (Spec D) is baked into code, not left to callers:

* **Documents** are embedded as raw text (contextual-header + chunk), NO prefix.
* **Queries** may be wrapped before embedding. The Qwen instruct model wants
  ``Instruct: <task>\\nQuery: <text>`` (query-side ONLY — prefixing documents would
  poison the index); bge-m3 is trained without query instructions, so its wrapper
  is the identity. The wrapper is therefore a per-backend hook, never a caller knob.

OpenAI-style embedding endpoints return HTTP 422 for the WHOLE batch if any input
string is empty/blank, so empty inputs are defensively replaced with ``"N/A"`` here
too (upstream cleaning also does this).
"""

from __future__ import annotations

from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor
from typing import Protocol, runtime_checkable

import httpx

from foerder.config import INSTRUCT_TASK, NULL_FILL, get_settings


def build_query_text(text: str) -> str:
    """Wrap a query with the Qwen instruct prefix (query-side only)."""
    return f"Instruct: {INSTRUCT_TASK}\nQuery: {text}"


def _identity(text: str) -> str:
    """Default query wrapper — no transform (backends like bge-m3 need no prefix)."""
    return text


def sanitize_input(text: str) -> str:
    """Replace empty/whitespace-only input with NULL_FILL to avoid a 422."""
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


class _OpenAICompatProvider:
    """Shared machinery for any OpenAI-compatible ``/embeddings`` backend.

    Subclasses configure endpoint/model/token and, optionally, the query wrapper.
    Construction never performs network I/O; a missing token is only enforced
    (when ``require_token``) at the first embed call, so imports/tests stay offline.
    """

    def __init__(
        self,
        *,
        endpoint: str,
        model: str,
        token: str,
        batch_size: int,
        concurrency: int,
        require_token: bool,
        query_wrapper: Callable[[str], str] = _identity,
    ) -> None:
        self._endpoint = endpoint
        self._model = model
        self._token = token
        self._batch_size = batch_size
        self._concurrency = concurrency
        self._require_token = require_token
        self._query_wrapper = query_wrapper

    def _ensure_token(self) -> None:
        if self._require_token and not self._token:
            raise RuntimeError(
                "Embedding token is empty. Set the backend's API key in the "
                "environment / .env before making embedding calls."
            )

    def _embed_batch(self, client: httpx.Client, batch: list[str]) -> list[list[float]]:
        """Embed a single batch, returning vectors in the input order."""
        payload = {
            "model": self._model,
            "input": [sanitize_input(t) for t in batch],
            "encoding_format": "float",
        }
        headers = {"Authorization": f"Bearer {self._token}"} if self._token else {}
        resp = client.post(self._endpoint, json=payload, headers=headers)
        resp.raise_for_status()
        data = resp.json()["data"]
        # Sort by reported index to be robust against any reordering.
        ordered = sorted(data, key=lambda d: int(d["index"]))
        return [list(map(float, item["embedding"])) for item in ordered]

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        """Embed documents (no prefix), batched + concurrent, input order preserved."""
        if not texts:
            return []
        self._ensure_token()
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
        """Embed a single query, applying the backend's query wrapper."""
        self._ensure_token()
        wrapped = self._query_wrapper(text)
        with httpx.Client(timeout=httpx.Timeout(120.0)) as client:
            return self._embed_batch(client, [wrapped])[0]


class DeepInfraProvider(_OpenAICompatProvider):
    """OpenAI-compatible embedding client for DeepInfra (the calibrated default).

    Documents embed raw; queries get the Qwen instruct prefix (query-side only).
    """

    def __init__(self) -> None:
        settings = get_settings()
        super().__init__(
            endpoint=settings.embedding_endpoint,
            model=settings.embedding_model,
            token=settings.deepinfra_token,
            batch_size=settings.embedding_batch_size,
            concurrency=settings.embedding_concurrency,
            require_token=True,
            query_wrapper=build_query_text,
        )


class OllamaProvider(_OpenAICompatProvider):
    """Fully-local sovereign backend via Ollama's OpenAI-compatible endpoint.

    Defaults to ``bge-m3`` (multilingual, strong on German, 1024-dim == DENSE_DIM).
    No token, no external network. bge-m3 needs no query instruction, so documents
    and queries are both embedded raw — internally consistent as long as ingest and
    query use this same provider.

    Note: this is NOT the gold-set-calibrated config — bge-m3 != Qwen3-Embedding,
    so re-run the eval after a full re-ingest to recalibrate the numbers.
    """

    def __init__(self) -> None:
        settings = get_settings()
        super().__init__(
            endpoint=settings.ollama_embedding_endpoint,
            model=settings.ollama_embedding_model,
            token="",  # Ollama ignores auth; no Authorization header is sent.
            batch_size=min(settings.embedding_batch_size, 16),
            concurrency=min(settings.embedding_concurrency, 2),  # gentle on local CPU
            require_token=False,
        )


def get_provider() -> EmbeddingProvider:
    """Factory dispatching on the configured embedding provider."""
    provider = get_settings().embedding_provider
    if provider == "deepinfra":
        return DeepInfraProvider()
    if provider == "ollama":
        return OllamaProvider()
    raise ValueError(f"Unknown embedding provider: {provider!r}")
