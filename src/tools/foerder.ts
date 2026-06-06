import path from "node:path";
import { fileURLToPath } from "node:url";
import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import type { DynamicStructuredTool } from "@langchain/core/tools";

let _client: MultiServerMCPClient | null = null;
let _tools: DynamicStructuredTool[] | null = null;

// Default cwd for the foerder-mcp child = the repo's own Fördermittel/ project
// (this module lives at <repo>/src/tools/foerder.ts). Resolving it relative to the
// module means a fresh clone works without setting FOERDER_PROJECT_DIR; the env var
// still overrides for non-standard layouts.
const DEFAULT_FOERDER_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../Fördermittel"
);

function buildEnv(): Record<string, string> {
  // Filter undefined values from process.env before passing to the child process.
  return Object.fromEntries(
    Object.entries(process.env).filter((e): e is [string, string] => e[1] !== undefined)
  );
}

export async function loadFoerderTools(): Promise<DynamicStructuredTool[]> {
  if (_tools) return _tools;

  try {
    _client = new MultiServerMCPClient({
      foerder: {
        transport: "stdio",
        command: "uv",
        args: ["run", "foerder-mcp", "--transport", "stdio"],
        // cwd ist PFLICHT, damit `uv` das foerder-venv, dessen .env (DEEPINFRA_TOKEN)
        // und den ingestierten Qdrant-Index findet. Env-überschreibbar.
        cwd: process.env.FOERDER_PROJECT_DIR ?? DEFAULT_FOERDER_DIR,
        env: { ...buildEnv() },
      },
    });

    _tools = await _client.getTools();
    return _tools;
  } catch (err) {
    // Graceful degradation: a missing/unreachable Fördermittel-MCP (no `uv`, wrong
    // FOERDER_PROJECT_DIR, un-ingested Qdrant index, missing DEEPINFRA_TOKEN) must
    // NEVER take down the whole agent — mail/calendar/CRM have to keep working.
    console.warn(
      `[foerder] Fördermittel-Tools nicht verfügbar, Agent läuft ohne sie: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
    if (_client) {
      try {
        await _client.close();
      } catch {
        /* ignore teardown errors during failure cleanup */
      }
    }
    _client = null;
    _tools = []; // cache empty so we don't retry the slow spawn on every build
    return _tools;
  }
}

export async function closeFoerderClient(): Promise<void> {
  if (_client) {
    await _client.close();
    _client = null;
    _tools = null;
  }
}
