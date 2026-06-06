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

export async function loadFoerderTools(): Promise<DynamicStructuredTool[]> {
  if (_tools) return _tools;

  _client = new MultiServerMCPClient({
    foerder: {
      transport: "stdio",
      command: "uv",
      args: ["run", "foerder-mcp", "--transport", "stdio"],
      // cwd ist PFLICHT, damit `uv` das foerder-venv, dessen .env (DEEPINFRA_TOKEN)
      // und den bereits ingestierten Qdrant-Index findet. Env-überschreibbar.
      cwd:
        process.env.FOERDER_PROJECT_DIR ??
        "/home/philflow/Dokumente/AI_Beaver-foerder/Fördermittel",
      env: { ...buildEnv() },
    },
  });

  _tools = await _client.getTools();
  return _tools;
}

export async function closeFoerderClient(): Promise<void> {
  if (_client) {
    await _client.close();
    _client = null;
    _tools = null;
  }
}
