// tsdav liefert seinen ESM-Build als CJS aus (kein "type":"module" im Package),
// daher scheitert Node an Named-Imports → Default-Import + Destrukturierung.
import tsdav, { type DAVCalendar } from "tsdav";
const { createDAVClient } = tsdav;
import { createEvent, type EventAttributes } from "ics";
// ical.js: RFC-5545-konformes Parsing der vom Server gelieferten VEVENTs.
// Ersetzt fragiles Regex (SUMMARY/DTSTART per Hand zerbricht an Line-Folding,
// TZID, Escaping und mehreren VEVENTs pro Objekt). Eigene Implementierung —
// dav-mcp dient nur als konzeptionelles Vorbild, nicht als Code-Quelle.
import ICAL from "ical.js";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { loadCaldavConfig } from "../config.js";

/* ──────────────────────────────────────────────────────────────
 * CalDAV-Client (lazy, einmalig)
 * ────────────────────────────────────────────────────────────── */

type CalDavClient = Awaited<ReturnType<typeof createDAVClient>>;

let _client: CalDavClient | null = null;

async function getClient(): Promise<CalDavClient> {
  if (_client) return _client;
  const cfg = loadCaldavConfig();
  _client = await createDAVClient({
    serverUrl: cfg.CALDAV_SERVER_URL,
    credentials: {
      username: cfg.CALDAV_USER,
      password: cfg.CALDAV_PASSWORD,
    },
    authMethod: "Basic",
    defaultAccountType: "caldav",
  });
  return _client;
}

/** Wählt den Ziel-Kalender: per Name (ENV) oder den ersten gefundenen. */
async function resolveCalendar(): Promise<DAVCalendar> {
  const cfg = loadCaldavConfig();
  const client = await getClient();
  const calendars = await client.fetchCalendars();
  if (!calendars.length) throw new Error("Keine CalDAV-Kalender gefunden.");

  if (cfg.CALDAV_CALENDAR_NAME) {
    const match = calendars.find(
      (c) =>
        (typeof c.displayName === "string" ? c.displayName : "") ===
        cfg.CALDAV_CALENDAR_NAME
    );
    if (!match) {
      const names = calendars
        .map((c) => (typeof c.displayName === "string" ? c.displayName : "?"))
        .join(", ");
      throw new Error(
        `Kalender "${cfg.CALDAV_CALENDAR_NAME}" nicht gefunden. Verfügbar: ${names}`
      );
    }
    return match;
  }
  return calendars[0];
}

/* ──────────────────────────────────────────────────────────────
 * ICS-Generierung
 * ────────────────────────────────────────────────────────────── */

/** ISO-8601-String → ics-Datumstupel [Y, M, D, h, m] (lokale Felder). */
function toIcsDate(iso: string): [number, number, number, number, number] {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) throw new Error(`Ungültiges Datum: ${iso}`);
  return [
    d.getFullYear(),
    d.getMonth() + 1,
    d.getDate(),
    d.getHours(),
    d.getMinutes(),
  ];
}

interface BuildIcsArgs {
  title: string;
  start: string;
  end: string;
  description?: string;
  location?: string;
  attendees?: { name?: string; email: string }[];
  organizerEmail?: string;
}

function buildIcs(args: BuildIcsArgs): string {
  const event: EventAttributes = {
    title: args.title,
    start: toIcsDate(args.start),
    end: toIcsDate(args.end),
    description: args.description,
    location: args.location,
    status: "CONFIRMED",
    busyStatus: "BUSY",
    organizer: args.organizerEmail
      ? { name: "Berater Agent", email: args.organizerEmail }
      : undefined,
    attendees: args.attendees?.map((a) => ({
      name: a.name,
      email: a.email,
      rsvp: true,
      partstat: "NEEDS-ACTION",
      role: "REQ-PARTICIPANT",
    })),
  };
  const { error, value } = createEvent(event);
  if (error || !value) {
    throw new Error(`ICS-Erzeugung fehlgeschlagen: ${error?.message ?? "?"}`);
  }
  return toStoredCalendarObject(value);
}

