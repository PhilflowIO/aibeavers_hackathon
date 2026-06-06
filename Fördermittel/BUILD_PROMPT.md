# MISSION: Agentisches deutsches Fördermittel-Matching — dockerisiert, from scratch

Du bist der **LEAD-Orchestrator**. Baue mit parallelen Subagents ein agentisches deutsches
Fördermittel-Matching-System **komplett von null**. Endzustand: ein Nutzerprofil
(z.B. „Dachdämmung, privater Eigentümer, NRW, Bestandsbau") → ein MCP-Tool
`search_funding(...)` → gerankte Förderprogramme aus einer Vektor-DB → der Agent verfeinert
iterativ. Plus optional ein „Fördermittel-Berater"-Subagent obendrauf.

**Bauverzeichnis:** dieses Projekt entsteht in `/home/philflow/Dokumente/AI_Beaver/Fördermittel/`.

---

## HARTE REGELN (Hackathon)
- **KEIN vorhandener Code wird importiert oder kopiert.** Das Referenz-Repo unten dient NUR
  zum Verstehen des Ansatzes — jede Zeile selbst schreiben. Diese Datei ist die Spezifikation;
  setze die Algorithmen frisch um.
- **Alles dockerisiert & self-contained:** `docker compose up` bringt den ganzen Stack hoch,
  keine geteilte externe Infra.
- Python, `uv` für Deps, `ruff` + `mypy` clean, Conventional Commits. Root-Cause statt Workarounds.

---

## KONTEXT-QUELLEN (alle hier, nichts fehlt)

1. **Referenz-Repo (lesen, NICHT importieren)** — `https://github.com/trholy/sefuse`
   Das ist das Projekt eines anderen Entwicklers, das einen ähnlichen Ansatz fährt. Klone es
   read-only und studiere VOR ALLEM diese Dateien, um die Algorithmen zu verstehen (dann frisch
   selbst implementieren):
   - `shared/taxonomy_contract.py` → Taxonomie-Normalisierung (Spec B unten)
   - `fastapi/src/utils/qdrant_utils.py` → der deutsche Sparse-Encoder + Qdrant-Hybrid (Spec A, E)
   - `fastapi/src/utils/fastapi_utils.py` → Chunking + Embedding-Pipeline (Spec C, D)
   - `data_processing/src/processing/` → clean→taxonomy→uuid Pipeline (Spec C)
   Ignoriere den Rest (Streamlit, FastAPI-Server-Wrapper, Postgres, Ollama) — Ballast.

2. **Datenquelle (Daten, frei nutzbar)** — CorrelAid-Dump der offiziellen Bundes-Förderdatenbank
   (foerderdatenbank.de; KfW + BAFA + alle Länder + EU), ~2.500 aktive Programme, alle 2 Tage
   frisch, CC BY-ND 3.0 DE.
   - ZIP: `https://foerderdatenbankdump.fra1.cdn.digitaloceanspaces.com/data/parquet_data.zip`
     → enthält `data.parquet`.
   - Schema (26 Spalten, relevant): `id_hash, title, description`(HTML)`, more_info, legal_basis,
     contact_info_*, funding_type[], funding_area[], funding_location[], eligible_applicants[],
     funding_body, url, further_links[], last_updated, on_website_from, deleted`(bool).
     Die `[]`-Felder = kontrolliertes Vokabular = die Match-/Filter-Felder.
   - `description` ist HTML mit Abschnitten `<h3>Kurztext</h3>…<h3>Volltext</h3>…`.

3. **Embeddings → DeepInfra** (OpenAI-kompatibel)
   - Endpoint: `https://api.deepinfra.com/v1/openai/embeddings`
   - Model: `Qwen/Qwen3-Embedding-0.6B` (1024-dim, Apache-2.0, asymmetrisch), `encoding_format: "float"`
   - Auth: `Authorization: Bearer $DEEPINFRA_TOKEN` — Token NUR aus ENV, nie committen.
   - Hinter ein Provider-Interface legen, damit TEI/self-hosted später ein Config-Switch ist.

---

## SCHON ENTSCHIEDEN — NICHT neu aufrollen
1. **Embedding-Modell:** Qwen3-Embedding-0.6B (1024-dim, asymmetrisch). Keine Modell-Recherche.
2. **Vektor-Store:** **Qdrant** — als Docker-Compose-Service (`qdrant/qdrant`, mit Volume).
   Gründe: nativer Sparse-Support, **natives `Modifier.IDF`** (IDF zur Query-Zeit → KEIN
   manuelles IDF-Einbacken nötig), und sauberes Single-Container-Deployment.
   (No-Docker-Dev-Fallback: Qdrant embedded local mode `QdrantClient(path=...)`.)
3. **Hybrid-Retrieval ist das Herz:** dense (Qwen) + **handgeschriebener DEUTSCHER Sparse-Encoder**.
   Den Sparse-Encoder NIEMALS durch ein eingebautes (englisches) BM25 ersetzen — das zerstört
   die Komposita-Logik.
4. **Detail-Store:** DuckDB (embedded) über die bereinigte Parquet, Lookup per UUID.

---

## ALGORITHMEN — SPEZIFIKATION (frisch implementieren, nichts kopieren)

### A. Deutscher Sparse-Encoder (DER Wertkern — eigene Unit-Tests schreiben)
Erzeugt aus Text einen Sparse-Vektor `{uint32-index → float}`:
1. Lowercase, Tokens via Regex `\b\w+\b`, deutsche + englische Stopwords entfernen (`stop-words`).
2. Jeden Token mit Snowball-DE stemmen (`snowballstemmer`, "german").
3. **Komposita-Zerlegung:** für Tokens ≥10 Zeichen Split in zwei Teile an einem Fugenelement
   ∈ `{s, es, n, en, er, e, ns, ens}`; beide Teile ≥4 Zeichen; wähle den ausgewogensten Split
   (min/max-Längenverhältnis am nächsten an 1.0). Stemme beide Teile und füge sie ZUSÄTZLICH
   zum Original-Stem hinzu (Kompositum UND Bestandteile zählen).
4. Term-Frequencies; BM25-Saturation pro Term: `v = tf*(k1+1)/(tf+k1)`, k1=1.2.
5. Token → uint32-Index via stabilem Hash (z.B. `int(md5(token).hexdigest()[:8], 16)`).
   Kollisionen summieren. Output `{index: v}`.
6. **Derselbe Encoder für Dokumente UND Queries** (Sparse ist symmetrisch). IDF macht Qdrant
   nativ via `Modifier.IDF` auf dem Sparse-Feld — NICHT selbst einbacken.

### B. Taxonomie-Normalisierung (verhindert ~15-20% verlorene Regional-Treffer)
Der Dump hat inkonsistente Werte ("schlesig_holstein" vs "Schleswig-Holstein",
"Wohnungsbau & Modernisierung" vs "& -modernisierung").
1. `normalize_key(v)`: strip → lower → Umlaute (ä→ae, ö→oe, ü→ue, ß→ss) → NFKD ohne combining
   chars → `[\s\-&/]+` → `_` → non-word weg → Unterstriche trimmen.
2. Pro Taxonomie-Spalte: Rohwerte nach `normalize_key` gruppieren; je Key kanonischen
   Anzeigenamen wählen (Mixed-Case / mit Leerzeichen bevorzugt). Speichere pro Programm BEIDES:
   kanonische Anzeige (für Rückgabe) und die KEYS (für Filter).

### C. Cleaning + Chunking
1. HTML strippen (`description` → Plaintext); aus den `<h3>`-Abschnitten short/full description
   extrahieren. **Null-Beschreibungen mit "N/A" füllen** (2 Programme haben keine → sonst leerer
   Embed-Input → HTTP 422 für den ganzen Batch).
2. Deterministische UUID pro Programm: `uuid5(fixer-namespace, id_hash)`.
3. Token-basiertes Chunking (Tokenizer via `transformers.AutoTokenizer` für Qwen — braucht kein
   torch): Doc ≤ ~600 Tokens → 1 Chunk; sonst 512-Token-Fenster, 62 Overlap, an Satzgrenze im
   letzten Viertel snappen.
4. Vor JEDEM Chunk Contextual-Header: `"Title: {title}\nFunding area: {funding_area...}\n\n"`.

### D. Embedding-Asymmetrie (als Code-Konstante festnageln)
- **Dokumente:** roh embedden (Header+Chunk), KEIN Prefix.
- **Query:** `"Instruct: {task}\nQuery: {q}"`, englischer Task-String, z.B.
  *"Given a citizen's funding/renovation profile, retrieve the German government funding
  programme that best matches it."* NUR auf der Query-Seite.

### E. Hybrid-Retrieval (Qdrant)
- Collection mit named dense (size 1024, COSINE) + named sparse (`Modifier.IDF`). Ein Point pro
  Chunk. Payload: `project_uuid, title`, kanonische Taxonomie + `*_keys`, `funding_body, url,
  short_description`.
- Suche: dense- und sparse-Query getrennt prefetchen, dann **score-aware Convex Combination**:
  je Quelle min-max-normalisieren, `score = w*dense_norm + (1-w)*sparse_norm`
  (w = `semantic_weight`, default 0.7; w≥1 pure dense, w≤0 pure sparse). Gibt den stufenlosen
  Regler (alternativ Qdrant Query-API DBSF, aber convex ist der Knopf).
- Scalar-Filter: `*_keys`-Felder, MatchAny im Feld (OR), AND über Felder. Filterwerte vorher
  durch `normalize_key` schicken (gleicher Contract wie Ingest).
- Dedupe Chunks → Programm auf `project_uuid` (max score), dann Top-N.

### F. Detail-Store (DuckDB)
- `get_program(uuid)`: DuckDB liest die bereinigte Parquet und gibt den vollen Datensatz zurück
  (Volltext, legal_basis, more_info, Kontakt, further_links, last_updated).
- Vektor-Rows und Detail-Rows entstehen im SELBEN Ingest aus DERSELBEN Parquet, gleicher
  deterministischer `uuid` → kein Sync, keine zweite Live-DB.

---

## DOCKERISIERUNG (alles in einem `docker compose`)
- Service **`qdrant`**: `qdrant/qdrant` Image, persistentes Volume.
- Service **`app`**: unser Image (uv-basiert). Zwei Entrypoints:
  - Ingest (one-shot): lädt Dump → clean/taxonomy/uuid → Chunk+Header → DeepInfra-dense +
    deutscher Sparse → schreibt Qdrant-Collection + baut die DuckDB-Detail-Datei (auf Volume).
    `docker compose run --rm app foerder-ingest`
  - MCP-Server (long-running): **FastMCP über streamable-HTTP-Transport** (Docker → Netzwerk,
    nicht stdio), exponierter Port (z.B. 8000). `docker compose up app` serviert das Tool.
- Env: `DEEPINFRA_TOKEN` (Secret), `QDRANT_URL=http://qdrant:6333`, Pfade. `.env` git-ignored,
  `.env.example` committen.
- App-Image bleibt schlank (kein lokales Embedding-Modell — DeepInfra macht das remote; nur der
  Qwen-Tokenizer für Chunking wird gezogen).
- Lokaler Dev ohne Docker bleibt möglich (Qdrant embedded local-mode + MCP via stdio).

---

## REPO-LAYOUT
```
ingest/      dump→clean→taxonomy→uuid→chunk+header→dense+sparse→Qdrant + DuckDB-Detail
retrieval/   embedding-provider (interface, DeepInfra), german sparse, qdrant store, query-orchestrierung
mcp_server/  FastMCP: search_funding, get_program (stdio lokal / streamable-HTTP in Docker)
eval/        gold-set (~20 Profil→Programm Paare), Hit@k/MRR, smoke
docker/      Dockerfile, docker-compose.yml, .env.example
config       env-overridable (provider, modell, qdrant-url, pfade, semantic_weight)
```

## MCP-OBERFLÄCHE
- `search_funding(query: str, filters?: {funding_type?, funding_area?, funding_location?,
  eligible_applicants?}, semantic_weight: float=0.7, limit: int=20)` → Liste
  `{uuid,title,score,funding_type,funding_location,eligible_applicants,funding_body,url,
  short_description}`.
- `get_program(uuid)` → voller Datensatz aus DuckDB.

---

## SUBAGENT-ORCHESTRIERUNG (du als Lead)
**Phase 1 (parallel, unabhängig):**
- Agent **S „sparse"**: deutscher Sparse-Encoder (A) + Unit-Tests (z.B. „Gebäudesanierung" →
  enthält Stämme von „gebaeude"+„sanierung").
