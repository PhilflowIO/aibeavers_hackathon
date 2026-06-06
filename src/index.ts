import { readFile } from "node:fs/promises";
import { runAgent } from "./agent.js";
import { extractActions, type ExtractedActions } from "./extract.js";
import { closePipedriveClient } from "./tools/pipedrive.js";

/**
 * CLI-Einstieg.
 *
 *   pnpm agent "Lies meine letzten 5 Mails und fasse sie zusammen."
 *   pnpm agent "Lege am 12.06.2026 um 10:00 einen Folgetermin mit Herrn Berger an
 *               und schick ihm die Einladung an berger@example.de."
 *
 *   pnpm agent --transcript demo-transcript.json
 *   pnpm agent --transcript demo-transcript.json "Nur den Folgetermin, keine Mail."
 *
 * Mit --transcript wird ZUERST ein dedizierter Extraktions-Call ausgeführt
 * (kein Agent-Loop): das Transkript → strukturiertes JSON. Daraus wird ein
 * selbsterklärendes Briefing gebaut und an runAgent() übergeben, der dann
 * handelt (Termin anlegen, Einladung verschicken, Lücken benennen, CRM pflegen).
 *
 * Ohne Argument läuft eine kurze interaktive REPL.
 */

/** Zieht `--transcript <pfad>` aus argv und gibt {transcriptPath, rest} zurück. */
function parseArgs(argv: string[]): { transcriptPath: string | null; rest: string } {
  const out: string[] = [];
  let transcriptPath: string | null = null;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--transcript" || a === "-t") {
      transcriptPath = argv[++i] ?? null;
      if (!transcriptPath) throw new Error("--transcript erwartet einen Dateipfad.");
    } else {
      out.push(a);
    }
  }
  return { transcriptPath, rest: out.join(" ").trim() };
}

/** Eine Zeile pro gesetztem Feld; null/leer wird übersprungen. */
function field(label: string, value: unknown): string | null {
  if (value == null || value === "") return null;
  return `${label}: ${value}`;
}

/**
 * Baut aus dem Extraktions-Ergebnis ein handlungsorientiertes Briefing für den
 * Agenten — in der Stimme des Beraters, der gerade das Gespräch ausgewertet hat.
 * Es nennt NUR was extrahiert wurde; null-Felder erzeugen keine erfundenen Werte.
 */
