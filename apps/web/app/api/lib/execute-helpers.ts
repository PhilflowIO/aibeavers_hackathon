import type { Action, PlanStep } from "@aibeavers/shared";

export type ActionExecutionStatus = "success" | "mocked" | "error";

export interface ActionResult {
  typ: Action["typ"];
  status: ActionExecutionStatus;
  message: string;
  external_id?: string;
  panel_data?: Record<string, unknown>;
}

export interface ExecuteActionsResponse {
  results: ActionResult[];
  plan_steps: PlanStep[];
}

/** Parse "+7d" or ISO start into absolute ISO timestamps. */
export function resolveKalenderTimes(
  start: string | undefined,
  dauerMin = 60
): { start: string; end: string } {
  const base = new Date();
  let startDate: Date;

  const relative = /^\+(\d+)d$/i.exec(start ?? "+7d");
  if (relative) {
    startDate = new Date(base);
    startDate.setDate(startDate.getDate() + Number(relative[1]));
    startDate.setHours(10, 0, 0, 0);
  } else if (start) {
    startDate = new Date(start);
    if (Number.isNaN(startDate.getTime())) {
      throw new Error(`Ungültiges Startdatum: ${start}`);
    }
  } else {
    startDate = new Date(base);
    startDate.setDate(startDate.getDate() + 7);
    startDate.setHours(10, 0, 0, 0);
  }

  const endDate = new Date(startDate.getTime() + dauerMin * 60_000);
  return {
    start: startDate.toISOString(),
    end: endDate.toISOString(),
  };
}

export function parseFaelligkeit(faelligkeit: string): string {
  const relative = /^\+(\d+)d$/i.exec(faelligkeit);
  if (relative) {
    const d = new Date();
    d.setDate(d.getDate() + Number(relative[1]));
    return d.toISOString().slice(0, 10);
  }
  return faelligkeit;
}

export function extractIcs(toolOutput: string): string | null {
  const begin = toolOutput.indexOf("ICS_BEGIN");
  const end = toolOutput.indexOf("ICS_END");
  if (begin === -1 || end === -1 || end <= begin) return null;
  return toolOutput.slice(begin + "ICS_BEGIN".length, end).trim();
}

export function mockSuccessResult(action: Action): ActionResult {
  switch (action.typ) {
    case "kalender":
      return {
        typ: "kalender",
        status: "success",
        message: `Termin „${action.titel}" (Mock) vorbereitet.`,
      };
    case "crm_task":
      return {
        typ: "crm_task",
        status: "success",
        message: `CRM-Aufgabe „${action.titel}" (Mock) erstellt.`,
        panel_data: {
          titel: action.titel,
          faelligkeit: parseFaelligkeit(action.faelligkeit),
        },
      };
    case "email_entwurf":
      return {
        typ: "email_entwurf",
        status: "success",
        message: `E-Mail-Entwurf „${action.betreff}" (Mock) bereit.`,
      };
    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}

export function planStepForAction(action: Action, ok: boolean): PlanStep {
  switch (action.typ) {
    case "kalender":
      return {
        schritt: "Folgetermin anlegen",
        status: ok ? "done" : "warn",
      };
    case "crm_task":
      return {
        schritt: "CRM-Aufgabe erstellen",
        status: ok ? "done" : "warn",
      };
    case "email_entwurf":
      return {
        schritt: "E-Mail-Entwurf senden",
        status: ok ? "done" : "warn",
      };
    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}