- Agent **T „taxonomy+clean"**: Normalisierung (B) + Cleaning/Chunking/UUID (C).
- Agent **E „embedding"**: Provider-Interface + DeepInfra-Client (D) + Chunking-Glue + Tokenizer.

**Phase 2 (nach 1):**
- Agent **Q „qdrant"**: Store-Layer + Hybrid-Convex-Suche + Filter (E).
- Agent **D „detail"**: DuckDB-Detail-Store (F).

**Phase 3:**
- Agent **I „ingest"**: verdrahtet alles, lädt Dump, baut Index + Detail.
- Agent **M „mcp"**: FastMCP-Server (stdio + streamable-HTTP).
- Agent **O „docker"**: Dockerfile + docker-compose (qdrant + app) + .env.example.

**Phase 4 (Verifikation, READ-ONLY Tool-Surface — nur Read/Grep/Glob/Bash):**
- Agent **V „eval"**: ~20-Paar Gold-Set + Hit@k/MRR + 6 Smoke-Profile, läuft live.
- Agent **R „reviewer" (EVIDENCE-REQUIRED)**: jede Behauptung mit `file:line` + 1-Satz-Beweis.
  Prüft besonders: Sparse bleibt deutsch (kein eingebautes BM25); Query-Prefix NUR query-seitig;
  null-desc abgesichert; Filter-Keys normalisiert; kein importierter Fremdcode. Output
  `{verdict, confidence: 0-100, ambiguities: []}`. Confidence <80 → zweiter Reviewer, anderer Frame.