function buildBriefing(x: ExtractedActions): string {
  const parts: string[] = [
    "Ich habe gerade das Beratungsgespräch ausgewertet. Hier ist, was zu tun ist.",
    "Verwende ausschließlich die folgenden, aus dem Gespräch extrahierten Angaben — erfinde nichts dazu.",
  ];

  // AUFGABE 1 — Folgetermin (Hero-Flow: anlegen + echte Einladung).
  if (x.folgetermin) {
    const f = x.folgetermin;
    if (f.start_iso && f.end_iso) {
      const detail = [
        field("Titel", f.title),
        field("Ort", f.location),
        field("Teilnehmer", f.attendee_name),
        field("Teilnehmer-E-Mail", f.attendee_email),
      ].filter(Boolean);

      // Schritt-Anweisung: bei Terminvorschlag erst freien Slot suchen,
      // sonst die im Gespräch vereinbarte Zeit direkt verwenden.
      const scheduling = f.is_terminvorschlag
        ? "Dies ist ein TERMINVORSCHLAG — im Gespräch war KEIN festes Datum vereinbart.\n" +
          `Frühester Wunschtag: ${f.start_iso}\n` +
          "→ Schritt 1: Rufe find_free_slot mit earliest_date = diesem Wunschtag auf und " +
          "nimm den zurückgegebenen, garantiert freien start/end-Slot. Erfinde keine Zeit.\n" +
          "→ Schritt 2: Lege den Termin mit genau diesem Slot via create_calendar_event an " +
          "(die Einladung ist ein Vorschlag, RSVP-pflichtig, der Kunde bestätigt)."
        : `Im Gespräch vereinbart: ${f.start_iso} → ${f.end_iso}\n` +
          "→ Prüfe kurz per find_free_slot oder list_calendar_events, dass die Zeit frei ist, " +
          "und lege den Termin dann via create_calendar_event an.";

      parts.push(
        "\nAUFGABE 1 — Folgetermin anlegen und einladen:\n" +
          detail.join("\n") +
          "\n" +
          scheduling +
          (f.attendee_email
            ? "\n→ Schritt 3: Schicke die Einladung via send_email (ICS-Block im Feld " +
              "icalEvent) an die Teilnehmer-E-Mail."
            : "\n→ ACHTUNG: keine Kunden-E-Mail bekannt — versende KEINE Einladung, sondern " +
              "weise ausdrücklich darauf hin, dass die Adresse fehlt.")
      );
    } else {
      parts.push(
        "\nAUFGABE 1 — Folgetermin: ein nächster Termin ist angezeigt (" +
          (f.title ?? "Anlass siehe Gespräch") +
          "), aber es ließ sich KEIN Datum ableiten. Lege nichts an; weise auf die " +
          "fehlende Terminabstimmung hin."
      );
    }
  }

  // AUFGABE 2 — Unterlagen per E-Mail anfordern/zusenden.
  if (x.unterlagen.length) {
    parts.push(
      "\nAUFGABE 2 — Unterlagen per E-Mail anfordern/zusenden:\n" +
        x.unterlagen.map((u) => `  • ${u}`).join("\n") +
        (x.folgetermin?.attendee_email
          ? "\n→ Formuliere eine kurze, freundliche E-Mail an die oben genannte Kunden-E-Mail."
          : "\n→ Sobald die Kunden-E-Mail vorliegt, per send_email anfordern.")
    );
  }

  // AUFGABE 3 — Compliance benennen (nur berichten, nicht 'lösen').
  if (x.compliance_gaps.length) {
    parts.push(
      "\nAUFGABE 3 — Compliance benennen (nur berichten, nicht 'lösen'):\n" +
        x.compliance_gaps.map((g) => `  • ${g}`).join("\n")
    );
  } else {
    parts.push(
      "\nAUFGABE 3 — Compliance: keine offenen Pflicht-Lücken aus dem Transkript. Bestätige das knapp."
    );
  }

  // AUFGABE 4 — CRM (Pipedrive) pflegen, falls Datensatz vorhanden.
  if (x.crm_update) {
    const c = x.crm_update;
    const detail = [
      field("Kunde", c.kunde_name),
      field("Produkt", c.produkt),
      field("Monatsbeitrag (EUR)", c.betrag_eur),
      field("Risikoprofil", c.risikoprofil),
      field("ESG/Nachhaltigkeit", c.esg_praeferenz),
      field("Offenes Folgeprodukt", c.naechstes_produkt),
      field("Hauskauf in (Jahren)", c.hauskauf_in_jahren),
    ].filter(Boolean);
    if (detail.length) {
      parts.push(
        "\nAUFGABE 4 — CRM-Eintrag in Pipedrive pflegen:\n" +
          detail.join("\n") +
          "\n→ Suche die Person/den Deal des Kunden. Existiert ein Datensatz, lege eine " +
          "Notiz mit diesen Eckdaten an. Existiert keiner, melde das — lege nichts Erfundenes an."
      );
    }
  }

  parts.push(
    "\nFühre die Aufgaben in dieser Reihenfolge aus und berichte am Ende knapp, " +
      "was erledigt wurde und welche Lücken offen sind."
  );

  return parts.join("\n");
}

async function once(prompt: string) {
  console.log(`\n🧑  ${prompt}\n`);
  const answer = await runAgent(prompt);
  console.log(`🤖  ${answer}\n`);
}

async function fromTranscript(path: string, extra: string) {
  const raw = await readFile(path, "utf8");
  const transcript = JSON.parse(raw) as object;

  console.log(`\n📄  Werte Transkript aus: ${path}\n`);
  const extracted = await extractActions(transcript);
  console.log("🔎  Extrahierte Aktionen:\n" + JSON.stringify(extracted, null, 2) + "\n");

  let briefing = buildBriefing(extracted);
  if (extra) briefing += `\n\nZusätzliche Anweisung des Beraters: ${extra}`;

  await once(briefing);
}

async function repl() {
  const { createInterface } = await import("node:readline/promises");
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  console.log(
    "Nacharbeits-Agent — gib eine Anweisung ein (oder 'exit' zum Beenden).\n"
  );
  while (true) {
    const lineIn = (await rl.question("🧑  ")).trim();
    if (!lineIn || lineIn === "exit" || lineIn === "quit") break;
    try {
      const answer = await runAgent(lineIn);
      console.log(`🤖  ${answer}\n`);
    } catch (err) {
      console.error(`⚠️  ${(err as Error).message}\n`);
    }
  }
  rl.close();
}

async function main() {
  const { transcriptPath, rest } = parseArgs(process.argv.slice(2));
  if (transcriptPath) return fromTranscript(transcriptPath, rest);
  if (rest) return once(rest);
  return repl();
}

main()
  .catch((err) => {
    console.error("Fehler:", (err as Error).message);
    process.exit(1);
  })
  .finally(() => closePipedriveClient());
