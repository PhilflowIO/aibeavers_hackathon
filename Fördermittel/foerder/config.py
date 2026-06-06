"""Single source of truth for all configuration and algorithm constants.

Every subsystem imports from here so the contract stays identical across
ingest and query time (the taxonomy keys, the sparse encoder constants, the
embedding asymmetry). Runtime knobs are env-overridable via ``FOERDER_*``;
algorithm constants that must NOT drift between ingest and query are plain
module-level constants, deliberately not env-driven.
"""

from __future__ import annotations

import uuid
from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

# --------------------------------------------------------------------------
# Algorithm constants — MUST be identical at ingest and query time.
# Changing any of these requires a full re-ingest.
# --------------------------------------------------------------------------

# German sparse encoder (Spec A)
BM25_K1: float = 1.2
FUGEN_ELEMENTS: tuple[str, ...] = ("s", "es", "n", "en", "er", "e", "ns", "ens")
MIN_COMPOUND_LENGTH: int = 10
MIN_PART_LENGTH: int = 4
SNOWBALL_LANGUAGE: str = "german"

# Taxonomy normalization (Spec B)
UMLAUT_MAP: dict[str, str] = {"ä": "ae", "ö": "oe", "ü": "ue", "ß": "ss"}
TAXONOMY_COLUMNS: tuple[str, ...] = (
    "funding_type",
    "funding_area",
    "funding_location",
    "eligible_applicants",
)
INVALID_TAXONOMY_VALUES: frozenset[str] = frozenset({"none", "nan", "", "null"})
MIN_TAXONOMY_KEY_LENGTH: int = 3  # keys with len <= 2 are dropped

# Cleaning + UUID (Spec C)
# Deterministic namespace: uuid5(NAMESPACE, id_hash) is stable across re-ingests.
UUID_NAMESPACE: uuid.UUID = uuid.UUID("f0e1d2c3-b4a5-4968-8776-65544332211f")
NULL_FILL: str = "N/A"

# Chunking (Spec C)
CHUNK_MAX_TOKENS: int = 512
CHUNK_OVERLAP_TOKENS: int = 62
ADAPTIVE_CHUNK_THRESHOLD: int = 600  # docs <= this many tokens stay a single chunk
SENTENCE_SNAP_FRACTION: float = 0.75  # snap to a sentence boundary in the trailing 25%

# Embedding asymmetry (Spec D) — Instruct prefix is QUERY-SIDE ONLY.
DENSE_DIM: int = 1024
INSTRUCT_TASK: str = (
    "Given a citizen's funding/renovation profile, retrieve the German "
    "government funding programme that best matches it."
)

# Qdrant (Spec E)
DENSE_VECTOR_NAME: str = "dense"
SPARSE_VECTOR_NAME: str = "sparse"
PREFETCH_LIMIT_MULTIPLIER: int = 5
DEFAULT_SEMANTIC_WEIGHT: float = 0.7

# Payload keys derived from taxonomy columns, e.g. ``funding_type_keys``.
TAXONOMY_KEY_FIELDS: tuple[str, ...] = tuple(f"{c}_keys" for c in TAXONOMY_COLUMNS)


# --------------------------------------------------------------------------
# Runtime settings — env-overridable (prefix FOERDER_, plus DEEPINFRA_TOKEN).
# --------------------------------------------------------------------------


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="FOERDER_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Embedding provider, behind an interface (see foerder.embedding). "deepinfra"
    # is the gold-set-calibrated default; "ollama" is a fully-local sovereign
    # fallback (no external token). Both speak the OpenAI embeddings API.
    embedding_provider: str = "deepinfra"
    embedding_endpoint: str = "https://api.deepinfra.com/v1/openai/embeddings"
    embedding_model: str = "Qwen/Qwen3-Embedding-0.6B"
    embedding_concurrency: int = 4
    embedding_batch_size: int = 64
    # Secret — read from DEEPINFRA_TOKEN (no FOERDER_ prefix), never committed.
    deepinfra_token: str = Field(default="", alias="DEEPINFRA_TOKEN")

    # Qwen LLM for the Berater agent (OpenAI-compatible DashScope endpoint).
    # Secrets/endpoint come from the hackathon sponsor via ENV (no FOERDER_
    # prefix on the alias); the model id is env-overridable via FOERDER_QWEN_MODEL.
    qwen_api_key: str = Field(default="", alias="DASHSCOPE_API_KEY")
    qwen_base_url: str = Field(default="", alias="QWEN_BASE_URL")
    qwen_model: str = "qwen3.7-max"

    # Ollama local-embedding backend (used when embedding_provider == "ollama").
    # bge-m3 is multilingual + 1024-dim, matching DENSE_DIM so the schema is unchanged.
    ollama_embedding_endpoint: str = "http://localhost:11434/v1/embeddings"
    ollama_embedding_model: str = "bge-m3"

    # Tokenizer for chunking (no torch needed). HF id; cached under hf_cache_dir.
    tokenizer_model: str = "Qwen/Qwen3-Embedding-0.6B"
    hf_cache_dir: Path = Path(".hf_cache")

    # Vector store. If qdrant_url is set -> server mode; else embedded local mode
    # at qdrant_path (no-Docker dev fallback).
    qdrant_url: str | None = None
    qdrant_path: Path = Path("data/qdrant_storage")
    collection_name: str = "foerderprogramme"

    # Retrieval knob.
    semantic_weight: float = DEFAULT_SEMANTIC_WEIGHT

    # Paths. raw_parquet is the live/offline dump; clean_parquet + duckdb are
    # written by ingest from the SAME parquet (deterministic uuid -> no sync).
    data_dir: Path = Path("data")
    raw_parquet: Path = Path("data/funding_raw.parquet")
    clean_parquet: Path = Path("data/funding_clean.parquet")
    duckdb_path: Path = Path("data/foerder_detail.duckdb")
    dump_url: str = (
        "https://foerderdatenbankdump.fra1.cdn.digitaloceanspaces.com/data/parquet_data.zip"
    )

    # MCP server.
    mcp_host: str = "0.0.0.0"
    mcp_port: int = 8000


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Lazy, cached settings accessor. Subsystems call this, not the class."""
    return Settings()
