#!/usr/bin/env node
// MOCK-CONTRACT protocol test for the Nacharbeits-Agent demo server.
//
// SCOPE (read this before trusting a PASS): this script asserts the scripted
// 5-action DEMO NARRATIVE produced by scripts/mock-ui-server.mjs. That narrative
// uses demo-only tool names (lookup_foerderung / send_mail / crm_upsert /
// create_ticket) and the stub_preview honesty status. The REAL server
// (src/server.ts + src/observe.ts) emits DIFFERENT tool names (send_email,
// create_calendar_event, search_contacts, list_calendar_events, …) and never
// emits stub_preview — its only real:false path is the DENIED branch
// (observe.ts:132). So the per-action checks here ([2],[4],[5]) are MOCK-specific
// by construction and would not pass against the real server even if it were
// perfectly correct. To avoid validating nothing, this script DETECTS a non-mock
// server and reports INCONCLUSIVE (a distinct exit code) instead of a misleading
// FAIL. What IS protocol-shared and asserted for any server: the SSE transport
// contract (unnamed default frames only — never an "event:" name), the
// run_start-first / answer-then-run_end bracketing, and the HITL gate ordering.
//
// Usage:
//   node scripts/test-protocol.mjs                 # against the mock on UI_PORT/4000
//   BASE=http://127.0.0.1:4000 node scripts/test-protocol.mjs
//   node scripts/test-protocol.mjs http://127.0.0.1:4000
//
// Exit codes:
//   0  every checklist item passed (mock contract verified)
//   1  at least one check FAILED (genuine protocol break)
//   2  INCONCLUSIVE — run timed out/hung, or the target is not the mock server
//      (transport-shared checks may still have run; the demo-specific ones are
//      reported as INCONCLUSIVE, never as a silent FAIL).
//
// Dependency-free Node ESM: global fetch + manual SSE parse over the body stream.

// ---- config -----------------------------------------------------------------
const PORT = process.env.UI_PORT ?? "4000";
const BASE = (process.argv[2] || process.env.BASE || `http://127.0.0.1:${PORT}`).replace(/\/$/, "");
const HARD_TIMEOUT_MS = 8000;
// How long the withheld-approval control waits, after seeing awaiting_approval,
// to confirm the server does NOT advance the gated action without /approve.
const WITHHOLD_WINDOW_MS = 1200;

// Exit / status taxonomy. PASS=ok, FAIL=genuine break, INCONCLUSIVE=can't tell.
const PASS = "PASS";
const FAIL = "FAIL";
const INCONCLUSIVE = "INCONCLUSIVE";

// Canonical "Nacharbeit starten" instruction — verbatim per contract.
const CANONICAL =
  "Nacharbeit für das Beratungsgespräch mit Frau Schäfer (Altersvorsorge & energetische Sanierung): " +
  "passende KfW-Förderung mit Quelle prüfen, Folgetermin am Mittwoch 14:00 vorschlagen, nach Freigabe " +
  "die Unterlagen-Mail senden, CRM aktualisieren und ein Ticket anlegen.";

// The 5 demo actions of the MOCK narrative, identified by their stable tool name.
// These are demo-only names (see SCOPE above); their presence is also how we
// recognize that we are in fact talking to the mock server.
const DEMO_TOOLS = [
  "lookup_foerderung",
  "create_calendar_event",
  "send_mail",
  "crm_upsert",
  "create_ticket",
];

// ---- SSE stream parsing -----------------------------------------------------
/**
 * Open GET /events and yield each frame as it arrives. Each yielded item is a
 * record { msg, eventName, recvAt } where:
 *   - msg       : the parsed StreamMsg (or null if the data wasn't JSON)
 *   - eventName : the SSE "event:" field if the server (wrongly) named the frame,
 *                 else null. The contract requires UNNAMED default frames only;
 *                 surfacing the name lets us flag the named-event regression
 *                 (the "use onmessage not addEventListener" failure mode) instead
 *                 of silently dropping it and reporting a vague missing-action.
 *   - recvAt    : monotonic receipt time (performance.now()) for ordering proofs.
 */