/**
 * Macht aus dem ics-Output ein RFC-4791-konformes CalDAV-Speicherobjekt.
 *
 * Die ics-Library setzt per Default `METHOD:PUBLISH` (+ `X-PUBLISHED-TTL`).
 * Ein auf dem CalDAV-Server gespeichertes Objekt darf laut RFC 4791 §4.1
 * KEIN METHOD tragen (das gehört ausschließlich in iTIP/iMIP-Nachrichten) —
 * SabreDAV/Baikal lehnt es sonst mit HTTP 415 ab. Für den E-Mail-Versand
 * setzt send_email die Transport-Form (METHOD:REQUEST) separat.
 */
function toStoredCalendarObject(ics: string): string {
  return ics
    .split(/\r?\n/)
    .filter((line) => !/^(METHOD|X-PUBLISHED-TTL):/i.test(line))
    .join("\r\n");
}

/* ──────────────────────────────────────────────────────────────
 * ICS-Parsing (RFC 5545 via ical.js)
 * ────────────────────────────────────────────────────────────── */

interface ParsedEvent {
  summary: string;
  start: Date | null;
  end: Date | null;
  allDay: boolean;
  location: string;
  description: string;
  attendees: string[];
  isRecurring: boolean;
}

/**
 * Zerlegt einen rohen VCALENDAR-Block in strukturierte Termine. Liest ALLE
 * enthaltenen VEVENTs (ein CalDAV-Objekt kann mehrere tragen, z.B. Ausnahmen
 * einer Serie). Wirft bei kaputten Daten — der Aufrufer fängt das pro Objekt ab.
 */
export function parseEvents(icalData: string): ParsedEvent[] {
  const comp = new ICAL.Component(ICAL.parse(icalData));
  const vevents = comp.getAllSubcomponents("vevent");
  return vevents.map((ve) => {
    const ev = new ICAL.Event(ve);
    const start = ev.startDate ?? null;
    return {
      summary: ev.summary || "(kein Titel)",
      start: start ? start.toJSDate() : null,
      end: ev.endDate ? ev.endDate.toJSDate() : null,
      allDay: start ? start.isDate : false,
      location: ev.location || "",
      description: ev.description || "",
      attendees: ve.getAllProperties("attendee").map((a) => {
        const cn = a.getParameter("cn");
        const name = typeof cn === "string" ? cn : "";
        const addr = String(a.getFirstValue() ?? "").replace(/^mailto:/i, "");
        return name ? `${name} <${addr}>` : addr;
      }),
      isRecurring: ev.isRecurring(),
    };
  });
}

const DATE_TIME_FMT = new Intl.DateTimeFormat("de-DE", {
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Berlin",
});

const DATE_FMT = new Intl.DateTimeFormat("de-DE", {
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "Europe/Berlin",
});

/** Formatiert den Zeitraum eines Termins menschen-/LLM-lesbar (Europe/Berlin). */
function formatRange(ev: ParsedEvent): string {
  if (!ev.start) return "Zeit unbekannt";
  if (ev.allDay) return `${DATE_FMT.format(ev.start)} (ganztägig)`;
  const s = DATE_TIME_FMT.format(ev.start);
  const e = ev.end ? DATE_TIME_FMT.format(ev.end) : "?";
  return `${s} → ${e}`;
}

/** Ein Termin als mehrzeiliger Listeneintrag. */
export function formatEvent(ev: ParsedEvent): string {
  const parts = [`• ${ev.summary} | ${formatRange(ev)}`];
  if (ev.location) parts.push(`    Ort: ${ev.location}`);
  if (ev.attendees.length) parts.push(`    Teilnehmer: ${ev.attendees.join(", ")}`);
  if (ev.isRecurring) parts.push(`    (wiederkehrend)`);
  return parts.join("\n");
}

/* ──────────────────────────────────────────────────────────────
 * Tools
 * ────────────────────────────────────────────────────────────── */

