// Observability tap: runs the agent and emits action events shaped to the
// OTel action-contract (action.id/tool/status/real/summary), so the UI is
// drop-in compatible with Phil's span emission later. For now the source is
// LangChain streamEvents instead of an OTLP receiver.
import { HumanMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { buildToolset, createNacharbeitsAgent } from "./agent.js";
import { awaitApproval, configureHitl, emitAction, nextActionId } from "./hitl.js";

export type ActionStatus =
  | "awaiting_approval"
  | "executing"
  | "done"
  | "error"
  | "denied"
  | "stub_preview";

export interface ActionEvent {
  id: string; // run_id — correlation key (= action.id)
  tool: string; // action.tool
  status: ActionStatus; // action.status
  real: boolean; // action.real — is this a really-executed side effect?
  summary: string; // action.summary — human line for the checklist
  detail?: string; // tool output, for the side panel
  ts: number;
}

export type StreamMsg =
  | { kind: "run_start"; instruction: string }
  | { kind: "action"; action: ActionEvent }
  | { kind: "answer"; text: string }
  | { kind: "error"; message: string }
  | { kind: "run_end" };

// Tools that perform a real, externally-visible side effect (vs read-only/stub).
const SIDE_EFFECT_TOOLS = new Set(["send_email", "create_calendar_event"]);
const REAL_TOOLS = new Set([
  "send_email",
  "create_calendar_event",
  "list_emails",
  "read_email",
  "list_calendar_events",
]);

// The dynamically-loaded Pipedrive/CRM tools have no static names, so classify by
// verb: read-prefixed names pass through; write-ish names are treated as side
// effects and routed through the HITL gate (so CRM mutations are observed + gated).
const READ_PREFIX = /^(list|read|get|search|find|fetch)/i;
const WRITE_VERB = /(send|create|update|add|delete|remove|post|put|patch|write|note|set)/i;
function isSideEffect(name: string): boolean {
  if (SIDE_EFFECT_TOOLS.has(name)) return true;
  if (READ_PREFIX.test(name)) return false;
  return WRITE_VERB.test(name);
}

function asText(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  // ToolMessage / AIMessage often carry .content
  const c = (v as { content?: unknown }).content;
  if (typeof c === "string") return c;
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

/** Tool args arrive as { input: "<json-string>" } from streamEvents — unwrap + parse. */
function unwrapArgs(input: unknown): Record<string, unknown> {
  let a: unknown = input ?? {};
  if (typeof a === "string") a = tryParse(a);
  if (a && typeof a === "object" && "input" in a) {
    a = (a as { input: unknown }).input;
    if (typeof a === "string") a = tryParse(a);
  }
  return a && typeof a === "object" ? (a as Record<string, unknown>) : {};
}

function tryParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
}

/** Build a short German checklist line from the tool's input args. */
function summarize(tool: string, input: unknown): string {
  const a = unwrapArgs(input);
  switch (tool) {
    case "send_email":
      return `Mail an ${a.to ?? "?"} — „${a.subject ?? ""}"`;
    case "create_calendar_event":
      return `Termin „${a.title ?? ""}" (${a.start ?? "?"})`;
    case "list_calendar_events":
      return "Kalender-Verfügbarkeit geprüft";
    case "list_emails":
      return "Posteingang gelesen";
    case "read_email":
      return `Mail gelesen (UID ${a.uid ?? "?"})`;
    default:
      return tool;
  }
}

function extractFinal(output: unknown): string {
  const msgs = (output as { messages?: unknown[] })?.messages;
  if (Array.isArray(msgs) && msgs.length) {
    return asText(msgs[msgs.length - 1]);
  }
  return asText(output);
}

/**
 * Wrap a side-effect tool with a human approval gate: emit `awaiting_approval`,
 * block until the UI decides, then either execute the real tool or refuse.
 */
function gate(orig: {
  name: string;
  description: string;
  schema: unknown;
  invoke: (args: unknown) => Promise<unknown>;
}) {
  return tool(
    async (args: unknown) => {
      const id = nextActionId(orig.name);
      const summary = summarize(orig.name, args);
      const base = { id, tool: orig.name, real: true, summary };
      emitAction({ ...base, status: "awaiting_approval", ts: Date.now() });
      const decision = await awaitApproval(id);
      if (decision === "denied") {
        emitAction({
          ...base,
          status: "denied",
          real: false,
          summary: `${summary} — vom Nutzer abgelehnt`,
          ts: Date.now(),
        });
        return `Aktion „${orig.name}" wurde vom Nutzer abgelehnt und NICHT ausgeführt.`;
      }
      emitAction({ ...base, status: "executing", ts: Date.now() });
      // Some real tools (send_email via nodemailer) THROW on failure rather than
      // returning an error string — catch so the run doesn't crash and the UI sees
      // a proper error card instead of a silently dead stream.
      let result: unknown;
      try {
        result = await orig.invoke(args);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        emitAction({
          ...base,
          status: "error",
          detail: message.slice(0, 4000),
          ts: Date.now(),
        });
        return `Aktion „${orig.name}" ist fehlgeschlagen: ${message}`;
      }
      const detail = asText(result).slice(0, 4000);
      const errored =
        /konnte nicht (gesendet|angelegt)|fehlgeschlagen|nicht angelegt|HTTP [45]\d\d/i.test(
          detail
        );
      emitAction({
        ...base,
        status: errored ? "error" : "done",
        detail,
        ts: Date.now(),
      });
      return result;
    },
    {
      name: orig.name,
      description: orig.description,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      schema: orig.schema as any,
    }
  );
}

/**
 * Wrap a read-only tool in a thin try/catch that turns a thrown error into a
 * string. A dead CardDAV/CalDAV read (search_contacts, list_calendar_events …)
 * should degrade to a readable message for the LLM — not abort the whole run.
 * Side-effect tools keep their own catch inside `gate` (incl. UI error card).
 */
function resilient(orig: {
  name: string;
  description: string;
  schema: unknown;
  invoke: (args: unknown) => Promise<unknown>;
}) {
  return tool(
    async (args: unknown) => {
      try {
        return await orig.invoke(args);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return `Tool „${orig.name}" ist fehlgeschlagen: ${message}`;
      }
    },
    {
      name: orig.name,
      description: orig.description,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      schema: orig.schema as any,
    }
  );
}

/** The full production toolset, with side-effect tools wrapped in the HITL gate. */
async function gatedTools() {
  const full = await buildToolset();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return full.map((t: any) => (isSideEffect(t.name) ? gate(t) : resilient(t)));
}

/** Run the agent on an instruction, emitting contract-shaped events as it acts. */
export async function runAgentObserved(
  instruction: string,
  emit: (m: StreamMsg) => void,
  opts: { hitl?: boolean } = {}
): Promise<void> {
  emit({ kind: "run_start", instruction });
  // HITL on by default; when off, the gate auto-grants.
  configureHitl({ sink: emit, auto: opts.hitl === false });
  const agent = await createNacharbeitsAgent(await gatedTools());
  let finalText = "";
  try {
    const stream = agent.streamEvents(
      { messages: [new HumanMessage(instruction)] },
      { version: "v2" }
    );
    for await (const ev of stream) {
      const e = ev as {
        event: string;
        name: string;
        run_id: string;
        data?: { input?: unknown; output?: unknown };
      };
      // Side-effect tools are emitted by the gate wrapper — skip the raw stream cards.
      if (
        (e.event === "on_tool_start" || e.event === "on_tool_end") &&
        isSideEffect(e.name)
      ) {
        continue;
      }
      if (e.event === "on_tool_start") {
        emit({
          kind: "action",
          action: {
            id: e.run_id,
            tool: e.name,
            status: "executing",
            real: REAL_TOOLS.has(e.name),
            summary: summarize(e.name, e.data?.input),
            ts: Date.now(),
          },
        });
      } else if (e.event === "on_tool_end") {
        const detail = asText(e.data?.output).slice(0, 4000);
        // Only side-effect tools can "fail" in a way we flag — read tools may
        // legitimately contain error-like words in their content (e.g. bounce mails).
        const errored =
          isSideEffect(e.name) &&
          /konnte nicht (gesendet|angelegt)|fehlgeschlagen|nicht angelegt|HTTP [45]\d\d/i.test(
            detail
          );
        emit({
          kind: "action",
          action: {
            id: e.run_id,
            tool: e.name,
            status: errored ? "error" : "done",
            real: REAL_TOOLS.has(e.name),
            summary: summarize(e.name, e.data?.input),
            detail,
            ts: Date.now(),
          },
        });
      } else if (e.event === "on_chain_end" && e.name === "LangGraph") {
        finalText = extractFinal(e.data?.output);
      }
    }
    emit({ kind: "answer", text: finalText });
  } catch (err) {
    emit({ kind: "error", message: (err as Error).message });
  } finally {
    emit({ kind: "run_end" });
  }
}