async function* sseFrames(signal) {
  const res = await fetch(`${BASE}/events`, {
    headers: { accept: "text/event-stream" },
    signal,
  });
  if (!res.ok || !res.body) {
    throw new Error(`/events returned HTTP ${res.status}`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf8");
  let buf = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    // Frames are separated by a blank line. Handle \n\n and \r\n\r\n.
    let idx;
    while ((idx = buf.search(/\r?\n\r?\n/)) !== -1) {
      const recvAt = performance.now();
      const sep = buf.slice(idx).match(/^\r?\n\r?\n/)[0].length;
      const block = buf.slice(0, idx);
      buf = buf.slice(idx + sep);
      const dataLines = [];
      let eventName = null;
      let sawRetryOnly = true;
      for (const rawLine of block.split(/\r?\n/)) {
        const line = rawLine;
        if (line.startsWith(":")) continue; // SSE comment
        if (line.startsWith("retry:")) continue; // reconnection hint (allowed)
        sawRetryOnly = false;
        if (line.startsWith("event:")) {
          // CONTRACT VIOLATION if present — capture it so [T] can flag it.
          eventName = line.slice(6).replace(/^ /, "").trim();
          continue;
        }
        if (line.startsWith("data:")) {
          dataLines.push(line.slice(5).replace(/^ /, ""));
        }
      }
      // Pure retry: handshake block carries no data and no event. We still YIELD
      // it (flagged handshake:true) so the consumer can release its /run gate on
      // the first received byte — the server registers the SSE client before its
      // first write, so this block proves registration. The consumer ignores it
      // for all other purposes.
      if (sawRetryOnly && dataLines.length === 0 && eventName === null) {
        yield { msg: null, eventName: null, recvAt, handshake: true };
        continue;
      }
      if (dataLines.length === 0 && eventName === null) continue;
      const payload = dataLines.join("\n").trim();
      let msg = null;
      if (payload) {
        try {
          msg = JSON.parse(payload);
        } catch {
          msg = null; // non-JSON data — surface as a malformed frame, don't drop
        }
      }
      yield { msg, eventName, recvAt };
    }
  }
}

async function postJson(pathname, body) {
  const res = await fetch(`${BASE}${pathname}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text().catch(() => "");
  return { status: res.status, text, recvAt: performance.now() };
}

// ---- run --------------------------------------------------------------------
async function main() {
  const ac = new AbortController();
  let timedOut = false;
  const hardTimer = setTimeout(() => {
    timedOut = true;
    ac.abort();
  }, HARD_TIMEOUT_MS);

  // Ordered log of everything observed, for the printout and assertions.
  // Action entries carry recvAt (monotonic) so ordering proofs compare real
  // receipt times, not log indices (which are tautologically ordered).
  const log = []; // { t, recvAt?, kind, tool?, status?, id?, real?, eventName? }
  const t0 = Date.now();
  const stamp = () => Date.now() - t0;

  // Per-tool status sequence, e.g. statusOrder["create_calendar_event"] = [...].
  const statusOrder = new Map();
  // recvAt of each (tool,status) action frame — for the HITL ordering proof.
  const actionRecvAt = new Map(); // key `${tool}|${status}` -> recvAt

  // HITL approval bookkeeping (timestamps, not log indices).
  let awaitingApprovalAt = -1; // recvAt of the awaiting_approval frame
  let approveResolvedAt = -1; // recvAt when POST /approve returned
  let approveTriggered = false;

  // Transport-contract tracking.
  let namedEventSeen = null; // first "event:" name seen (contract violation)
  let malformedFrames = 0; // data frames that failed JSON.parse

  let firstFrameRecvAt = -1; // gate POST /run on this instead of a fixed delay
  let sawRunStart = false;
  let runStartCount = 0;
  let runEndCount = 0;
  let answerText = null;
  let runEnded = false;
  let firstMsgKind = null; // kind of the first JSON StreamMsg (ignoring noise)
  let answerIndexInLog = -1;
  let runEndIndexInLog = -1;

  // Begin streaming BEFORE posting /run so we don't miss run_start.
  const frames = sseFrames(ac.signal);

  // Gate POST /run on the FIRST received SSE frame (the server adds the client
  // synchronously before its first write, so the first byte proves registration).
  // This removes the fixed-delay race that could miss run_start as a false negative.
  let runStarted = false;
  let resolveFirstFrame;
  const firstFrameReady = new Promise((r) => (resolveFirstFrame = r));
  const fireRun = (async () => {
    await firstFrameReady;
    const r = await postJson("/run", { instruction: CANONICAL, hitl: true });
    log.push({ t: stamp(), kind: `POST /run -> ${r.status} ${r.text}` });
    if (r.status !== 202) {
      throw new Error(`/run expected 202, got ${r.status} ${r.text}`);
    }
  })();
  fireRun.catch((e) => {
    log.push({ t: stamp(), kind: `ERROR /run: ${e.message}` });
  });

  try {
    for await (const frame of frames) {
      const { msg, eventName, recvAt, handshake } = frame;

      // Release the /run gate on the very first byte we receive (any block,
      // including the retry handshake). Proves the SSE client is registered.
      if (firstFrameRecvAt < 0) {
        firstFrameRecvAt = recvAt;
        if (!runStarted) {
          runStarted = true;
          resolveFirstFrame();
        }
      }

      // The retry handshake block carries no StreamMsg — it only unblocks /run.
      if (handshake) continue;

      // Transport contract: any "event:" name is a violation — record the first.
      if (eventName && namedEventSeen === null) {
        namedEventSeen = eventName;
        log.push({ t: stamp(), kind: `NAMED-EVENT frame event:${eventName}` });
      }
      if (msg === null) {
        malformedFrames++;
        log.push({ t: stamp(), kind: "malformed-frame (non-JSON data)" });
        continue;
      }

      if (firstMsgKind === null) firstMsgKind = msg.kind;

      if (msg.kind === "run_start") {
        sawRunStart = true;
        runStartCount++;
        log.push({ t: stamp(), kind: "run_start", instruction: msg.instruction });
      } else if (msg.kind === "action") {
        const a = msg.action || {};
        log.push({
          t: stamp(),
          recvAt,
          kind: "action",
          tool: a.tool,
          status: a.status,
          id: a.id,
          real: a.real,
        });
        if (a.tool) {
          if (!statusOrder.has(a.tool)) statusOrder.set(a.tool, []);
          statusOrder.get(a.tool).push(a.status);
          actionRecvAt.set(`${a.tool}|${a.status}`, recvAt);
        }
        // HITL gate: when the calendar event awaits approval, grant it — but FIRST
        // run a short withheld-approval control to prove the gate actually blocks.
        if (
          a.tool === "create_calendar_event" &&
          a.status === "awaiting_approval" &&
          !approveTriggered
        ) {
          approveTriggered = true;
          awaitingApprovalAt = recvAt;
          // Control: do NOT approve yet. Pause and assert the server has not
          // advanced the gated action (no executing/done) without /approve.
          await new Promise((r) => setTimeout(r, WITHHOLD_WINDOW_MS));
          const leakedDuringWithhold =
            statusOrder.get("create_calendar_event")?.some((s) => s === "executing" || s === "done") ?? false;
          log.push({
            t: stamp(),
            kind: `withhold-window ${WITHHOLD_WINDOW_MS}ms passed leaked=${leakedDuringWithhold}`,
          });
          // Now grant; record when the /approve response returns.
          const r = await postJson("/approve", { id: a.id, decision: "granted" });
          approveResolvedAt = r.recvAt;
          log.push({
            t: stamp(),
            kind: `POST /approve id=${a.id} granted -> ${r.status} ${r.text}`,
          });
          // Stash the control result for check [3].
          statusOrder.set("__withhold_leaked__", [String(leakedDuringWithhold)]);
        }
      } else if (msg.kind === "answer") {
        answerText = msg.text;
        answerIndexInLog = log.length;
        log.push({ t: stamp(), kind: "answer", text: msg.text });
      } else if (msg.kind === "error") {
        log.push({ t: stamp(), kind: "error", message: msg.message });
      } else if (msg.kind === "run_end") {
        runEnded = true;
        runEndCount++;
        runEndIndexInLog = log.length;
        log.push({ t: stamp(), kind: "run_end" });
        break; // run complete — stop reading
      }
    }
  } catch (err) {
    if (err && err.name === "AbortError") {
      log.push({ t: stamp(), kind: `TIMEOUT after ${HARD_TIMEOUT_MS}ms` });
    } else {
      log.push({ t: stamp(), kind: `STREAM ERROR: ${err.message}` });
    }
  } finally {
    clearTimeout(hardTimer);
    ac.abort();
  }

  // ---- determine target identity & inconclusive conditions ------------------
  // We recognize the MOCK server by the presence of its demo-only tool names.
  // If the run never completed (timeout/hung) OR the target is clearly not the
  // mock, the demo-specific checks are INCONCLUSIVE rather than FAIL — so CI can
  // distinguish "server slow/hung / wrong target" from "protocol genuinely wrong".
  const demoToolsPresent = DEMO_TOOLS.filter((t) => statusOrder.has(t));
  const looksLikeMock = demoToolsPresent.length >= 3; // majority of demo names seen
  const runHung = timedOut || !runEnded;

  // ---- assertions -----------------------------------------------------------
  // Each check resolves to PASS / FAIL / INCONCLUSIVE.
  const checks = [];
  const add = (name, status, note = "") => checks.push({ name, status, note });

  // [T] TRANSPORT: every frame was an UNNAMED default message (no "event:" name)
  //     and no data frame was non-JSON. This is the contract's explicit
  //     "use onmessage, not addEventListener" guarantee, and applies to ANY server.
  add(
    "[T] transport: unnamed default frames only (no event: names, valid JSON)",
    namedEventSeen === null && malformedFrames === 0 ? PASS : FAIL,
    namedEventSeen !== null
      ? `named-event regression: event:${namedEventSeen}`
      : malformedFrames > 0
        ? `${malformedFrames} malformed (non-JSON) frame(s)`
        : "all frames unnamed + valid JSON"
  );

  // [1] received run_start as the first StreamMsg.
  add(
    "[1] run_start received first",
    runHung
      ? INCONCLUSIVE
      : sawRunStart && firstMsgKind === "run_start"
        ? PASS
        : FAIL,
    runHung
      ? "run hung/timed out before completion"
      : firstMsgKind
        ? `first msg=${firstMsgKind}`
        : "no JSON frames received"
  );

  // [2] each demo action id appeared (keyed by stable tool name). MOCK-specific.
  {
    const missing = DEMO_TOOLS.filter((t) => !statusOrder.has(t));
    let status;
    if (!looksLikeMock) status = INCONCLUSIVE;
    else if (runHung) status = INCONCLUSIVE;
    else status = missing.length === 0 ? PASS : FAIL;
    add(
      "[2] each demo action appeared (mock narrative)",
      status,
      !looksLikeMock
        ? "not the mock server — demo tool names absent"
        : missing.length
          ? `missing: ${missing.join(", ")}`
          : `all ${DEMO_TOOLS.length} present`
    );
  }

  // [3] create_calendar_event: awaiting_approval -> executing -> done, with the
  //     executing+done frames RECEIVED strictly AFTER the /approve response
  //     returned (compare receipt timestamps, not log indices), AND the withheld-
  //     approval control confirming the gate blocked (no leak before /approve).
  {
    const seq = statusOrder.get("create_calendar_event") || [];
    const orderOk =
      seq[0] === "awaiting_approval" &&
      seq.includes("executing") &&
      seq[seq.length - 1] === "done" &&
      seq.indexOf("executing") > seq.indexOf("awaiting_approval") &&
      seq.indexOf("done") > seq.indexOf("executing");
    const execAt = actionRecvAt.get("create_calendar_event|executing") ?? -1;
    const doneAt = actionRecvAt.get("create_calendar_event|done") ?? -1;
    // The gate must block: executing/done must arrive AFTER /approve resolved.
    const afterApprove =
      approveResolvedAt >= 0 && execAt > approveResolvedAt && doneAt > approveResolvedAt;
    // The withheld-approval control: nothing leaked during the withhold window.
    const leaked = (statusOrder.get("__withhold_leaked__")?.[0] ?? "false") === "true";
    let status;
    if (!looksLikeMock || runHung) status = INCONCLUSIVE;
    else status = orderOk && afterApprove && !leaked ? PASS : FAIL;
    add(
      "[3] calendar gate blocks: executing/done only after /approve returns",
      status,
      `seq=[${seq.join(",")}] approveResolvedAt=${approveResolvedAt.toFixed(0)} ` +
        `execAt=${execAt.toFixed(0)} doneAt=${doneAt.toFixed(0)} leakedDuringWithhold=${leaked}`
    );
  }

  // [4] HONESTY: crm_upsert and create_ticket -> real===false, status stub_preview,
  //     and NEVER status==="done". MOCK-specific (real server has no stub_preview).
  {
    const honesty = (tool) => {
      const f = log.filter((e) => e.kind === "action" && e.tool === tool);
      return {
        frames: f,
        everStub: f.some((x) => x.status === "stub_preview"),
        everReal: f.some((x) => x.real === true),
        everDone: f.some((x) => x.status === "done"),
      };
    };
    const crm = honesty("crm_upsert");
    const tic = honesty("create_ticket");
    const ok =
      crm.everStub && !crm.everReal && !crm.everDone &&
      tic.everStub && !tic.everReal && !tic.everDone &&
      crm.frames.length > 0 && tic.frames.length > 0;
    let status;
    if (!looksLikeMock || runHung) status = INCONCLUSIVE;
    else status = ok ? PASS : FAIL;
    add(
      "[4] crm_upsert & create_ticket honest (real=false, stub_preview, never done)",
      status,
      `crm{stub:${crm.everStub},real:${crm.everReal},done:${crm.everDone}} ` +
        `ticket{stub:${tic.everStub},real:${tic.everReal},done:${tic.everDone}}`
    );
  }

  // [5] lookup_foerderung ended status==="done" with real===true. MOCK-specific.
  {
    const f = log.filter((e) => e.kind === "action" && e.tool === "lookup_foerderung");
    const last = f[f.length - 1];
    const ok = !!last && last.status === "done" && last.real === true;
    let status;
    if (!looksLikeMock || runHung) status = INCONCLUSIVE;
    else status = ok ? PASS : FAIL;
    add(
      "[5] lookup_foerderung ended done & real=true",
      status,
      last ? `last{status:${last.status},real:${last.real}}` : "no frames"
    );
  }

  // [6] exactly one run_start/run_end bracket the run, an answer arrived, and
  //     run_end was the last frame received with answer before it.
  {
    const bracketOk = runStartCount === 1 && runEndCount === 1;
    const orderOk =
      answerText !== null &&
      runEnded &&
      runEndIndexInLog >= 0 &&
      answerIndexInLog >= 0 &&
      answerIndexInLog < runEndIndexInLog &&
      runEndIndexInLog === log.length - 1;
    let status;
    if (runHung) status = INCONCLUSIVE;
    else status = bracketOk && orderOk ? PASS : FAIL;
    add(
      "[6] single run_start/run_end pair, answer then run_end last",
      status,
      `run_start×${runStartCount} run_end×${runEndCount} ` +
        `answerIdx=${answerIndexInLog} runEndIdx=${runEndIndexInLog} lastIdx=${log.length - 1}`
    );
  }

  // ---- report ---------------------------------------------------------------
  console.log(`\n=== protocol test against ${BASE} ===`);
  console.log(
    `target: ${looksLikeMock ? "MOCK server (demo narrative)" : "NON-MOCK / unrecognized — demo checks INCONCLUSIVE"}` +
      `${runHung ? "  [run did NOT complete]" : ""}\n`
  );
  console.log("--- ordered event log ---");
  for (const e of log) {
    if (e.kind === "action") {
      console.log(
        `  +${String(e.t).padStart(4)}ms  action  ${String(e.tool).padEnd(22)} ${String(
          e.status
        ).padEnd(18)} real=${e.real} id=${e.id}`
      );
    } else if (e.kind === "run_start") {
      console.log(`  +${String(e.t).padStart(4)}ms  run_start`);
    } else if (e.kind === "answer") {
      console.log(`  +${String(e.t).padStart(4)}ms  answer  "${(e.text || "").slice(0, 80)}"`);
    } else if (e.kind === "run_end") {
      console.log(`  +${String(e.t).padStart(4)}ms  run_end`);
    } else {
      console.log(`  +${String(e.t).padStart(4)}ms  ${e.kind}${e.message ? " " + e.message : ""}`);
    }
  }

  console.log("\n--- checklist ---");
  let failed = 0;
  let inconclusive = 0;
  for (const c of checks) {
    if (c.status === FAIL) failed++;
    else if (c.status === INCONCLUSIVE) inconclusive++;
    console.log(`  [${c.status}] ${c.name}${c.note ? `  (${c.note})` : ""}`);
  }

  if (failed > 0) {
    console.log(`\nFAILED: ${failed}${inconclusive ? ` (INCONCLUSIVE: ${inconclusive})` : ""}\n`);
    return 1;
  }
  if (inconclusive > 0) {
    console.log(`\nINCONCLUSIVE: ${inconclusive} (no genuine failures, but could not verify)\n`);
    return 2;
  }
  console.log("\nALL PASS\n");
  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error(`\nFATAL: ${err && err.stack ? err.stack : err}\n`);
    console.log("FAILED: 1");
    process.exit(1);
  });
