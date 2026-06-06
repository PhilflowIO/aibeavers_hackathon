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

  try {
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

    // Promise.race-Timeout: ein hängendes MCP-Child (kein Netz, blockierter
    // stdio-Handshake) darf den Live-Lauf nicht einfrieren — nach 8s degradieren
    // wir auf [] statt ewig zu warten.
    _tools = await Promise.race([
      _client.getTools(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("getTools()-Timeout nach 8000ms")), 8000)
      ),
    ]);
    return _tools;
  } catch (err) {
    // Graceful degradation: ein fehlender Pipedrive_API_Key oder ein nicht
    // erreichbares Pipedrive-MCP (fehlendes Binary, Netz-/Auth-Fehler, Timeout)
    // darf NIEMALS den ganzen Agenten lahmlegen — Mail/Kalender/Förderung müssen
    // weiterlaufen.
    console.warn(
      `[pipedrive] CRM-Tools nicht verfügbar, Agent läuft ohne sie: ${
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

export async function closePipedriveClient(): Promise<void> {
  if (_client) {
    await _client.close();
    _client = null;
    _tools = null;
  }
}
