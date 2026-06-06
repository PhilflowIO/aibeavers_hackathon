// tsdav liefert seinen ESM-Build als CJS aus (kein "type":"module" im Package),
// daher scheitert Node an Named-Imports → Default-Import + Destrukturierung.
// (Gleiche Interop wie in calendar.ts.)
import tsdav, { type DAVAddressBook } from "tsdav";
const { createDAVClient } = tsdav;
// vcf: RFC-6350-konformes vCard-Parsen/-Bauen. Gleiche Begründung wie ical.js
// in calendar.ts — Hand-Regex zerbricht an Line-Folding, ;/,-Escaping und
// multi-value-Properties (mehrere EMAIL/TEL). vcf ist CJS → Default-Import.
import vCard from "vcf";
import { randomUUID } from "node:crypto";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { loadCarddavConfig } from "../config.js";

/* ──────────────────────────────────────────────────────────────
 * CardDAV-Client (lazy, einmalig)
 * ────────────────────────────────────────────────────────────── */

type CardDavClient = Awaited<ReturnType<typeof createDAVClient>>;

let _client: CardDavClient | null = null;

async function getClient(): Promise<CardDavClient> {
  if (_client) return _client;
  const cfg = loadCarddavConfig();
  _client = await createDAVClient({
    serverUrl: cfg.CARDDAV_SERVER_URL,
    credentials: {
      username: cfg.CARDDAV_USER,
      password: cfg.CARDDAV_PASSWORD,
    },
    authMethod: "Basic",
    // CardDAV ist ein eigener Account-Typ — eine eigene Client-Instanz, nicht
    // der CalDAV-Client aus calendar.ts.
    defaultAccountType: "carddav",
  });
  return _client;
}

/** Wählt das Ziel-Adressbuch: per Name (ENV) oder das erste gefundene. */
async function resolveAddressBook(): Promise<DAVAddressBook> {
  const cfg = loadCarddavConfig();
  const client = await getClient();
  const books = await client.fetchAddressBooks();
  if (!books.length) throw new Error("Keine CardDAV-Adressbücher gefunden.");

  if (cfg.CARDDAV_ADDRESS_BOOK_NAME) {
    const match = books.find(
      (b) =>
        (typeof b.displayName === "string" ? b.displayName : "") ===
        cfg.CARDDAV_ADDRESS_BOOK_NAME
    );
    if (!match) {
      const names = books
        .map((b) => (typeof b.displayName === "string" ? b.displayName : "?"))
        .join(", ");
      throw new Error(
        `Adressbuch "${cfg.CARDDAV_ADDRESS_BOOK_NAME}" nicht gefunden. Verfügbar: ${names}`
      );
    }
    return match;
  }
  return books[0];
}

/* ──────────────────────────────────────────────────────────────
 * vCard-Parsing (RFC 6350 via vcf)
 * ────────────────────────────────────────────────────────────── */

interface ParsedContact {
  fn: string;
  emails: string[];
  tels: string[];
  org: string;
  uid: string;
}

/** Liefert alle Werte eines Feldes als String-Array (0, 1 oder mehrere). */
function fieldValues(card: vCard, field: string): string[] {
  const v = card.get(field);
  if (!v) return [];
  const arr = Array.isArray(v) ? v : [v];
  return arr.map((p) => p.valueOf()).filter((s) => s.length > 0);
}

/**
 * Zerlegt einen rohen VCARD-Block in strukturierte Kontakte. Ein CardDAV-Objekt
 * trägt normal genau eine vCard, vcf.parse liefert aber generell ein Array —
 * wir geben alle zurück. Wirft bei kaputten Daten; der Aufrufer fängt das pro
 * Objekt ab (kein Erfinden).
 */
export function parseContacts(vcardData: string): ParsedContact[] {
  return vCard.parse(vcardData).map((card) => ({
    fn: fieldValues(card, "fn")[0] || "(kein Name)",
    emails: fieldValues(card, "email"),
    tels: fieldValues(card, "tel"),
    org: fieldValues(card, "org")[0] || "",
    uid: fieldValues(card, "uid")[0] || "",
  }));
}

/** Ein Kontakt als mehrzeiliger Listeneintrag (mensch-/LLM-lesbar). */
export function formatContact(c: ParsedContact): string {
  const parts = [`• ${c.fn}`];
  if (c.org) parts.push(`    Firma: ${c.org}`);
  if (c.emails.length) parts.push(`    E-Mail: ${c.emails.join(", ")}`);
  if (c.tels.length) parts.push(`    Telefon: ${c.tels.join(", ")}`);
  return parts.join("\n");
}

/* ──────────────────────────────────────────────────────────────
 * vCard-Build (vCard 3.0 — Baikal-Standard)
 * ────────────────────────────────────────────────────────────── */

interface BuildContactArgs {
  name: string;
  email: string;
  tel?: string;
  org?: string;
  uid: string;
}

