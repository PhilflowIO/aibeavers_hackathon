import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";

/**
 * Arbeitszeiten & Termin-Präferenzen des Beraters.
 *
 * Anders als die Subsystem-Creds (SMTP/IMAP/CalDAV in `config.ts`) sind das
 * keine Secrets, sondern fachliche Konfiguration — daher eine versionierbare
 * JSON-Datei (`berater-config.json`) statt ENV. `find_free_slot` nutzt diese
 * Werte als Default, wenn ein Folgetermin-Slot gesucht wird; der Agent muss die
 * Arbeitszeiten so nicht "raten" und nicht aus dem Transkript ableiten.
 *
 * Fehlt die Datei, greifen die Schema-Defaults — der Agent bleibt lauffähig.
 */

const HHMM = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Zeit muss im Format HH:MM sein (z.B. 09:00)");

const zeitfenster = z.object({ start: HHMM, ende: HHMM });

export const beraterConfigSchema = z
  .object({
    name: z.string().optional(),
    zeitzone: z.string().default("Europe/Berlin"),
    // ISO-Wochentage: 1=Montag … 7=Sonntag.
    arbeitstage: z
      .array(z.number().int().min(1).max(7))
      .min(1, "mindestens ein Arbeitstag nötig")
      .default([1, 2, 3, 4, 5]),
    arbeitszeit: zeitfenster.default({ start: "09:00", ende: "17:00" }),
    // null = keine Mittagspause; sonst gesperrtes Intervall innerhalb der Arbeitszeit.
    mittagspause: zeitfenster
      .nullable()
      .default({ start: "12:30", ende: "13:30" }),
    standard_termin_dauer_min: z.number().int().positive().default(45),
    slot_raster_min: z.number().int().positive().default(15),
    suchfenster_tage: z.number().int().positive().default(14),
  })
  .superRefine((cfg, ctx) => {
    if (hhmmToMinutes(cfg.arbeitszeit.ende) <= hhmmToMinutes(cfg.arbeitszeit.start)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["arbeitszeit"],
        message: "arbeitszeit.ende muss nach arbeitszeit.start liegen",
      });
    }
    if (cfg.mittagspause) {
      const ws = hhmmToMinutes(cfg.arbeitszeit.start);
      const we = hhmmToMinutes(cfg.arbeitszeit.ende);
      const ps = hhmmToMinutes(cfg.mittagspause.start);
      const pe = hhmmToMinutes(cfg.mittagspause.ende);
      if (pe <= ps) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["mittagspause"],
          message: "mittagspause.ende muss nach mittagspause.start liegen",
        });
      }
      if (ps < ws || pe > we) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["mittagspause"],
          message: "mittagspause muss innerhalb der arbeitszeit liegen",
        });
      }
    }
  });

export type BeraterConfig = z.infer<typeof beraterConfigSchema>;

let _cfg: BeraterConfig | null = null;

/** "HH:MM" → Minuten seit Mitternacht (z.B. "09:30" → 570). */
export function hhmmToMinutes(value: string): number {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Lädt die Berater-Config (lazy, einmalig gecached). Pfad via
 * `BERATER_CONFIG_PATH` überschreibbar, Default `berater-config.json` im cwd.
 * Fehlt die Datei → Schema-Defaults. Ungültige Datei → klarer Fehler (kein
 * stilles Zurückfallen auf Defaults, sonst maskieren wir Tippfehler).
 */
export function loadBeraterConfig(): BeraterConfig {
  if (_cfg) return _cfg;

  const path = resolve(process.env.BERATER_CONFIG_PATH ?? "berater-config.json");
  let raw: unknown = {};
  try {
    raw = JSON.parse(readFileSync(path, "utf8"));
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    if (e.code === "ENOENT") {
      raw = {}; // keine Datei → Defaults
    } else {
      throw new Error(`[berater-config] ${path} nicht lesbar/parsebar: ${e.message}`);
    }
  }

  const parsed = beraterConfigSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new Error(`[berater-config] Ungültige Konfiguration in ${path}:\n${issues}`);
  }
  _cfg = parsed.data;
  return _cfg;
}
