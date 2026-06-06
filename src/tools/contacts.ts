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
 * Tools (CardDAV: Suche & Anlegen)
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

/* ──────────────────────────────────────────────────────────────
 * Contact-Resolution (Pipedrive-CRM + CardDAV-Kontaktbuch)
 * ────────────────────────────────────────────────────────────── */

export interface ContactCandidate {
  name: string;
  email: string | null;
  source: string; // "pipedrive" | "carddav"
  id?: string | number;
}

export interface ContactResolution {
  /** true gdw. genau ein sicherer Treffer. */
  resolved: boolean;
  /** Die gewählte, verifizierte E-Mail. */
  email: string | null;
  display_name: string | null;
  source: "pipedrive" | "carddav" | "both" | "none";
  pipedrive_person_id: number | null;
  candidates: ContactCandidate[];
  /** z.B. "mehrere Treffer — bitte bestätigen" oder "kein Treffer". */
  note: string | null;
}

export interface ResolveContactOpts {
  email_hint?: string;
  /**
   * CardDAV-Fallback: ein injizierbarer Resolver, der den Namen gegen das
   * Kontaktbuch des Beraters auflöst. Default ⇒ `cardDavLookupByName` (unten),
   * sodass standardmäßig BEIDE Quellen aktiv sind. Überschreibbar (z.B. Tests).
   * Muss graziös degradieren (niemals werfen, leeres Array bei keinem Treffer).
   */
  cardDavLookup?: (name: string) => Promise<ContactCandidate[]>;
}

/* ──────────────────────────────────────────────────────────────
 * Pipedrive (REST, direkt — verlässlich, hat die Kundendaten)
 * ────────────────────────────────────────────────────────────── */

interface PipedriveCandidate {
  id: number;
  name: string;
  email: string | null;
}

interface PipedrivePersonItem {
  id?: number;
  name?: string;
  primary_email?: string | null;
  emails?: Array<string | { value?: string }> | null;
}

/**
 * Sucht eine Person im Pipedrive-CRM. Rate-Limit / Nicht-200 → leeres Ergebnis
 * (Pipedrive als "kein Treffer" behandeln, niemals werfen). Fehlt im Such-Treffer
 * die E-Mail, wird sie per Folge-Request /persons/{id} nachgeladen.
 */
async function searchPipedrive(name: string): Promise<PipedriveCandidate[]> {
  const token = process.env.Pipedrive_API_Key ?? process.env.PIPEDRIVE_API_TOKEN;
  if (!token) return [];

  try {
    const url =
      `https://api.pipedrive.com/v1/persons/search?term=${encodeURIComponent(name)}` +
      `&fields=name&exact_match=false&api_token=${encodeURIComponent(token)}`;
    const res = await globalThis.fetch(url);
    if (!res.ok) return [];
    const json = (await res.json()) as {
      data?: { items?: Array<{ item?: PipedrivePersonItem }> };
    };
    const items = json.data?.items ?? [];

    const out: PipedriveCandidate[] = [];
    for (const wrap of items) {
      const item = wrap.item;
      if (!item || typeof item.id !== "number") continue;
      let email = pickPipedriveEmail(item);
      if (!email) {
        email = await fetchPipedrivePersonEmail(item.id, token);
      }
      out.push({ id: item.id, name: item.name ?? "", email });
    }
    return out;
  } catch {
    // Netzwerk-/Parse-Fehler: Pipedrive als nicht erreichbar behandeln.
    return [];
  }
}

/** Holt eine E-Mail aus einem Pipedrive-Such-Item (primary_email oder emails[0]). */
function pickPipedriveEmail(item: PipedrivePersonItem): string | null {
  if (typeof item.primary_email === "string" && item.primary_email) {
    return item.primary_email;
  }
  const first = item.emails?.[0];
  if (typeof first === "string" && first) return first;
  if (first && typeof first === "object" && typeof first.value === "string" && first.value) {
    return first.value;
  }
  return null;
}

