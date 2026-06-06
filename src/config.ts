import "dotenv/config";
import { z } from "zod";

/**
 * Zentrale, zod-validierte Konfiguration.
 *
 * Wir validieren NICHT eager beim Import — sonst kann der Agent nicht starten,
 * solange eine einzelne Credential fehlt. Stattdessen lädt jedes Subsystem
 * (SMTP / IMAP / CalDAV) seine eigene Sektion lazy über die `load*`-Helfer.
 * So lässt sich z.B. nur-Mail testen, ohne CalDAV-Creds zu hinterlegen.
 */

const bool = (def: boolean) =>
  z
    .string()
    .optional()
    .transform((v) => (v == null ? def : v.toLowerCase() === "true"));

// Qwen über die OpenAI-kompatible API von Alibaba DashScope (Qwen Cloud).
// Key kommt aus Infisical als DASHSCOPE_API_KEY. Endpoint default = DashScope
// International (Singapur); für Mainland-China-Account QWEN_BASE_URL setzen.
// Endpoint + Modell sind ENV-überschreibbar (QWEN_BASE_URL / QWEN_MODEL).
const llmSchema = z.object({
  QWEN_API_KEY: z.string().min(1, "DASHSCOPE_API_KEY/QWEN_API_KEY fehlt"),
  QWEN_BASE_URL: z
    .string()
    .url()
    .default("https://dashscope-intl.aliyuncs.com/compatible-mode/v1"),
  QWEN_MODEL: z.string().default("qwen3-235b-a22b-instruct-2507"),
});

// Mailserver: ein Postfach, gleiche Anmeldedaten für SMTP + IMAP. Host/Ports
// sind feste Hetzner-Webhosting-Werte (mail.your-server.de) und damit Defaults,
// nicht Secrets — per ENV überschreibbar. Die Secrets (User/Passwort) kommen aus
// Infisical unter den Namen SMTP_User / SMTP_Key.
const smtpSchema = z.object({
  SMTP_HOST: z.string().min(1).default("mail.your-server.de"),
  SMTP_PORT: z.coerce.number().default(465),
  SMTP_SECURE: bool(true), // 465 = implicit TLS
  SMTP_USER: z.string().min(1, "SMTP_User fehlt (Postfach-Login)"),
  SMTP_PASSWORD: z.string().min(1, "SMTP_Key fehlt (Postfach-Passwort)"),
  SMTP_FROM: z.string().min(1, "SMTP_FROM/SMTP_User fehlt (Absenderadresse)"),
});

const imapSchema = z.object({
  IMAP_HOST: z.string().min(1).default("mail.your-server.de"),
  IMAP_PORT: z.coerce.number().default(993),
  IMAP_SECURE: bool(true), // 993 = implicit TLS
  IMAP_USER: z.string().min(1, "SMTP_User fehlt (Postfach-Login)"),
  IMAP_PASSWORD: z.string().min(1, "SMTP_Key fehlt (Postfach-Passwort)"),
});

// CalDAV (Baikal) — Infisical-Namen DAV_URL / DAV_User / DAV_Key.
const caldavSchema = z.object({
  CALDAV_SERVER_URL: z.string().url("CALDAV_SERVER_URL/DAV_URL muss eine URL sein"),
  CALDAV_USER: z.string().min(1, "DAV_User fehlt"),
  CALDAV_PASSWORD: z.string().min(1, "DAV_Key fehlt"),
  CALDAV_CALENDAR_NAME: z.string().optional(),
});

// CardDAV (Baikal) — bei Baikal derselbe Server + dieselben Creds wie CalDAV,
// nur ein anderer Account-Typ. Daher sind CARDDAV_*-Variablen optional und
// fallen auf die CalDAV-/DAV-Werte zurück (siehe loadCarddavConfig).
const carddavSchema = z.object({
  CARDDAV_SERVER_URL: z.string().url("CARDDAV_SERVER_URL/CALDAV_SERVER_URL/DAV_URL muss eine URL sein"),
  CARDDAV_USER: z.string().min(1, "DAV_User fehlt"),
  CARDDAV_PASSWORD: z.string().min(1, "DAV_Key fehlt"),
  CARDDAV_ADDRESS_BOOK_NAME: z.string().optional(),
});