---

## GOTCHAS (real getroffen — vermeide sie)
- Leerer/null Doc-Text → DeepInfra wirft **HTTP 422 für den ganzen Batch**. `fill_null("")` /
  "N/A" VOR dem Embedden.
- Embedding-Asymmetrie: Instruct-Prefix NIE auf Dokumente.
- Deutscher Sparse bleibt deutsch — niemals durch generisches/englisches BM25 ersetzen.
- Taxonomie-Keys VOR Index UND in Filtern gleich normalisieren, sonst Regional-Misses.
- `deleted == true` Programme rausfiltern.
- In Docker: MCP über **streamable-HTTP**, nicht stdio (stdio = lokaler Subprozess).
- Secrets nur aus ENV.

---

## DEFINITION OF DONE
1. `docker compose up` bringt qdrant + app hoch; Ingest füllt ~2.500 Programme (dense+sparse) +
   DuckDB-Detail. Self-contained, kein externer Server.
2. `search_funding("Dachdämmung NRW privater Eigentümer")` liefert das NRW-Sanierungs-/
   Wärmeschutz-Cluster in den Top-Ergebnissen; „Wärmepumpe Privatperson" → BEG-EM/Heizungs-Cluster;
   „Pflege-WG" → ambulant-betreute-Wohngemeinschaft-Programm.
