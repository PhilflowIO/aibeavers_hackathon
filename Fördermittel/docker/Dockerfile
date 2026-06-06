# syntax=docker/dockerfile:1
#
# foerder — German funding-programme matcher (ingest + MCP server).
#
# Build context is the Fördermittel project root (see docker-compose.yml:
# context: .., dockerfile: docker/Dockerfile). Lean, uv-managed, no torch:
# embeddings are remote (DeepInfra); only the Qwen tokenizer is pulled at
# runtime into .hf_cache (a mounted volume) the first time ingest runs.
#
# Default CMD serves the MCP server over streamable-HTTP on 0.0.0.0:8000.
# One-shot ingest:  docker compose run --rm app foerder-ingest

FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim

# OS deps: curl + unzip are needed by fetch_data.sh (live dump pull).
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl unzip ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# uv: compile bytecode, copy (not link) from cache — the cache lives on a
# different layer/mount than the venv, so hardlinks would dangle.
ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=never

WORKDIR /app

# --- Dependency layer (cached unless pyproject/lock change) -----------------
# README is referenced by pyproject ([project].readme) and must exist for the
# project build step; copy it alongside the manifests.
COPY pyproject.toml uv.lock README.md ./
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev --no-install-project

# --- Application layer ------------------------------------------------------
COPY foerder/ ./foerder/
COPY fetch_data.sh ./fetch_data.sh
RUN chmod +x ./fetch_data.sh

# Install the project itself (editable-free, into the venv) now that the
# package source is present.
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev

# venv on PATH so the console scripts (foerder-mcp / foerder-ingest) resolve.
ENV PATH="/app/.venv/bin:$PATH"

# Container-side runtime config. Transport is fixed to streamable-HTTP here;
# host/port default to 0.0.0.0:8000 in foerder.config. Qdrant URL + token come
# from compose env_file / environment.
ENV FOERDER_MCP_TRANSPORT=streamable-http \
    HF_HOME=/app/.hf_cache

# Non-root: own the dirs the app writes to (data dump, duckdb, tokenizer cache).
RUN groupadd --system app \
    && useradd --system --gid app --home-dir /app --no-create-home app \
    && mkdir -p /app/data /app/.hf_cache \
    && chown -R app:app /app
USER app

EXPOSE 8000

CMD ["foerder-mcp"]