function load<T extends z.ZodTypeAny>(
  schema: T,
  label: string,
  input: Record<string, unknown>
): z.infer<T> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.message}`).join("\n");
    throw new Error(`[config:${label}] Ungültige/fehlende ENV-Variablen:\n${issues}`);
  }
  return parsed.data;
}

// Mapping-Schicht: übersetzt die Infisical-ENV-Namen auf die kanonischen
// Config-Keys, die die Tools lesen. Eine einzige Stelle — der nächste
// Infisical-Pull kann nichts brechen, weil die .env nie umbenannt wird.
export const loadLlmConfig = () =>
  load(llmSchema, "llm", {
    QWEN_API_KEY: process.env.DASHSCOPE_API_KEY ?? process.env.QWEN_API_KEY,
    QWEN_BASE_URL: process.env.QWEN_BASE_URL,
    QWEN_MODEL: process.env.QWEN_MODEL,
  });

export const loadSmtpConfig = () =>
  load(smtpSchema, "smtp", {
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_SECURE: process.env.SMTP_SECURE,
    SMTP_USER: process.env.SMTP_User ?? process.env.SMTP_USER,
    SMTP_PASSWORD: process.env.SMTP_Key ?? process.env.SMTP_PASSWORD,
    // Absender = explizit gesetztes SMTP_FROM, sonst der Login-User.
    SMTP_FROM: process.env.SMTP_FROM ?? process.env.SMTP_User ?? process.env.SMTP_USER,
  });

export const loadImapConfig = () =>
  load(imapSchema, "imap", {
    IMAP_HOST: process.env.IMAP_HOST,
    IMAP_PORT: process.env.IMAP_PORT,
    IMAP_SECURE: process.env.IMAP_SECURE,
    // Gleiches Postfach wie SMTP — IMAP_*-Override möglich, sonst SMTP-Creds.
    IMAP_USER: process.env.IMAP_User ?? process.env.IMAP_USER ?? process.env.SMTP_User ?? process.env.SMTP_USER,
    IMAP_PASSWORD: process.env.IMAP_Key ?? process.env.IMAP_PASSWORD ?? process.env.SMTP_Key ?? process.env.SMTP_PASSWORD,
  });

export const loadCaldavConfig = () =>
  load(caldavSchema, "caldav", {
    CALDAV_SERVER_URL: process.env.CALDAV_SERVER_URL ?? process.env.DAV_URL,
    CALDAV_USER: process.env.CALDAV_USER ?? process.env.DAV_User,
    CALDAV_PASSWORD: process.env.CALDAV_PASSWORD ?? process.env.DAV_Key,
    CALDAV_CALENDAR_NAME: process.env.CALDAV_CALENDAR_NAME,
  });

// Fällt auf die CalDAV-/DAV-Creds zurück — bei Baikal identisch. Eigene
// CARDDAV_*-Variablen nur nötig, wenn Server/Adressbuch abweichen.
export const loadCarddavConfig = () =>
  load(carddavSchema, "carddav", {
    CARDDAV_SERVER_URL:
      process.env.CARDDAV_SERVER_URL ?? process.env.CALDAV_SERVER_URL ?? process.env.DAV_URL,
    CARDDAV_USER: process.env.CARDDAV_USER ?? process.env.CALDAV_USER ?? process.env.DAV_User,
    CARDDAV_PASSWORD:
      process.env.CARDDAV_PASSWORD ?? process.env.CALDAV_PASSWORD ?? process.env.DAV_Key,
    CARDDAV_ADDRESS_BOOK_NAME: process.env.CARDDAV_ADDRESS_BOOK_NAME,
  });

export type LlmConfig = z.infer<typeof llmSchema>;
export type SmtpConfig = z.infer<typeof smtpSchema>;
export type ImapConfig = z.infer<typeof imapSchema>;
export type CaldavConfig = z.infer<typeof caldavSchema>;
export type CarddavConfig = z.infer<typeof carddavSchema>;