export const listEventsTool = tool(
  async ({ start, end }) => {
    const client = await getClient();
    const calendar = await resolveCalendar();
    const objects = await client.fetchCalendarObjects({
      calendar,
      timeRange:
        start && end
          ? { start: new Date(start).toISOString(), end: new Date(end).toISOString() }
          : undefined,
    });
    if (!objects.length) return "Keine Termine im angefragten Zeitraum.";

    const events = objects.flatMap((o) => {
      const data = o.data ?? "";
      try {
        return parseEvents(data);
      } catch {
        // Kaputtes/unbekanntes Objekt nicht verschweigen, aber nicht erfinden.
        return [
          {
            summary: "(Termin nicht lesbar)",
            start: null,
            end: null,
            allDay: false,
            location: "",
            description: "",
            attendees: [],
            isRecurring: false,
          } satisfies ParsedEvent,
        ];
      }
    });

    // Chronologisch sortieren; Termine ohne Startdatum ans Ende.
    events.sort(
      (a, b) => (a.start?.getTime() ?? Infinity) - (b.start?.getTime() ?? Infinity)
    );

    return (
      `Termine in "${
        typeof calendar.displayName === "string" ? calendar.displayName : "Kalender"
      }":\n` + events.map(formatEvent).join("\n")
    );
  },
  {
    name: "list_calendar_events",
    description:
      "Liest Termine aus dem CalDAV-Kalender. Optional auf einen Zeitraum (start/end, " +
      "ISO-8601) eingrenzen. Nutze dies, um vor dem Anlegen eines Folgetermins die " +
      "Verfügbarkeit zu prüfen.",
    schema: z.object({
      start: z
        .string()
        .optional()
        .describe("Beginn des Zeitraums, ISO-8601 (z.B. 2026-06-08T00:00:00)"),
      end: z
        .string()
        .optional()
        .describe("Ende des Zeitraums, ISO-8601"),
    }),
  }
);

export const createEventTool = tool(
  async ({ title, start, end, description, location, attendees }) => {
    const cfg = loadCaldavConfig();
    const client = await getClient();
    const calendar = await resolveCalendar();

    const ics = buildIcs({
      title,
      start,
      end,
      description,
      location,
      attendees,
      organizerEmail: cfg.CALDAV_USER.includes("@") ? cfg.CALDAV_USER : undefined,
    });

    // UID aus dem ICS ziehen → eindeutiger Dateiname auf dem Server.
    const uid = /UID:(.*)/.exec(ics)?.[1]?.trim() ?? `${Date.now()}@aibeavers`;
    const res = await client.createCalendarObject({
      calendar,
      filename: `${uid}.ics`,
      iCalString: ics,
    });

    if (!res.ok) {
      return `Termin konnte nicht angelegt werden (HTTP ${res.status}). Server: ${res.statusText}`;
    }
    return [
      `Termin "${title}" angelegt (${start} → ${end}).`,
      attendees?.length
        ? `Teilnehmer: ${attendees.map((a) => a.email).join(", ")}.`
        : "",
      "ICS_BEGIN",
      ics,
      "ICS_END",
      "Hinweis: Den ICS-Block kannst du via send_email (Feld icalEvent) als Einladung verschicken.",
    ]
      .filter(Boolean)
      .join("\n");
  },
  {
    name: "create_calendar_event",
    description:
      "Legt einen neuen Termin im CalDAV-Kalender an (z.B. einen Folgetermin nach dem " +
      "Beratungsgespräch). Gibt den erzeugten ICS-Inhalt zurück, der anschließend per " +
      "send_email als echte Kalender-Einladung an den Kunden verschickt werden kann.",
    schema: z.object({
      title: z.string().describe("Titel des Termins"),
      start: z.string().describe("Startzeit, ISO-8601 (z.B. 2026-06-12T10:00:00)"),
      end: z.string().describe("Endzeit, ISO-8601"),
      description: z.string().optional().describe("Agenda / Beschreibung"),
      location: z.string().optional().describe("Ort oder Videolink"),
      attendees: z
        .array(z.object({ name: z.string().optional(), email: z.string() }))
        .optional()
        .describe("Eingeladene Teilnehmer"),
    }),
  }
);

export const calendarTools = [listEventsTool, createEventTool];
