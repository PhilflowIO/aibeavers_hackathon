// mock-ui-server.mjs — MOCK rehearsal server for the Nacharbeits-Agent UI.
//
// Speaks the REAL SSE/HTTP protocol of src/server.ts + src/observe.ts so the new
// UI can be demoed WITHOUT any LLM credentials. It scripts a fixed 5-action demo
// narrative with one HITL approval gate.
//
// Protocol (authoritative, mirrored from src/server.ts / src/observe.ts):
//   GET  /         -> web/index.html (read fresh each request), text/html
//   GET  /events   -> text/event-stream; one-time "retry: 2000\n\n"; then frames.
//                     EVERY frame is an UNNAMED default message: "data: <json>\n\n"
//                     (NO "event:" lines — client uses es.onmessage).
//   POST /run      -> { instruction, hitl } : 202 "started" | 409 "agent busy"
//   POST /approve  -> { id, decision } : 200 "ok" | 404 "no pending action"
//
// StreamMsg (discriminated by .kind):
//   { kind:"run_start", instruction }
//   { kind:"action",    action: ActionEvent }
//   { kind:"answer",    text }
//   { kind:"error",     message }
//   { kind:"run_end" }
//
// ActionEvent = { id, tool, status, real, summary, detail?, ts }
//   status ∈ awaiting_approval | executing | done | denied | error | stub_preview
//   ts is a DETERMINISTIC incrementing module-level integer (NOT wall-clock).
//   The mock additively includes source/source_href on the foerderung action to
//   exercise the UI source-proof box (a known backend gap — real server omits it).
//
// No external deps: only node:http, node:fs/promises, node:url, node:path.

import http from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const INDEX_HTML = path.join(ROOT, "web", "index.html");
const PORT = Number(process.env.UI_PORT ?? 4000);
const HOST = "127.0.0.1";

// Headless-testing env toggles.
const MOCK_AUTORUN = process.env.MOCK_AUTORUN === "1";
const RAW_MOCK_AUTOAPPROVE = process.env.MOCK_AUTOAPPROVE;
const MOCK_AUTOAPPROVE =
  RAW_MOCK_AUTOAPPROVE === "1" ? "granted" : RAW_MOCK_AUTOAPPROVE; // "granted" | "denied" | undefined

// Canonical "Nacharbeit starten" instruction (verbatim).
const CANONICAL_INSTRUCTION =
  "Nacharbeit für das Beratungsgespräch mit Frau Schäfer (Altersvorsorge & energetische Sanierung): passende KfW-Förderung mit Quelle prüfen, Folgetermin am Mittwoch 14:00 vorschlagen, nach Freigabe die Unterlagen-Mail senden, CRM aktualisieren und ein Ticket anlegen.";

// Compressed timings (ms) so the rehearsal feels live but quick.
const T = { step: 450, gate: 250, autorun: 250, autoapprove: 400 };

// ---------------------------------------------------------------------------
// SSE plumbing
// ---------------------------------------------------------------------------
const clients = new Set();

/** Broadcast a StreamMsg to all connected SSE clients as an UNNAMED frame. */
function broadcast(obj) {
  const frame = `data: ${JSON.stringify(obj)}\n\n`;
  for (const c of clients) c.write(frame);
}

// Deterministic timestamp counter — NEVER read the wall-clock for ts.
let tsCounter = 0;
function nextTs() {
  return tsCounter++;
}

/** Emit one ActionEvent-shaped frame; `extra` adds UI-only fields (e.g. source). */
function emitAction(action, extra = {}) {
  broadcast({ kind: "action", action: { ...action, ts: nextTs(), ...extra } });
}

// ---------------------------------------------------------------------------
// Run state
// ---------------------------------------------------------------------------
let running = false; // a run is active (between run_start and run_end)
let pending = null; // { id, resolve } for the awaiting-approval HITL gate

/** Read the full request body as a UTF-8 string. */
async function readBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return Buffer.concat(chunks).toString("utf8");
}