/** Folge-Request: vollständiger Person-Datensatz, um die E-Mail nachzuladen. */
async function fetchPipedrivePersonEmail(id: number, token: string): Promise<string | null> {
  try {
    const url = `https://api.pipedrive.com/v1/persons/${id}?api_token=${encodeURIComponent(token)}`;
    const res = await globalThis.fetch(url);
    if (!res.ok) return null;
    const json = (await res.json()) as {
      data?: {
        primary_email?: string | null;
        email?: Array<{ value?: string; primary?: boolean }> | null;
      };
    };
    const data = json.data;
    if (!data) return null;
    if (typeof data.primary_email === "string" && data.primary_email) return data.primary_email;
    const emails = data.email ?? [];
    const primary = emails.find((e) => e.primary && e.value)?.value;
    if (primary) return primary;
    const any = emails.find((e) => e.value)?.value;
    return any ?? null;
  } catch {
    return null;
  }
}

/* ──────────────────────────────────────────────────────────────
 * CardDAV-Lookup (Kontaktbuch des Beraters — reuse der #21-Primitive)
 * ────────────────────────────────────────────────────────────── */

/**
 * Löst einen Namen gegen das CardDAV-Kontaktbuch auf, wiederverwendet die
 * Primitive aus #21 (getClient → resolveAddressBook → fetchVCards →
 * parseContacts). Matcht Kontakte, deren `fn` (case-insensitive) den Suchbegriff
 * enthält ODER deren letztes Namens-Token (Nachname) exakt trifft. Graziös:
 * jeder Fehler (kein Adressbuch, Server nicht erreichbar, kaputte Karte) ⇒ [].
 */
export async function cardDavLookupByName(name: string): Promise<ContactCandidate[]> {
  try {
    const client = await getClient();
    const addressBook = await resolveAddressBook();
    const objects = await client.fetchVCards({ addressBook });

    const contacts = objects.flatMap((o) => {
      try {
        return parseContacts(o.data ?? "");
      } catch {
        return [] as ParsedContact[];
      }
    });

    const q = name.trim().toLowerCase();
    const lastToken = q.split(/\s+/).pop() ?? q;

    return contacts
      .filter((c) => {
        const fn = c.fn.toLowerCase();
        if (fn.includes(q)) return true;
        const tokens = fn.split(/\s+/);
        return tokens.includes(lastToken);
      })
      .map((c) => ({
        name: c.fn,
        email: c.emails[0] ?? null,
        source: "carddav",
        id: c.uid,
      }));
  } catch {
    // CardDAV nicht erreichbar / leer / Fehler → kein Treffer, niemals werfen.
    return [];
  }
}

/* ──────────────────────────────────────────────────────────────
 * Merge & Entscheidung
 * ────────────────────────────────────────────────────────────── */

/**
 * Löst einen Namen zur verifizierten E-Mail auf — aus Pipedrive (System-of-record
 * für die Kunden-E-Mail) UND dem CardDAV-Kontaktbuch des Beraters. Beide Quellen
 * sind standardmäßig aktiv; `opts.cardDavLookup` ist überschreibbar (z.B. Tests).
 * `email_hint` ist NUR Tie-Breaker, niemals Quelle der Wahrheit.
 */
