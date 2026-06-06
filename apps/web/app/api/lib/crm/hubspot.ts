import { parseFaelligkeit } from "./parse-faelligkeit";
import type { CrmContext, CrmExecutionResult, CrmProvider, CrmTaskAction } from "./types";

function dueTimestamp(faelligkeit: string): number {
  const iso = parseFaelligkeit(faelligkeit);
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    const fallback = new Date();
    fallback.setDate(fallback.getDate() + 7);
    return fallback.getTime();
  }
  d.setHours(17, 0, 0, 0);
  return d.getTime();
}

export function createHubSpotProvider(token: string): CrmProvider {
  return {
    name: "hubspot",

    async createTask(
      action: CrmTaskAction,
      ctx: CrmContext,
    ): Promise<CrmExecutionResult> {
      const body = {
        properties: {
          hs_task_subject: action.titel,
          hs_task_body: `Kunde: ${ctx.kunde}${ctx.kundeEmail ? ` (${ctx.kundeEmail})` : ""}\nAngelegt vom Nacharbeits-Agent.`,
          hs_task_type: "TODO",
          hs_timestamp: String(dueTimestamp(action.faelligkeit)),
        },
      };

      const response = await fetch(
        "https://api.hubapi.com/crm/v3/objects/tasks",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        },
      );

      if (!response.ok) {
        const detail = await response.text();
        return {
          typ: "crm_task",
          status: "error",
          message: `HubSpot ${response.status}: ${detail.slice(0, 200)}`,
          panel_data: {
            titel: action.titel,
            faelligkeit: parseFaelligkeit(action.faelligkeit),
            kunde: ctx.kunde,
          },
        };
      }

      const data = (await response.json()) as { id?: string };
      return {
        typ: "crm_task",
        status: "success",
        message: `CRM-Aufgabe in HubSpot angelegt.`,
        external_id: data.id,
        panel_data: {
          titel: action.titel,
          faelligkeit: parseFaelligkeit(action.faelligkeit),
          kunde: ctx.kunde,
          provider: "hubspot",
        },
      };
    },
  };
}
