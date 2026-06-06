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

const llmSchema = z.object({
  ANTHROPIC_API_KEY: z.string().min(1, "ANTHROPIC_API_KEY fehlt"),
  ANTHROPIC_MODEL: z.string().default("claude-opus-4-8"),
});

const smtpSchema = z.object({
  SMTP_HOST: z.string().min(1, "SMTP_HOST fehlt"),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_SECURE: bool(false),
  SMTP_USER: z.string().min(1, "SMTP_USER fehlt"),
  SMTP_PASSWORD: z.string().min(1, "SMTP_PASSWORD fehlt"),
  SMTP_FROM: z.string().min(1, "SMTP_FROM fehlt"),
});

const imapSchema = z.object({
  IMAP_HOST: z.string().min(1, "IMAP_HOST fehlt"),
  IMAP_PORT: z.coerce.number().default(993),
  IMAP_SECURE: bool(true),
  IMAP_USER: z.string().min(1, "IMAP_USER fehlt"),
  IMAP_PASSWORD: z.string().min(1, "IMAP_PASSWORD fehlt"),
});

const caldavSchema = z.object({
  CALDAV_SERVER_URL: z.string().url("CALDAV_SERVER_URL muss eine URL sein"),
  CALDAV_USER: z.string().min(1, "CALDAV_USER fehlt"),
  CALDAV_PASSWORD: z.string().min(1, "CALDAV_PASSWORD fehlt"),
  CALDAV_CALENDAR_NAME: z.string().optional(),
});

function load<T extends z.ZodTypeAny>(schema: T, label: string): z.infer<T> {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.message}`).join("\n");
    throw new Error(`[config:${label}] Ungültige/fehlende ENV-Variablen:\n${issues}`);
  }
  return parsed.data;
}

export const loadLlmConfig = () => load(llmSchema, "llm");
export const loadSmtpConfig = () => load(smtpSchema, "smtp");
export const loadImapConfig = () => load(imapSchema, "imap");
export const loadCaldavConfig = () => load(caldavSchema, "caldav");

export type LlmConfig = z.infer<typeof llmSchema>;
export type SmtpConfig = z.infer<typeof smtpSchema>;
export type ImapConfig = z.infer<typeof imapSchema>;
export type CaldavConfig = z.infer<typeof caldavSchema>;
