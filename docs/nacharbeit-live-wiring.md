# Nacharbeit Live-UI: Wiring & Protocol

How `web/index.html` talks to the live backend (`src/server.ts` → `src/observe.ts` → `src/hitl.ts`),
the exact SSE/HTTP contract, how to run it against the real agent or a mock, and the
backend gaps that still need closing for full design fidelity.

Grounded in:
- `src/server.ts` — HTTP server: `GET /`, `GET /events` (SSE), `POST /run`, `POST /approve`.
- `src/observe.ts` — `runAgentObserved()`: streams the agent and emits `StreamMsg` frames.
- `src/hitl.ts` — approval bus: `nextActionId()`, `emitAction()`, `awaitApproval()`, `decide()`.

---

## 1) The real protocol contract

### Transport

| Aspect | Value |
|---|---|
| SSE endpoint | `GET /events` → `content-type: text/event-stream` |
| Stream prologue | server writes `retry: 2000\n\n` once, then frames |
| Frame format | **every** frame is the default (unnamed) message: `data: <json>\n\n` |
| Named events | **none** — there is no `event:` line. No `snapshot`, no `ping`, no `action` event name |
| Client read | `es.onmessage = …` (or `addEventListener('message', …)`). **Never** `addEventListener('snapshot'/'action'/'ping')` |
| State model | incremental; a `run_start` resets the client's action list. There is no full-snapshot frame |
| Default port | `4000`, override via `process.env.UI_PORT` (`HOST` defaults to `127.0.0.1`) |

### SSE frames — `StreamMsg`, discriminated by `.kind`

Each `<json>` payload is exactly one of:

| `kind` | Shape | Meaning |
|---|---|---|
| `run_start` | `{ kind:"run_start", instruction:string }` | run begins; **client clears its action list** |
| `action` | `{ kind:"action", action:ActionEvent }` | one action emitted/updated |
| `answer` | `{ kind:"answer", text:string }` | agent's final natural-language answer |
| `error` | `{ kind:"error", message:string }` | run-level error |
| `run_end` | `{ kind:"run_end" }` | run finished (always emitted, even on error) |

### `ActionEvent`

```ts
ActionEvent = {
  id: string,        // correlation key (LangChain run_id, or `${tool}-${n}` for gated tools)
  tool: string,      // tool name, e.g. send_email / create_calendar_event / list_calendar_events
  status: ActionStatus,
  real: boolean,     // true = real, externally-visible side effect; false = stub/preview
  summary: string,   // short German checklist line
  detail?: string,   // tool output for the side panel (truncated to 4000 chars)
  ts: number         // emit timestamp (Date.now() in the real backend)
}

ActionStatus =
  | "awaiting_approval"  // HITL gate open, waiting on /approve
  | "executing"
  | "done"
  | "denied"
  | "error"
  | "stub_preview"       // non-real tool, terminal
```

**The real backend never emits** `source`, `source_href`, `llm_model`, `approval`, or `prompt`.
These are UI-only / optional. The UI must:
- render the source-proof box **only when `action.source` is present**;
- fall back to the constant model line `qwen-7b@eu-vllm` when `llm_model` is absent.

### Lifecycle per status

- **Gated side-effect tools** (`send_email`, `create_calendar_event`, and dynamic write-verb
  Pipedrive tools): `awaiting_approval` → (`/approve` granted) → `executing` → `done`/`error`;
  or (denied) → `denied` (then `real` is flipped to `false` and nothing is executed). The `id`
  is stable across these emits (`nextActionId()` mints it once).
- **Read-only / non-gated tools**: a single `executing` then `done`/`error`, keyed by the
  LangChain `run_id`.
- Side-effect classification (`observe.ts`): `SIDE_EFFECT_TOOLS` ∪ write-verb regex
  `(send|create|update|add|delete|remove|post|put|patch|write|note|set)`, minus read-prefix
  `(list|read|get|search|find|fetch)`.

### HTTP control endpoints

| Method · Path | Body | Responses |
|---|---|---|
| `POST /run` | `{ instruction:string, hitl:boolean }` | `202 "started"` · `400 "bad json"`/`"no instruction"` · `409 "agent busy"` · `401` if `UI_TOKEN` set and `x-ui-token` mismatches |
| `POST /approve` | `{ id:string, decision:"granted"\|"denied" }` | `200 "ok"` · `404 "no pending action"` · `401` (token) |

Notes:
- `hitl` is honored as `false` (auto-approve) **only** when `UI_ALLOW_AUTOAPPROVE=1`; otherwise
  HITL is forced on regardless of the request body. Default is HITL on.
- `/approve` `decision` is normalized: anything other than the literal `"denied"` is treated as
  `"granted"`. The `id` must match the `action.id` of the currently-pending gated action.
