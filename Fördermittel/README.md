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

## Build it

Hand `BUILD_PROMPT.md` to a fresh agent session. It rebuilds everything from scratch
(no imported code; the reference repo `github.com/trholy/sefuse` is read-only context),
fetches the data live via `fetch_data.sh`, ingests into Qdrant + DuckDB, and serves the
MCP tool. Set `DEEPINFRA_TOKEN` in the environment first.
