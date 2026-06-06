import { createHubSpotProvider } from "./hubspot";
import { parseFaelligkeit } from "./parse-faelligkeit";
import { createPipedriveProvider } from "./pipedrive";
import type { CrmContext, CrmExecutionResult, CrmTaskAction } from "./types";

export type { CrmContext, CrmExecutionResult } from "./types";

type CrmProviderName = "mock" | "hubspot" | "pipedrive";

function getPipedriveToken(): string {
  return (
    process.env.PIPEDRIVE_API_TOKEN?.trim() ||
    process.env.Pipedrive_API_Key?.trim() ||
    ""
  );
}

function getPipedriveCompanyDomain(): string {
  return (
    process.env.PIPEDRIVE_COMPANY_DOMAIN?.trim() ||
    process.env.Pipedrive_Company_Domain?.trim() ||
    ""
  );
}

function getCrmProvider(): CrmProviderName {
  const raw = process.env.CRM_PROVIDER?.toLowerCase();
  if (raw === "hubspot" || raw === "pipedrive" || raw === "mock") {
    return raw;
  }
  // Phil's agent uses Pipedrive_API_Key — auto-enable when token is present.
  if (getPipedriveToken()) return "pipedrive";
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
      const token = getPipedriveToken();
      const domain = getPipedriveCompanyDomain();
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