3. Eval: Hit@1 / Hit@3 / Hit@5 / MRR berichtet (Ziel-Größenordnung Hit@1 ~0.65, MRR ~0.70).
4. `ruff` + `mypy` clean. README: ingesten, `docker compose` nutzen, MCP einbinden, Provider/Store
   wechseln.
5. **Kein importierter Fremdcode** — alles frisch, sefuse nur als Referenz gelesen.

---

## STRETCH: Fördermittel-Berater-Subagent
Persona, die die zwei Tools iterativ fährt: Profil-Intake (Vorhaben, Antragsteller-Rolle, Region/
Bundesland, Objekt Bestand/Neubau, Budget, Förderart) → `search_funding` (mehrere Runden,
`funding_location` = Bundesland UND "bundesweit" zusammen, sonst fehlen Bundesprogramme) →
Eignung an echten Konditionen via `get_program` prüfen → Shortlist mit Begründung, Kumulierungs-
Hinweisen, nächsten Schritten + Link. Region ernst nehmen, NICHTS erfinden, „Orientierung, keine
Rechtsberatung".

---

**START:** Referenz-Repo klonen & die genannten Dateien lesen → Phase-1-Agents spawnen →
verdrahten → dockerisieren → verifizieren. Erst Spec + Referenz lesen, dann bauen.
