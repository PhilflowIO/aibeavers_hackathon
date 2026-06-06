import { createHubSpotProvider } from "./hubspot";
import { parseFaelligkeit } from "./parse-faelligkeit";
import { createPipedriveProvider } from "./pipedrive";
import type { CrmContext, CrmExecutionResult, CrmTaskAction } from "./types";

export type { CrmContext, CrmExecutionResult } from "./types";

type CrmProviderName = "mock" | "hubspot" | "pipedrive";

function getCrmProvider(): CrmProviderName {
  const raw = process.env.CRM_PROVIDER?.toLowerCase();
  if (raw === "hubspot" || raw === "pipedrive" || raw === "mock") {
    return raw;
  }
  return "mock";
}

function mockResult(
  action: CrmTaskAction,
  ctx: CrmContext,
): CrmExecutionResult {
  return {
    typ: "crm_task",
    status: "mocked",
    message:
      "CRM-Sandbox nicht angebunden — Panel zeigt geplanten Eintrag.",
    panel_data: {
      titel: action.titel,
      faelligkeit: parseFaelligkeit(action.faelligkeit),
      kunde: ctx.kunde,
      provider: "mock",
    },
  };
}

export async function executeCrmTask(
  action: CrmTaskAction,
  ctx: CrmContext,
): Promise<CrmExecutionResult> {
  try {
    const provider = getCrmProvider();

    if (provider === "mock") {
      return mockResult(action, ctx);
    }

    if (provider === "hubspot") {
      const token = process.env.HUBSPOT_ACCESS_TOKEN?.trim();
      if (!token) return mockResult(action, ctx);
      return await createHubSpotProvider(token).createTask(action, ctx);
    }

    if (provider === "pipedrive") {
      const token = process.env.PIPEDRIVE_API_TOKEN?.trim();
      const domain = process.env.PIPEDRIVE_COMPANY_DOMAIN?.trim();
      if (!token || !domain) return mockResult(action, ctx);
      return await createPipedriveProvider(token, domain).createTask(
        action,
        ctx,
      );
    }

    return mockResult(action, ctx);
  } catch (err) {
    return {
      typ: "crm_task",
      status: "error",
      message: err instanceof Error ? err.message : String(err),
      panel_data: {
        titel: action.titel,
        faelligkeit: parseFaelligkeit(action.faelligkeit),
        kunde: ctx.kunde,
      },
    };
  }
}