- Optional shared secret `UI_TOKEN`: when set, `/run` and `/approve` require header
  `x-ui-token: <token>`.

### Canonical "Nacharbeit starten" instruction (verbatim `/run` instruction)

```
Nacharbeit für das Beratungsgespräch mit Frau Schäfer (Altersvorsorge & energetische Sanierung): passende KfW-Förderung mit Quelle prüfen, Folgetermin am Mittwoch 14:00 vorschlagen, nach Freigabe die Unterlagen-Mail senden, CRM aktualisieren und ein Ticket anlegen.
```

---

## 2) What the rewired `web/index.html` does

The client is wired to the **real** protocol above (replacing the earlier named-event /
`/actions/{id}/approve` design). Its internal state Map is still keyed by `action_id`, so the
SSE adapter maps the wire shape onto that key.

**SSE dispatch — `es.onmessage`, single handler, `.kind` switch:**

```js
es.onmessage = function (ev) {
  var msg = JSON.parse(ev.data);
  markLive();
  switch (msg.kind) {
    case "run_start": resetActions(); /* clear state + order */          break;
    case "action":    upsert(adapt(msg.action)); render();               break;
    case "answer":    showAnswer(msg.text);                              break;
    case "error":     showError(msg.message);                            break;
    case "run_end":   /* unlock start button, settle UI */              break;
  }
};
```

- **No** `addEventListener('snapshot'|'action'|'ping')`. State is incremental; `run_start` is the
  reset boundary (there is no snapshot re-hydrate frame).

**`action.id` → `action_id` adapter:** `adapt()` maps the wire `ActionEvent` into the UI action
object: `action_id = ev.id`, and copies `tool/status/real/summary/detail/ts`. `source`,
`source_href`, and `llm_model` are passed through **only if present** (the real backend omits
them; the mock may add `source`/`source_href` on the Förderung action).

**HITL `/approve {id,decision}`:** the Freigeben/Ablehnen buttons POST the real body:

```js
fetch("/approve", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ id: actionId, decision: "granted" /* or "denied" */ })
});
```

(Path is `/approve`, not `/actions/{id}/approve`; field is `id`, not URL-embedded.)
`grant()` marks `approval="granted"` locally **only** — it never sets `status="executing"` and
never paints a green check. The `awaiting_approval → executing → done` progression arrives solely
from the SSE stream. `deny()` posts `{decision:"denied"}` and is terminal locally.

**Start button `/run {instruction,hitl}`:** posts the canonical instruction and the HITL flag:

```js
fetch("/run", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ instruction: NACHARBEIT_INSTRUCTION, hitl: true })
});
```

On non-2xx (e.g. `409` busy, `400`) it shows the inline `#runHint` — no fabricated stream.

**Answer panel:** the `answer` frame's `text` is rendered into `#answerWrap` / `#answerBody`
(unhidden on first answer). `error` frames surface a readable error card.

**Honesty guard — preserved unchanged:** `resolveVisual()` still early-returns the amber
"Vorschau · nächste Integration" visual for **any** `real !== true` action **before** any status
branch, so a `real:false` action (CRM/Ticket stub) can never reach the green "echt · erledigt"
branch — even if a hostile/buggy frame sets `status:"done"`. The granted-decision green line is
additionally gated on `real===true && status!=="done"`. The source-proof box still renders
`action.source` verbatim ("Quelle · belegt, nicht geraten") **only when present**, and the model
line falls back to `qwen-7b@eu-vllm`. Color is never the sole signal (icon + text + color).

---

## 3) How to run

### Real backend (live side effects)

```bash
pnpm ui            # = tsx src/server.ts  →  http://127.0.0.1:4000
```

Open the URL, click **Nacharbeit starten**. `send_email` / `create_calendar_event` land **live**;
each pauses on the HITL gate until you click Freigeben (or POST `/approve`). Useful env:

| Var | Effect |
|---|---|
| `UI_PORT` | listen port (default `4000`) |
| `UI_HOST` | bind host (default `127.0.0.1`) |
| `UI_TOKEN` | require `x-ui-token` on `/run` + `/approve` |
| `UI_ALLOW_AUTOAPPROVE=1` | allow `hitl:false` (auto-approve) from `/run` |
| `UI_APPROVAL_TIMEOUT_MS` | auto-deny a dangling gate (default `300000`) |

### Mock rehearsal (no real side effects)

A dependency-free mock server replays the canonical 5-action demo over the real wire protocol
(default frames, `.kind` discriminator) so the UI and approval flow can be rehearsed offline:

```bash
node scripts/mock-ui-server.mjs        # serves web/index.html + /events + /run + /approve on :4000
```

Mock env flags:

