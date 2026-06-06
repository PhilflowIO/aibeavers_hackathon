import { tool } from "@langchain/core/tools";
import { z } from "zod";

/* ──────────────────────────────────────────────────────────────
 * Typen
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
   * Saubere Naht für den CardDAV-Fallback: ein injizierbarer Resolver, der den
   * Namen gegen das Kontaktbuch des Beraters auflöst. Wird separat in einem
   * eigenen Worktree gebaut; hier nur eingehängt. Default undefined ⇒ Pipedrive-only.
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
 * Merge & Entscheidung
 * ────────────────────────────────────────────────────────────── */

/**
 * Löst einen Namen zur verifizierten E-Mail auf. Aktuell Pipedrive-only
 * (System-of-record für die Kunden-E-Mail). Ein CardDAV-Fallback (Kontaktbuch
 * des Beraters) wird separat gebaut und über `opts.cardDavLookup` injiziert —
 * siehe die markierte Naht im Merge-Schritt unten. `email_hint` ist NUR
 * Tie-Breaker, niemals Quelle der Wahrheit.
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

  // CardDAV-Lookup parallel ausführen, falls eingehängt — sonst leer.
  const cardDavLookup = opts.cardDavLookup;
  const [pdRaw, cardRaw] = await Promise.all([
    searchPipedrive(cleanName),
    cardDavLookup ? cardDavLookup(cleanName).catch(() => [] as ContactCandidate[]) : Promise.resolve([]),
  ]);

  const pdCandidates: ContactCandidate[] = pdRaw.map((p) => ({
    name: p.name,
    email: p.email,
    source: "pipedrive",
    id: p.id,
  }));
  // TODO: CardDAV-Fallback wird hier eingehängt (separat in eigenem Worktree gebaut).
  // Bis dahin liefert cardDavLookup standardmäßig nichts → Pipedrive-only.
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
  if (exactPd.length === 1) {
    const pd = exactPd[0];
    const sameInCard = exactCard.some(
      (c) => c.email && pd.email && c.email.toLowerCase() === pd.email.toLowerCase()
    );
    return buildResolved(
      pd,
      typeof pd.id === "number" ? pd.id : null,
      sameInCard ? "both" : "pipedrive"
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

export const contactTools = [resolveContactTool];
