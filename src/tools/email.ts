import nodemailer from "nodemailer";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { loadSmtpConfig, loadImapConfig } from "../config.js";

/* ──────────────────────────────────────────────────────────────
 * SMTP — Mail senden
 * ────────────────────────────────────────────────────────────── */

let _transport: nodemailer.Transporter | null = null;

function getTransport() {
  if (_transport) return _transport;
  const cfg = loadSmtpConfig();
  _transport = nodemailer.createTransport({
    host: cfg.SMTP_HOST,
    port: cfg.SMTP_PORT,
    secure: cfg.SMTP_SECURE,
    auth: { user: cfg.SMTP_USER, pass: cfg.SMTP_PASSWORD },
  });
  return _transport;
}

export const sendEmailTool = tool(
  async ({ to, subject, body, cc, icalEvent }) => {
    const cfg = loadSmtpConfig();
    const transport = getTransport();
    const info = await transport.sendMail({
      from: cfg.SMTP_FROM,
      to,
      cc,
      subject,
      text: body,
      // Optionaler iCalendar-Anhang (z.B. Kalender-Einladung als .ics).
      ...(icalEvent
        ? {
            icalEvent: {
              method: "REQUEST",
              content: icalEvent,
              filename: "einladung.ics",
            },
          }
        : {}),
    });
    return `Mail gesendet an ${to} (Betreff: "${subject}"). Message-ID: ${info.messageId}`;
  },
  {
    name: "send_email",
    description:
      "Sendet eine E-Mail über SMTP. Nutze dies, um Folgetermin-Einladungen, " +
      "Unterlagen-Anforderungen oder Bestätigungen an Kunden zu verschicken. " +
      "Optional kann ein iCalendar-String (icalEvent) als Kalender-Einladung angehängt werden.",
    schema: z.object({
      to: z.string().describe("Empfänger-Adresse(n), kommasepariert"),
      subject: z.string().describe("Betreff der Mail"),
      body: z.string().describe("Klartext-Inhalt der Mail"),
      cc: z.string().optional().describe("CC-Adresse(n), kommasepariert"),
      icalEvent: z
        .string()
        .optional()
        .describe(
          "Optionaler iCalendar(.ics)-Inhalt als String — hängt eine Termin-Einladung an die Mail."
        ),
    }),
  }
);

/* ──────────────────────────────────────────────────────────────
 * IMAP — Mail empfangen / lesen
 * ────────────────────────────────────────────────────────────── */

async function withImap<T>(fn: (client: ImapFlow) => Promise<T>): Promise<T> {
  const cfg = loadImapConfig();
  const client = new ImapFlow({
    host: cfg.IMAP_HOST,
    port: cfg.IMAP_PORT,
    secure: cfg.IMAP_SECURE,
    auth: { user: cfg.IMAP_USER, pass: cfg.IMAP_PASSWORD },
    logger: false,
  });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.logout().catch(() => client.close());
  }
}

export const listEmailsTool = tool(
  async ({ limit, unseenOnly, mailbox }) => {
    return withImap(async (client) => {
      const lock = await client.getMailboxLock(mailbox ?? "INBOX");
      try {
        const status = client.mailbox;
        const total =
          status && typeof status !== "boolean" ? status.exists : 0;
        if (!total) return "Postfach ist leer.";

        // Neueste zuerst: wir holen die letzten `limit` Sequenznummern.
        const start = Math.max(1, total - limit + 1);
        const range = `${start}:*`;

        const rows: string[] = [];
        for await (const msg of client.fetch(
          unseenOnly ? { seen: false } : range,
          { envelope: true, flags: true, uid: true }
        )) {
          const env = msg.envelope;
          const from = env?.from?.[0];
          const fromStr = from
            ? `${from.name ?? ""} <${from.address ?? ""}>`.trim()
            : "(unbekannt)";
          const seen = msg.flags?.has("\\Seen") ? "" : "🟢 ungelesen ";
          rows.push(
            `UID ${msg.uid} | ${seen}${fromStr} | ${
              env?.subject ?? "(kein Betreff)"
            } | ${env?.date?.toISOString() ?? "?"}`
          );
        }
        const out = rows.slice(-limit).reverse();
        return out.length
          ? `Letzte Mails in ${mailbox ?? "INBOX"}:\n` + out.join("\n")
          : "Keine passenden Mails gefunden.";
      } finally {
        lock.release();
      }
    });
  },
  {
    name: "list_emails",
    description:
      "Listet die neuesten E-Mails im Postfach (Standard: INBOX). Gibt UID, Absender, " +
      "Betreff und Datum zurück. Nutze die UID anschließend mit read_email, um den " +
      "Volltext zu lesen.",
    schema: z.object({
      limit: z.number().min(1).max(50).default(10).describe("Anzahl Mails"),
      unseenOnly: z
        .boolean()
        .default(false)
        .describe("Nur ungelesene Mails anzeigen"),
      mailbox: z
        .string()
        .optional()
        .describe("Postfach-Name, Standard INBOX"),
    }),
  }
);

export const readEmailTool = tool(
  async ({ uid, mailbox }) => {
    return withImap(async (client) => {
      const lock = await client.getMailboxLock(mailbox ?? "INBOX");
      try {
        const msg = await client.fetchOne(
          String(uid),
          { source: true },
          { uid: true }
        );
        if (!msg || typeof msg === "boolean" || !msg.source) {
          return `Keine Mail mit UID ${uid} gefunden.`;
        }
        const parsed = await simpleParser(msg.source);
        const from = parsed.from?.text ?? "(unbekannt)";
        const to = parsed.to
          ? Array.isArray(parsed.to)
            ? parsed.to.map((a) => a.text).join(", ")
            : parsed.to.text
          : "";
        const text =
          parsed.text ||
          (typeof parsed.html === "string" ? parsed.html : "") ||
          "(kein Textinhalt)";
        return [
          `Von: ${from}`,
          `An: ${to}`,
          `Datum: ${parsed.date?.toISOString() ?? "?"}`,
          `Betreff: ${parsed.subject ?? "(kein Betreff)"}`,
          "",
          text.trim(),
        ].join("\n");
      } finally {
        lock.release();
      }
    });
  },
  {
    name: "read_email",
    description:
      "Liest den Volltext einer einzelnen E-Mail anhand ihrer UID (aus list_emails). " +
      "Gibt Absender, Empfänger, Datum, Betreff und den Klartext-Body zurück.",
    schema: z.object({
      uid: z.number().describe("UID der Mail (aus list_emails)"),
      mailbox: z
        .string()
        .optional()
        .describe("Postfach-Name, Standard INBOX"),
    }),
  }
);

export const emailTools = [sendEmailTool, listEmailsTool, readEmailTool];
