#!/usr/bin/env node
/**
 * Build /opt/nacharbeit/web.env from local credential files.
 * Reads repo .env + optional PIPEDRIVE_ENV_FILE (defaults to unset).
 * Never prints secrets to stdout except when writing the remote file via SSH.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function parseEnvFile(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function pick(env, ...keys) {
  for (const key of keys) {
    const value = env[key]?.trim();
    if (value) return value;
  }
  return "";
}

const env = {
  ...parseEnvFile(resolve(repoRoot, ".env")),
  ...parseEnvFile(process.env.PIPEDRIVE_ENV_FILE ?? ""),
};

const lines = [
  "USE_MOCK_ANALYSIS=true",
  "ALLOW_LIVE_ACTION_EXECUTION=true",
  "SMTP_SECURE=false",
  `CRM_PROVIDER=${pick(env, "CRM_PROVIDER") || (pick(env, "Pipedrive_API_Key", "PIPEDRIVE_API_TOKEN") ? "pipedrive" : "mock")}`,
];

let pipedriveToken = pick(env, "Pipedrive_API_Key", "PIPEDRIVE_API_TOKEN");
let pipedriveDomain = pick(env, "PIPEDRIVE_COMPANY_DOMAIN", "Pipedrive_Company_Domain");

if (pipedriveToken && !pipedriveDomain) {
  try {
    const res = await fetch(
      `https://api.pipedrive.com/v1/users/me?api_token=${encodeURIComponent(pipedriveToken)}`,
    );
    const data = await res.json();
    pipedriveDomain = data?.data?.company_domain?.trim() ?? "";
  } catch {
    // leave empty — CRM falls back to mock
  }
}

if (pipedriveToken) {
  lines.push(`Pipedrive_API_Key=${pipedriveToken}`);
  lines.push(`PIPEDRIVE_API_TOKEN=${pipedriveToken}`);
}
if (pipedriveDomain) {
  lines.push(`PIPEDRIVE_COMPANY_DOMAIN=${pipedriveDomain}`);
}

const caldavUrl = pick(env, "CALDAV_SERVER_URL", "CALDAV_URL", "DAV_URL");
const caldavUser = pick(env, "CALDAV_USER", "DAV_User");
const caldavPass = pick(env, "CALDAV_PASSWORD", "CALDAV_PASS", "DAV_Key");
const caldavCalendar = pick(env, "CALDAV_CALENDAR_NAME");

if (caldavUrl) lines.push(`CALDAV_SERVER_URL=${caldavUrl}`);
if (caldavUser) lines.push(`CALDAV_USER=${caldavUser}`);
if (caldavPass) lines.push(`CALDAV_PASSWORD=${caldavPass}`);
if (caldavCalendar) lines.push(`CALDAV_CALENDAR_NAME=${caldavCalendar}`);

const elevenKey = pick(env, "ELEVENLABS_API_KEY");
if (elevenKey) lines.push(`ELEVENLABS_API_KEY=${elevenKey}`);

process.stdout.write(`${lines.join("\n")}\n`);
