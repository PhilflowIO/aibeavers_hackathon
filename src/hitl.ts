// Human-in-the-loop approval bus. Side-effect tools call awaitApproval() and
// block until the UI POSTs a decision to /approve (or auto-grant if HITL off).
// Mirrors the OTel contract: status `awaiting_approval`, events approval.granted/denied.
import type { ActionEvent, StreamMsg } from "./observe.js";

export type Decision = "granted" | "denied";

let sink: ((m: StreamMsg) => void) | null = null;
let autoApprove = false;
let counter = 0;
const pending = new Map<string, (d: Decision) => void>();

// Safety net: if the user never decides, auto-deny after this long so the run
// completes (server `running` flag clears, UI unblocks) instead of hanging forever.
const APPROVAL_TIMEOUT_MS = Number(process.env.UI_APPROVAL_TIMEOUT_MS ?? 300_000);

/** Called at the start of each run to point approvals at the live SSE broadcast. */
export function configureHitl(opts: {
  sink: (m: StreamMsg) => void;
  auto: boolean;
}): void {
  sink = opts.sink;
  autoApprove = opts.auto;
  // Reject anything left dangling from a previous run.
  for (const r of pending.values()) r("denied");
  pending.clear();
}

export function nextActionId(tool: string): string {
  counter += 1;
  return `${tool}-${counter}`;
}

export function emitAction(a: ActionEvent): void {
  sink?.({ kind: "action", action: a });
}

/** Resolve a pending approval from the /approve endpoint. */
export function decide(id: string, decision: Decision): boolean {
  const r = pending.get(id);
  if (!r) return false;
  pending.delete(id);
  r(decision);
  return true;
}

/** Block until the UI decides (or grant immediately when HITL is off). */
export function awaitApproval(id: string): Promise<Decision> {
  if (autoApprove) return Promise.resolve("granted");
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      if (pending.delete(id)) resolve("denied"); // abandoned → deny, unblock the run
    }, APPROVAL_TIMEOUT_MS);
    if (typeof timer.unref === "function") timer.unref();
    pending.set(id, (d) => {
      clearTimeout(timer);
      resolve(d);
    });
  });
}
