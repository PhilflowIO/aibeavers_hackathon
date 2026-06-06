import { actionSchema, type Action } from "@aibeavers/shared";
import { NextResponse } from "next/server";
import { z } from "zod";
import { allowLiveActionExecution, useMockAnalysis } from "../lib/env";
import { executeCrmTask } from "../lib/crm";
import {
  extractIcs,
  mockSuccessResult,
  planStepForAction,
  resolveKalenderTimes,
  type ActionResult,
  type ExecuteActionsResponse,
} from "../lib/execute-helpers";

const requestSchema = z.object({
  kunde: z.string(),
  kunde_email: z.string().email().optional(),
  actions: z.array(actionSchema),
  execution_token: z.string().optional(),
});

const DEMO_EXECUTION_TOKEN = "berger-demo-actions";
const DEMO_KUNDE = "Thomas Berger";
const DEMO_KUNDE_EMAIL = "thomas.berger@example.com";

function isAllowedLiveDemoRequest(
  kunde: string,
  kundeEmail: string | undefined,
  actions: Action[],
  token: string | undefined,
): boolean {
  if (token !== DEMO_EXECUTION_TOKEN) return false;
  if (kunde !== DEMO_KUNDE) return false;
  if (kundeEmail !== DEMO_KUNDE_EMAIL) return false;
  if (actions.length === 0 || actions.length > 2) return false;

  return actions.every((action) => {
    if (action.typ === "kalender") {
      return (
        action.titel === "Folgetermin Berger — Wohn-Riester + ESG nachholen" &&
        action.start === "+7d" &&
        (action.dauer_min ?? 60) === 60
      );
    }
    if (action.typ === "email_entwurf") {
      return (
        action.betreff === "Unterlagen Riester-Rente + Terminbestätigung" &&
        action.empfaenger === DEMO_KUNDE_EMAIL
      );
    }
    if (action.typ === "crm_task") {
      return (
        action.titel === "Folgetermin Berger — Wohn-Riester + ESG nachholen" &&
        action.faelligkeit === "+7d"
      );
    }
    return false;
  });
}

async function executeKalenderLive(
  action: Extract<Action, { typ: "kalender" }>,
  kunde: string,
  kundeEmail?: string
): Promise<ActionResult> {
  const { createEventTool } = await import(
    "../../../../../src/tools/calendar.js"
  );
  const { sendEmailTool } = await import("../../../../../src/tools/email.js");

  const { start, end } = resolveKalenderTimes(
    action.start,
    action.dauer_min ?? 60
  );
  const email = kundeEmail ?? "berger@example.de";

  const calResult = await createEventTool.invoke({
    title: action.titel,
    start,
    end,
    description: `Folgetermin mit ${kunde}`,
    attendees: [{ name: kunde, email }],
  });

  const calText = String(calResult);
  if (calText.includes("konnte nicht angelegt")) {
    return {
      typ: "kalender",
      status: "error",
      message: calText,
    };
  }

  const ics = extractIcs(calText);
  if (!ics) {
    return {
      typ: "kalender",
      status: "error",
      message: "Termin angelegt, aber ICS konnte nicht extrahiert werden.",
    };
  }

  const mailResult = await sendEmailTool.invoke({
    to: email,
    subject: `Einladung: ${action.titel}`,
    body: `Guten Tag ${kunde},\n\nanbei die Kalendereinladung für unseren Folgetermin.\n\nFreundliche Grüße`,
    icalEvent: ics,
  });

  return {
    typ: "kalender",
    status: "success",
    message: String(mailResult),
    external_id: /Message-ID:\s*(\S+)/.exec(String(mailResult))?.[1],
  };
}

async function executeActionLive(
  action: Action,
  kunde: string,
  kundeEmail?: string
): Promise<ActionResult> {
  try {
    switch (action.typ) {
      case "kalender":
        return await executeKalenderLive(action, kunde, kundeEmail);

      case "crm_task":
        return await executeCrmTask(action, {
          kunde,
          kundeEmail: kundeEmail,
        });

      case "email_entwurf": {
        const { sendEmailTool } = await import(
          "../../../../../src/tools/email.js"
        );
        const to = action.empfaenger ?? kundeEmail ?? "berger@example.de";
        const mailResult = await sendEmailTool.invoke({
          to,
          subject: action.betreff,
          body: `Entwurf für ${kunde}`,
        });
        return {
          typ: "email_entwurf",
          status: "success",
          message: String(mailResult),
        };
      }
      default: {
        const _exhaustive: never = action;
        return _exhaustive;
      }
    }
  } catch (err) {
    return {
      typ: action.typ,
      status: "error",
      message: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function POST(request: Request) {
  try {
    const parsed = requestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.message },
        { status: 400 }
      );
    }

    const { kunde, kunde_email, actions, execution_token } = parsed.data;
    const results: ActionResult[] = [];
    const plan_steps: ExecuteActionsResponse["plan_steps"] = [];
    const liveActionsEnabled =
      allowLiveActionExecution() &&
      isAllowedLiveDemoRequest(kunde, kunde_email, actions, execution_token);

    for (const action of actions) {
      if (!liveActionsEnabled || (useMockAnalysis() && action.typ !== "crm_task")) {
        const result = mockSuccessResult(action);
        results.push(result);
        plan_steps.push(planStepForAction(action, true));
        continue;
      }

      const result = await executeActionLive(action, kunde, kunde_email);
      results.push(result);
      plan_steps.push(
        planStepForAction(action, result.status === "success" || result.status === "mocked")
      );
    }

    return NextResponse.json({ results, plan_steps } satisfies ExecuteActionsResponse);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
