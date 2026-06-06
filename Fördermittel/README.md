# Fördermittel — agentic German funding-programme matching

A self-contained, dockerized service that matches a citizen/company profile
(e.g. *"Dachdämmung, privater Eigentümer, NRW, Bestandsbau"*) to the right German
government funding programmes, exposed behind **one MCP tool** an agent drives
iteratively. Hybrid retrieval: **Qwen3 dense semantics + a hand-written German sparse
encoder** (Snowball stemming + compound/Fugenelement splitting), fused in **Qdrant**;
full programme detail served from **DuckDB**.

This folder is the build workspace. The full build specification for a fresh
agent/subagent session is in **[`BUILD_PROMPT.md`](./BUILD_PROMPT.md)**.

## What it does

- `search_funding(query, filters?, semantic_weight=0.7, limit=20)` → ranked programmes.
- `get_program(uuid)` → full detail (Volltext, legal basis, contact, links, deadlines).
- Optional **Fördermittel-Berater** agent: profile intake → iterative search →
  eligibility check → shortlist with reasons, combinability hints, next steps.

## Where the data comes from (public)

All programme data is **public** and pulled **live, on demand** — nothing is bundled or
committed to the repo.

- **Source:** the [CorrelAid](https://correlaid.org) open dump of the official German
  federal funding database **[foerderdatenbank.de](https://www.foerderdatenbank.de)**,
  which aggregates **KfW + BAFA + all 16 Bundesländer + EU** programmes.
- **Coverage:** ~2.500 active programmes, **refreshed every ~2 days**.
- **License:** **CC BY-ND 3.0 DE** (attribution, no derivatives).
- **Dump URL:** `https://foerderdatenbankdump.fra1.cdn.digitaloceanspaces.com/data/parquet_data.zip`
  (a ZIP containing a single `*.parquet`, 26 columns; the `[]`-typed taxonomy fields are
  the structured match/filter dimensions).

## Pull fresh data

```bash
./fetch_data.sh            # → ./data/funding_raw.parquet
./fetch_data.sh /tmp/out   # custom destination
```

Re-run any time to refresh. `data/` is git-ignored — the dataset is never committed,
always fetched fresh. The ingest pipeline calls this (or the same URL in-code) so a
rebuild always reflects the current public data.

## Stack

- **Embeddings:** Qwen3-Embedding-0.6B via **DeepInfra** (OpenAI-compatible API,
  `DEEPINFRA_TOKEN` from env). Behind a provider interface (TEI/self-hosted is a switch).
- **Vector store:** Qdrant (Docker service; native sparse + `Modifier.IDF`).
- **Detail store:** DuckDB over the fetched parquet (point lookup by uuid).
- **Surface:** FastMCP — stdio locally, streamable-HTTP in Docker.
- **Deploy:** `docker compose up` (qdrant + app), fully self-contained.

## Run it

### Docker (self-contained — the intended path)

```bash
cp docker/.env.example .env          # set DEEPINFRA_TOKEN=...
docker compose -f docker/docker-compose.yml up -d qdrant
# one-shot ingest: fetch/clean -> dense (DeepInfra) + German sparse -> Qdrant + DuckDB
docker compose -f docker/docker-compose.yml run --rm app foerder-ingest
# serve the MCP tool over streamable-HTTP on :8000
docker compose -f docker/docker-compose.yml up -d app
```

`docker compose up` brings up Qdrant + the app; the ingest pulls the data **live**
(`fetch_data.sh`, nothing bundled) and fills ~2.5k programmes. `data/` is git-ignored.

### Local dev (no Docker)

```bash
uv sync
export DEEPINFRA_TOKEN=...            # required for embeddings
uv run foerder-ingest                 # embedded Qdrant (FOERDER_QDRANT_URL unset) + DuckDB
uv run foerder-mcp                    # MCP over stdio (default transport)
uv run python -m eval.run_eval        # Hit@1/@3/@5 + MRR over the gold set
uv run python -m eval.smoke           # 6 demo profiles -> top-5 titles
```

### MCP integration

Two tools: `search_funding(query, filters?, semantic_weight=0.7, limit=20)` →
ranked programmes, and `get_program(uuid)` → full record from DuckDB. Point any MCP
client at the stdio entrypoint (`foerder-mcp`) locally, or the streamable-HTTP endpoint
(`http://localhost:8000`) in Docker.

### Configure (env-overridable, see `foerder/config.py`)

| Variable | Default | Purpose |
|---|---|---|
| `DEEPINFRA_TOKEN` | — | embedding API key (required for ingest/query) |
| `FOERDER_QDRANT_URL` | _(unset → embedded)_ | Qdrant server URL; `http://qdrant:6333` in Docker |
| `FOERDER_EMBEDDING_PROVIDER` | `deepinfra` | swap the embedding backend (provider interface) |
| `FOERDER_EMBEDDING_MODEL` | `Qwen/Qwen3-Embedding-0.6B` | dense model (1024-dim) |
| `FOERDER_SEMANTIC_WEIGHT` | `0.7` | hybrid knob: `1.0` pure dense, `0.0` pure sparse |
| `FOERDER_COLLECTION_NAME` | `foerderprogramme` | Qdrant collection |

Switching the **embedding provider** (e.g. to a self-hosted TEI) is implementing the
`EmbeddingProvider` protocol in `foerder/embedding.py` and routing it through
`get_provider()`. Switching the **vector store** to embedded vs server is just
`FOERDER_QDRANT_URL`.

## Berater agent (LangChain + the MCP tools)

An optional **Fördermittel-Berater** — a Qwen-driven LangChain/LangGraph agent that
consults a citizen by *iteratively* calling the two MCP tools (intake → `search_funding`
over several rounds with `funding_location` = Bundesland **and** "bundesweit" so federal
BEG/KfW/BAFA programmes surface → `get_program` eligibility check → shortlist with reasons,
combinability notes, next steps + links). Orientation, not legal advice.

```bash
uv sync --group agent                                   # langchain + langgraph + mcp adapters
# DASHSCOPE_API_KEY + QWEN_BASE_URL in .env (Qwen, OpenAI-compatible); index must be ingested
uv run foerder-berater "Privatperson in Bayern, Bestand, Gasheizung raus, Wärmepumpe rein, ~30k €"
uv run foerder-berater                                  # interactive REPL
```

It loads the same FastMCP server (`search_funding`/`get_program`) via
`langchain-mcp-adapters` — so the agent talks to the identical tool surface the Docker
stack serves, which is also the seam for a future multi-agent handoff.

## Build it

Hand `BUILD_PROMPT.md` to a fresh agent session. It rebuilds everything from scratch
(no imported code; the reference repo `github.com/trholy/sefuse` is read-only context),
fetches the data live via `fetch_data.sh`, ingests into Qdrant + DuckDB, and serves the
MCP tool. Set `DEEPINFRA_TOKEN` in the environment first.