export async function resolveContact(
  name: string,
  opts: ResolveContactOpts = {}
): Promise<ContactResolution> {
  const cleanName = name.trim();
  if (!cleanName) {
    return {
      resolved: false,
      email: null,
      display_name: null,
      source: "none",
      pipedrive_person_id: null,
      candidates: [],
      note: "Kein Name übergeben.",
    };
  }

  // Beide Quellen parallel — CardDAV defaultet auf das Kontaktbuch, degradiert graziös.
  const cardDavLookup = opts.cardDavLookup ?? cardDavLookupByName;
  const [pdRaw, cardRaw] = await Promise.all([
    searchPipedrive(cleanName),
    cardDavLookup(cleanName).catch(() => [] as ContactCandidate[]),
  ]);

  const pdCandidates: ContactCandidate[] = pdRaw.map((p) => ({
    name: p.name,
    email: p.email,
    source: "pipedrive",
    id: p.id,
  }));
  const cardCandidates: ContactCandidate[] = cardRaw;
  const candidates: ContactCandidate[] = [...pdCandidates, ...cardCandidates];

  if (!candidates.length) {
    return {
      resolved: false,
      email: null,
      display_name: null,
      source: "none",
      pipedrive_person_id: null,
      candidates: [],
      note: "Kein Treffer im CRM/Kontaktbuch.",
    };
  }

  const target = cleanName.toLowerCase();
  const exactPd = pdCandidates.filter((c) => c.name.trim().toLowerCase() === target && c.email);
  const exactCard = cardCandidates.filter(
    (c) => c.name.trim().toLowerCase() === target && c.email
  );

  const buildResolved = (
    chosen: ContactCandidate,
    pdId: number | null,
    source: ContactResolution["source"]
  ): ContactResolution => ({
    resolved: true,
    email: chosen.email,
    display_name: chosen.name || cleanName,
    source,
    pipedrive_person_id: pdId,
    candidates,
    note: null,
  });

  // System-of-record: genau ein exakter Pipedrive-Treffer mit E-Mail.
  // Tie-Break bevorzugt die Pipedrive-E-Mail; steht der gleiche Kontakt auch im
  // CardDAV-Buch, wird das als source:"both" vermerkt (E-Mail bleibt Pipedrive).
  if (exactPd.length === 1) {
    const pd = exactPd[0];
    const inCard = exactCard.length > 0;
    return buildResolved(
      pd,
      typeof pd.id === "number" ? pd.id : null,
      inCard ? "both" : "pipedrive"
    );
  }

  // Mehrere exakte Pipedrive-Treffer: ggf. per email_hint disambiguieren.
  if (exactPd.length > 1 && opts.email_hint) {
    const hint = opts.email_hint.toLowerCase();
    const pick = exactPd.find((c) => c.email && c.email.toLowerCase() === hint);
    if (pick) {
      return buildResolved(pick, typeof pick.id === "number" ? pick.id : null, "pipedrive");
    }
  }

  // Kein eindeutiger CRM-Treffer, aber genau ein exakter CardDAV-Treffer.
  if (exactPd.length === 0 && exactCard.length === 1) {
    return buildResolved(exactCard[0], null, "carddav");
  }

  // Sonst: kein oder mehrdeutiger Treffer → resolved:false, Lücke benennen.
  const exactCount = exactPd.length + exactCard.length;
  const note =
    exactCount > 1
      ? "Mehrere Treffer — bitte bestätigen."
      : "Kein eindeutiger Treffer (nur unscharfe Namens-Übereinstimmung) — bitte bestätigen.";
  return {
    resolved: false,
    email: null,
    display_name: null,
    source: "none",
    pipedrive_person_id: null,
    candidates,
    note,
  };
}

/* ──────────────────────────────────────────────────────────────
 * Tool
 * ────────────────────────────────────────────────────────────── */

export const resolveContactTool = tool(
  async ({ name, email_hint }) => {
    const result = await resolveContact(name, { email_hint });
    return JSON.stringify(result);
  },
  {
    name: "resolve_contact",
    description:
      "Löst den Namen eines Kunden zur verifizierten E-Mail-Adresse auf — aus dem CardDAV-" +
      "Kontaktbuch und/oder Pipedrive-CRM. Nutze dies, um den Empfänger einer Einladung/Mail " +
      "zu bestimmen, statt einer im Transkript genannten Adresse blind zu vertrauen.",
    schema: z.object({
      name: z.string().describe("Voller Name des Kunden, z.B. \"Thomas Berger\""),
      email_hint: z
        .string()
        .optional()
        .describe(
          "Optionale E-Mail aus dem Transkript — NUR als Tie-Breaker bei mehreren Treffern, " +
            "niemals als Quelle der Wahrheit."
        ),
    }),
  }
);

export const contactTools = [searchContactsTool, createContactTool, resolveContactTool];
