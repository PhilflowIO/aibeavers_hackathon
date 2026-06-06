import { parseFaelligkeit } from "./parse-faelligkeit";
import type { CrmContext, CrmExecutionResult, CrmProvider, CrmTaskAction } from "./types";

function normalizeCompanyDomain(companyDomain: string): string {
  return companyDomain
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/.*$/, "")
    .replace(/\.pipedrive\.com$/i, "");
}

export function createPipedriveProvider(
  token: string,
  companyDomain: string,
): CrmProvider {
  const domain = normalizeCompanyDomain(companyDomain);
  const base = `https://${domain}.pipedrive.com/api/v1`;
  const auth = new URLSearchParams({ api_token: token });

  return {
    name: "pipedrive",

    async createTask(
      action: CrmTaskAction,
      ctx: CrmContext,
    ): Promise<CrmExecutionResult> {
      const due = parseFaelligkeit(action.faelligkeit);

      const response = await fetch(`${base}/activities?${auth.toString()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: action.titel,
          type: "task",
          due_date: due,
          due_time: "10:00",
          note: `Kunde: ${ctx.kunde}${ctx.kundeEmail ? ` (${ctx.kundeEmail})` : ""}\nNacharbeits-Agent`,
          done: 0,
        }),
      });

      if (!response.ok) {
        const detail = await response.text();
        return {
          typ: "crm_task",
          status: "error",
          message: `Pipedrive ${response.status}: ${detail.slice(0, 200)}`,
          panel_data: {
            titel: action.titel,
            faelligkeit: due,
            kunde: ctx.kunde,
          },
        };
      }

      const data = (await response.json()) as {
        success?: boolean;
        data?: { id?: number };
      };

      if (!data.success) {
        return {
          typ: "crm_task",
          status: "error",
          message: "Pipedrive hat die Aktivität abgelehnt.",
          panel_data: {
            titel: action.titel,
            faelligkeit: due,
            kunde: ctx.kunde,
          },
        };
      }

      return {
        typ: "crm_task",
        status: "success",
        message: `CRM-Aufgabe in Pipedrive angelegt.`,
        external_id: data.data?.id != null ? String(data.data.id) : undefined,
        panel_data: {
          titel: action.titel,
          faelligkeit: due,
          kunde: ctx.kunde,
          provider: "pipedrive",
        },
      };
    },
  };
}