/** Parse JSON; never throws — returns {} on malformed input. */
function parseJson(raw) {
  try {
    const v = JSON.parse(raw || "{}");
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Stable action ids (the UI keys its checklist rows on action.id).
const ID = {
  a1: "a1_lookup_foerderung",
  a2: "a2_create_calendar_event",
  a3: "a3_send_mail",
  a4: "a4_crm_upsert",
  a5: "a5_create_ticket",
};

// ---------------------------------------------------------------------------
// Scripted demo sequence
// ---------------------------------------------------------------------------

/**
 * Drive the full demo narrative. Pauses at the a2 HITL gate until /approve
 * (or MOCK_AUTOAPPROVE) resolves it. Clears `running` at run_end.
 */
async function runScript(instruction) {
  try {
    broadcast({ kind: "run_start", instruction });

    // --- a1 lookup_foerderung (real) : executing -> done (+ source proof) ---
    await sleep(T.step);
    emitAction({
      id: ID.a1,
      tool: "lookup_foerderung",
      status: "executing",
      real: true,
      summary: "Förderung wird geprüft …",
    });
    await sleep(T.step);
    emitAction(
      {
        id: ID.a1,
        tool: "lookup_foerderung",
        status: "done",
        real: true,
        summary: "Förderung erkannt: KfW 261 (belegt)",
        detail: "KfW 261 — Wohngebäude (Kredit). Quelle geprüft, Stand 2026-05.",
      },
      {
        // UI-only fields: exercise the source-proof box (known backend gap).
        source: "https://www.kfw.de/…261 (Stand 2026-05)",
        source_href:
          "https://www.kfw.de/inlandsfoerderung/Privatpersonen/Bestehende-Immobilie/Foerderprodukte/Wohngeb%C3%A4ude-Kredit-(261)/",
      }
    );

    // --- a2 create_calendar_event (real) : awaiting_approval -> PAUSE -------
    await sleep(T.step);
    const decision = await new Promise((resolve) => {
      pending = { id: ID.a2, resolve };
      emitAction({
        id: ID.a2,
        tool: "create_calendar_event",
        status: "awaiting_approval",
        real: true,
        summary: "Folgetermin Mi 14:00 — Freigabe erforderlich",
        detail: "Termin „Folgegespräch Frau Schäfer“ am Mittwoch 14:00.",
      });

      // Headless: auto-resolve the gate after a short delay.
      if (MOCK_AUTOAPPROVE === "granted" || MOCK_AUTOAPPROVE === "denied") {
        setTimeout(() => resolveGate(ID.a2, MOCK_AUTOAPPROVE), T.autoapprove);
      }
    });

    // --- a2 resolution -------------------------------------------------------
    if (decision === "granted") {
      await sleep(T.gate);
      emitAction({
        id: ID.a2,
        tool: "create_calendar_event",
        status: "executing",
        real: true,
        summary: "Termin wird angelegt …",
      });
      await sleep(T.step);
      emitAction({
        id: ID.a2,
        tool: "create_calendar_event",
        status: "done",
        real: true,
        summary: "Termin angelegt + Einladung verschickt",
        detail: "Folgegespräch Frau Schäfer — Mittwoch 14:00. Einladung versendet.",
      });
    } else {
      await sleep(T.gate);
      emitAction({
        id: ID.a2,
        tool: "create_calendar_event",
        status: "denied",
        real: false,
        summary: "Termin abgelehnt — vom Nutzer nicht freigegeben",
      });
    }

    // --- a3 send_mail (real) : executing -> done ----------------------------
    await sleep(T.step);
    emitAction({
      id: ID.a3,
      tool: "send_mail",
      status: "executing",
      real: true,
      summary: "Unterlagen-Mail wird gesendet …",
    });
    await sleep(T.step);
    emitAction({
      id: ID.a3,
      tool: "send_mail",
      status: "done",
      real: true,
      summary: "Mail gesendet (landet live)",
      detail: "Unterlagen-Mail an Frau Schäfer versendet.",
    });

    // --- a4 crm_upsert (stub, terminal) -------------------------------------
    await sleep(T.step);
    emitAction({
      id: ID.a4,
      tool: "crm_upsert",
      status: "stub_preview",
      real: false,
      summary: "Kunde aktualisiert (Vorschau · next integration)",
      detail: "CRM-Upsert vorbereitet — Integration folgt.",
    });

    // --- a5 create_ticket (stub, terminal) ----------------------------------
    await sleep(T.step);
    emitAction({
      id: ID.a5,
      tool: "create_ticket",
      status: "stub_preview",
      real: false,
      summary: "Ticket angelegt (Vorschau · next integration)",
      detail: "Ticket vorbereitet — Integration folgt.",
    });

    // --- answer + run_end ----------------------------------------------------
    await sleep(T.step);
    broadcast({
      kind: "answer",
      text: "Nacharbeit abgeschlossen: 3 echte Aktionen ausgeführt, 2 als Vorschau markiert (CRM & Ticket – nächste Integration).",
    });
    await sleep(T.gate);
    broadcast({ kind: "run_end" });
  } catch (err) {
    broadcast({ kind: "error", message: String(err?.message ?? err) });
    broadcast({ kind: "run_end" });
  } finally {
    pending = null;
    running = false; // clear the active-run flag at run_end
  }
}

/** Resolve the pending HITL gate if `id` matches. Returns true on success. */
function resolveGate(id, decision) {
  if (!pending || pending.id !== id) return false;
  const { resolve } = pending;
  pending = null;
  resolve(decision === "denied" ? "denied" : "granted");
  return true;
}

// ---------------------------------------------------------------------------
// HTTP server
// ---------------------------------------------------------------------------
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", `http://${HOST}:${PORT}`);

    // GET / -> UI (read fresh each request)
    if (req.method === "GET" && url.pathname === "/") {
      const html = await readFile(INDEX_HTML, "utf8");
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(html);
      return;
    }

    // GET /events -> SSE stream
    if (req.method === "GET" && url.pathname === "/events") {
      res.writeHead(200, {
        "content-type": "text/event-stream",
        "cache-control": "no-cache",
        connection: "keep-alive",
      });
      res.write("retry: 2000\n\n");
      clients.add(res);
      req.on("close", () => clients.delete(res));

      // Headless: when the FIRST client connects, auto-fire the run.
      if (MOCK_AUTORUN && !running && clients.size === 1) {
        running = true;
        setTimeout(() => runScript(CANONICAL_INSTRUCTION), T.autorun);
      }
      return;
    }

    // POST /run -> start the scripted sequence
    if (req.method === "POST" && url.pathname === "/run") {
      const body = parseJson(await readBody(req));
      const instruction = String(body.instruction ?? "").trim() || CANONICAL_INSTRUCTION;
      if (running) {
        res.writeHead(409).end("agent busy");
        return;
      }
      res.writeHead(202).end("started");
      running = true;
      // Kick off via setTimeout so the 202 flushes before the first frame.
      setTimeout(() => runScript(instruction), 0);
      return;
    }

    // POST /approve -> resolve the HITL gate
    if (req.method === "POST" && url.pathname === "/approve") {
      const body = parseJson(await readBody(req));
      const id = String(body.id ?? "");
      const decision = body.decision === "denied" ? "denied" : "granted";
      const ok = resolveGate(id, decision);
      res.writeHead(ok ? 200 : 404).end(ok ? "ok" : "no pending action");
      return;
    }

    res.writeHead(404).end("not found");
  } catch (err) {
    if (!res.headersSent) res.writeHead(500);
    res.end("internal error");
    broadcast({ kind: "error", message: String(err?.message ?? err) });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`\n🦫  [MOCK] Nacharbeits-Agent UI → http://${HOST}:${PORT}\n`);
});