/**
 * Baut eine vCard-3.0-Karte. Escaping/Folding übernimmt vcf, nicht Hand-Code.
 * `N` (strukturierter Name) wird aus dem Anzeigenamen abgeleitet: am ersten
 * Leerzeichen in Vor-/Nachname gesplittet (naiv, aber RFC-konform befüllt) —
 * `FN` bleibt der ungeteilte Anzeigename.
 */
function buildVCard(args: BuildContactArgs): string {
  const card = new vCard();
  const sep = args.name.indexOf(" ");
  const given = sep === -1 ? args.name : args.name.slice(0, sep);
  const family = sep === -1 ? "" : args.name.slice(sep + 1);
  // N = Family;Given;Additional;Prefix;Suffix
  card.set("n", `${family};${given};;;`);
  card.set("fn", args.name);
  card.set("email", args.email);
  if (args.tel) card.set("tel", args.tel);
  if (args.org) card.set("org", args.org);
  card.set("uid", args.uid);
  card.set("rev", new Date().toISOString());
  return card.toString("3.0");
}

/* ──────────────────────────────────────────────────────────────
 * Tools
 * ────────────────────────────────────────────────────────────── */

export const searchContactsTool = tool(
  async ({ query }) => {
    const client = await getClient();
    const addressBook = await resolveAddressBook();
    const objects = await client.fetchVCards({ addressBook });

    const contacts = objects.flatMap((o) => {
      const data = o.data ?? "";
      try {
        return parseContacts(data);
      } catch {
        // Unlesbare Karte nicht verschweigen, aber nicht erfinden.
        return [
          {
            fn: "(Kontakt nicht lesbar)",
            emails: [],
            tels: [],
            org: "",
            uid: "",
          } satisfies ParsedContact,
        ];
      }
    });

    const q = query.trim().toLowerCase();
    const hits = contacts.filter((c) => {
      const hay = [c.fn, c.org, ...c.emails].join(" ").toLowerCase();
      return hay.includes(q);
    });

    if (!hits.length) {
      return `Kein Kontakt zu "${query}" im Adressbuch gefunden.`;
    }

    const shown = hits.slice(0, 25);
    const more = hits.length > shown.length ? `\n… und ${hits.length - shown.length} weitere.` : "";
    return (
      `Gefundene Kontakte zu "${query}":\n` + shown.map(formatContact).join("\n") + more
    );
  },
  {
    name: "search_contacts",
    description:
      "Sucht Kontakte im CardDAV-Adressbuch (über Name, Firma oder E-Mail). Gibt Name, " +
      "Firma, E-Mail und Telefon zurück. Nutze dies VOR dem Anlegen eines Folgetermins " +
      "oder vor send_email, um die echte E-Mail-Adresse des Kunden zu holen, statt sie zu " +
      "raten. Findet das Tool nichts, meldet es das klar — erfinde keine Adresse.",
    schema: z.object({
      query: z
        .string()
        .min(1)
        .describe("Suchbegriff: Name, Firma oder E-Mail-Teil des gesuchten Kontakts"),
    }),
  }
);

export const createContactTool = tool(
  async ({ name, email, tel, org }) => {
    const client = await getClient();
    const addressBook = await resolveAddressBook();

    const uid = `${randomUUID()}@aibeavers`;
    const vCardString = buildVCard({ name, email, tel, org, uid });

    const res = await client.createVCard({
      addressBook,
      filename: `${uid}.vcf`,
      vCardString,
    });

    // tsdav gibt normal eine fetch-Response zurück — aber je nach Server/Version
    // kann das auch ein abweichendes Objekt ohne .ok/.status sein. Defensiv:
    // nur als Fehler werten, wenn ein eindeutiges Misserfolgs-Signal vorliegt.
    if (res && typeof res === "object" && "ok" in res && !(res as Response).ok) {
      const r = res as Response;
      return `Kontakt konnte nicht angelegt werden (HTTP ${r.status}). Server: ${r.statusText}`;
    }
    return [
      `Kontakt "${name}" im Adressbuch angelegt.`,
      `E-Mail: ${email}${tel ? ` · Telefon: ${tel}` : ""}${org ? ` · Firma: ${org}` : ""}`,
      `Diese E-Mail-Adresse kannst du direkt für create_calendar_event / send_email nutzen.`,
    ].join("\n");
  },
  {
    name: "create_contact",
    description:
      "Legt einen neuen Kontakt als vCard im CardDAV-Adressbuch an (z.B. einen neuen Kunden " +
      "nach dem Erstgespräch). Nutze dies, wenn der Kunde noch nicht im Adressbuch ist und " +
      "Name + E-Mail vorliegen. Erfinde keine Daten — fehlt eine Angabe, frage nach.",
    schema: z.object({
      name: z.string().describe("Vollständiger Anzeigename des Kontakts (z.B. 'Erika Beispiel')"),
      email: z.string().describe("E-Mail-Adresse des Kontakts"),
      tel: z.string().optional().describe("Telefonnummer (optional)"),
      org: z.string().optional().describe("Firma / Organisation (optional)"),
    }),
  }
);

export const contactTools = [searchContactsTool, createContactTool];