| Var | Effect |
|---|---|
| `MOCK_AUTORUN=1` | emit the demo run immediately on first `/events` connect (no click needed) |
| `MOCK_AUTOAPPROVE=1` | auto-grant the HITL gate after a short delay (unattended rehearsal) |
| `UI_PORT` | listen port (default `4000`) |

The mock **additively** includes `source` + `source_href` on the `lookup_foerderung` action to
exercise the design's source-proof box (a documented backend gap — see §4). Determinism: the mock
must use a module-level integer for `ActionEvent.ts` (start at `0`, `++` per emit) — **never** the
wall clock — so replays and golden tests are byte-stable.

Protocol conformance check (asserts frame shapes, `.kind` discriminator, `/run` + `/approve`
status codes, the gate lifecycle, ordering):

```bash
node scripts/test-protocol.mjs
```

### Canonical demo narrative (mock + test)

| # | tool | real | status path | summary |
|---|---|---|---|---|
| a1 | `lookup_foerderung` | true | executing → done | „Förderung erkannt: KfW 261 (belegt)" (+`source`/`source_href`) |
| a2 | `create_calendar_event` | true | awaiting_approval → (granted) executing → done / (denied) denied | „Termin angelegt + Einladung verschickt" |
| a3 | `send_mail` | true | executing → done | „Mail gesendet (landet live)" |
| a4 | `crm_upsert` | false | stub_preview (terminal) | „Kunde aktualisiert (Vorschau · next integration)" |
| a5 | `create_ticket` | false | stub_preview (terminal) | „Ticket angelegt (Vorschau · next integration)" |

Then: `{ kind:"answer", text:"Nacharbeit abgeschlossen: 3 echte Aktionen ausgeführt, 2 als Vorschau markiert (CRM & Ticket – nächste Integration)." }` followed by `{ kind:"run_end" }`.

---

## 4) Backend gaps for full design fidelity

These are the deltas between what `observe.ts` emits today and what the design renders. They are
factual gaps, not aspirational features.

### 4a) `ActionEvent` carries no source proof

`observe.ts`'s `ActionEvent` (and the `gate()` / stream-event emit sites) do **not** emit
`source` or `source_href`. The UI's source-proof box ("Quelle · belegt, nicht geraten") therefore
only ever appears in the mock/fallback. The real backend also never emits `llm_model`, so the
model line always falls back to the hardcoded `qwen-7b@eu-vllm`.

### 4b) The demo tool names are narrative, not real

`lookup_foerderung`, `send_mail`, `crm_upsert`, and `create_ticket` are **storytelling labels**, not
tools the agent actually exposes. (`send_mail` is the narrative label for the real `send_email`
tool — the demo's a3 mail action.) The real toolset (`buildToolset()`) is:
`send_email`, `create_calendar_event`, `list_emails`, `read_email`, `list_calendar_events`, plus
**dynamically-loaded Pipedrive/CRM tools** with no static names (classified by verb at runtime).
So in a real run there is no `lookup_foerderung` action to hang a source box on, and CRM is a live
Pipedrive write rather than a `stub_preview`. The UI keys its source-box render on
`a.tool === "lookup_foerderung"`, which never matches real traffic.

### Exact small server-side changes to feed the source box

To make the source-proof box render from real runs (smallest viable change set):

1. **Extend the type** — in `src/observe.ts`, add to `interface ActionEvent`:
   ```ts
   source?: string;       // human-readable provenance, e.g. "KfW 261 (Stand 2026-05)"
   source_href?: string;  // http(s) link to the cited source
   llm_model?: string;    // optional model id; UI falls back to qwen-7b@eu-vllm
   ```
   These are optional, so existing emit sites and the UI's "render only if present" guard stay
   valid.

2. **Populate at the emit sites** — in the `gate()` wrapper and the `on_tool_end` branch of
   `runAgentObserved()`, when the tool result carries provenance, set `source`/`source_href` on
   the emitted action. Concretely, have the Förderung/lookup tool return a structured result
   (e.g. `{ text, source, source_href }`) and, in `asText()`/the emit path, lift `source`/
   `source_href` onto the `ActionEvent` instead of flattening everything into `detail`.

3. **Decide the source-box match key** — either (a) keep the narrative `lookup_foerderung` name by
   giving the real lookup tool that exact `name`, **or** (b) change the UI guard from
   `a.tool === "lookup_foerderung"` to `a.source != null` (preferred: the box appears for **any**
   action that carries a source, which is the honest, tool-agnostic rule).

4. **(Optional) model line** — thread the configured model id into `configureHitl()` / the emit
   path and set `llm_model` per action so the model line reflects reality instead of the constant.

No changes to the SSE framing, `/run`, or `/approve` contracts are required — the additions are
purely additive optional fields on `ActionEvent`.
