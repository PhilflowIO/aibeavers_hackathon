import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import type { DynamicStructuredTool } from "@langchain/core/tools";

let _client: MultiServerMCPClient | null = null;
let _tools: DynamicStructuredTool[] | null = null;

function buildEnv(): Record<string, string> {
  // Filter undefined values from process.env before passing to the child process.
  return Object.fromEntries(
    Object.entries(process.env).filter((e): e is [string, string] => e[1] !== undefined)
  );
}

export async function loadPipedriveTools(): Promise<DynamicStructuredTool[]> {
  if (_tools) return _tools;

  const apiToken = process.env.Pipedrive_API_Key;
  if (!apiToken) throw new Error("[pipedrive] Pipedrive_API_Key fehlt in .env");

  _client = new MultiServerMCPClient({
    pipedrive: {
      transport: "stdio",
      command: "./node_modules/.bin/mcp-pipedrive",
      args: [],
      env: {
        ...buildEnv(),
        PIPEDRIVE_API_TOKEN: apiToken,
        // Alle relevanten Kategorien für den Nacharbeits-Agenten aktivieren.
        PIPEDRIVE_TOOLSETS: "deals,persons,organizations,activities,notes,search,fields,system",
        LOG_LEVEL: "warn",
      },
    },
  });

  _tools = await _client.getTools();
  return _tools;
}

export async function closePipedriveClient(): Promise<void> {
  if (_client) {
    await _client.close();
    _client = null;
    _tools = null;
  }
}
