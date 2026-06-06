// Minimal dependency-free web server for the live Plan-Checklist UI.
//   GET  /         -> the UI (web/index.html)
//   GET  /events   -> Server-Sent Events stream of action events
//   POST /run      -> { instruction } : runs the agent, broadcasting events
import http from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { runAgentObserved, type StreamMsg } from "./observe.js";
import { decide } from "./hitl.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.UI_PORT ?? 4000);
// Bind loopback by default — this server can trigger real emails / CRM writes, so
// it must not be reachable from the network unless explicitly opted in.
const HOST = process.env.UI_HOST ?? "127.0.0.1";
// Optional shared secret: if set, /run and /approve require x-ui-token to match.
const UI_TOKEN = process.env.UI_TOKEN ?? "";
// Auto-approve (hitl:false) is only honored when explicitly allowed, so prompt-
// injected content can't drive ungated side effects on a reachable instance.
const ALLOW_AUTOAPPROVE = process.env.UI_ALLOW_AUTOAPPROVE === "1";

/** Parse a JSON request body; returns null (never throws) on malformed input. */
function parseJson(raw: string): Record<string, unknown> | null {
  try {
    const v = JSON.parse(raw || "{}");
    return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
  } catch {
    return null;
  }
}

/** True if the request carries the required token (or no token is configured). */
function authorized(req: http.IncomingMessage): boolean {
  if (!UI_TOKEN) return true;
  return req.headers["x-ui-token"] === UI_TOKEN;
}

const clients = new Set<http.ServerResponse>();
function broadcast(msg: StreamMsg): void {
  const data = `data: ${JSON.stringify(msg)}\n\n`;
  for (const c of clients) c.write(data);
}

let running = false;

async function readBody(req: http.IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}

const server = http.createServer(async (req, res) => {
  try {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);

  if (req.method === "GET" && url.pathname === "/") {
    const html = await readFile(path.join(ROOT, "web", "index.html"), "utf8");
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(html);
    return;
  }

  if (req.method === "GET" && url.pathname === "/events") {
    res.writeHead(200, {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      connection: "keep-alive",
    });
    res.write(`retry: 2000\n\n`);
    clients.add(res);
    req.on("close", () => clients.delete(res));
    return;
  }

  if (req.method === "POST" && url.pathname === "/run") {
    if (!authorized(req)) {
      res.writeHead(401).end("unauthorized");
      return;
    }
    const body = parseJson(await readBody(req));
    if (!body) {
      res.writeHead(400).end("bad json");
      return;
    }
    const instruction = String(body.instruction ?? "").trim();
    // Auto-approve only when explicitly allowed; otherwise HITL is forced on.
    const hitl = ALLOW_AUTOAPPROVE ? body.hitl !== false : true;
    if (!instruction) {
      res.writeHead(400).end("no instruction");
      return;
    }
    if (running) {
      res.writeHead(409).end("agent busy");
      return;
    }
    res.writeHead(202).end("started");
    running = true;
    runAgentObserved(instruction, broadcast, { hitl })
      .catch((e) => broadcast({ kind: "error", message: (e as Error).message }))
      .finally(() => {
        running = false;
      });
    return;
  }

  if (req.method === "POST" && url.pathname === "/approve") {
    if (!authorized(req)) {
      res.writeHead(401).end("unauthorized");
      return;
    }
    const body = parseJson(await readBody(req));
    if (!body) {
      res.writeHead(400).end("bad json");
      return;
    }
    const id = String(body.id ?? "");
    const decision = body.decision === "denied" ? "denied" : "granted";
    const ok = decide(id, decision);
    res.writeHead(ok ? 200 : 404).end(ok ? "ok" : "no pending action");
    return;
  }

  res.writeHead(404).end("not found");
  } catch (err) {
    // Never leave a request hanging on an unexpected error.
    if (!res.headersSent) res.writeHead(500);
    res.end("internal error");
    broadcast({ kind: "error", message: (err as Error).message });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`\n🦫  Nacharbeits-Agent UI → http://${HOST}:${PORT}\n`);
});
