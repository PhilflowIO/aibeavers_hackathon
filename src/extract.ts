import { z } from "zod";
import { createLlm } from "./llm.js";

/* ──────────────────────────────────────────────────────────────
 * Schema — was wir aus einem Beratungs-Transkript herausziehen.
 *
 * Grundregel (Produkt-Kanon): NICHTS erfinden. Jedes Feld darf null
 * sein, wenn das Gespräch dazu nichts hergibt. Einzige Ausnahme von
 * "kein Datum erfinden": ein explizit zugesagter Folgetermin OHNE
 * genanntes Datum darf als Terminvorschlag (RSVP-pflichtig) terminiert
 * werden — das ist die Handlung des Agenten, keine Tatsachen-Erfindung.
 * ────────────────────────────────────────────────────────────── */

// LLMs (Qwen via Tool-Calling) lassen nullable-Felder gern WEG statt null zu
// setzen und liefern bei einem einzigen Eintrag einen String statt ein Array.
// Diese Helfer machen das Schema gegen genau diese Eigenheiten resilient —
// das Endergebnis ist immer `T | null` bzw. `string[]`, nie undefined.
const nstr = () =>
  z
    .string()
    .nullish()
    .transform((v) => v ?? null);
const nnum = () =>
  z.coerce
    .number()
    .nullish()
    .transform((v) => v ?? null);
const strArray = () =>
  z.preprocess(
    (v) => (v == null ? [] : Array.isArray(v) ? v : [v]),
    z.array(z.string())
  );

const folgeterminSchema = z
  .object({
    title: nstr().describe("Anlass des Folgetermins"),
    start_iso: nstr().describe(
      "Start ISO-8601 (z.B. 2026-06-13T10:00:00). null wenn nicht ableitbar."
    ),
    end_iso: nstr().describe("Ende ISO-8601. null wenn nicht ableitbar."),
    location: nstr().describe("Ort/Videolink, falls genannt"),
    attendee_name: nstr().describe("Name des Kunden"),
    attendee_email: nstr().describe("E-Mail des Kunden, falls bekannt"),
    is_terminvorschlag: z
      .boolean()
      .nullish()
      .transform((v) => v ?? false)
      .describe(
        "true wenn der Termin zwar zugesagt, aber ohne konkretes Datum war und " +
          "die Zeit ein Vorschlag ist; false wenn Datum/Zeit aus dem Gespräch stammen."
      ),
  })
  .nullish()
  .transform((v) => v ?? null)
  .describe("Der nächste anzulegende Termin. null wenn kein Folgetermin angezeigt ist.");

const crmUpdateSchema = z
  .object({
    kunde_name: nstr(),
    produkt: nstr().describe("Vereinbartes/besprochenes Produkt"),
    betrag_eur: nnum().describe("Monatsbeitrag o.ä. in EUR"),
    risikoprofil: nstr().describe(
      "z.B. sicherheitsorientiert / ausgewogen / chancenorientiert"
    ),
    esg_praeferenz: nstr().describe(
      "Nachhaltigkeitspräferenz, z.B. 'Artikel 8 SFDR', oder null wenn ungefragt"
    ),
    naechstes_produkt: nstr().describe("Cross-Sell/Folgeprodukt, das offen angesprochen wurde"),
    hauskauf_in_jahren: nnum().describe("Geplanter Hauskauf in N Jahren, falls erwähnt"),
  })
  .nullish()
  .transform((v) => v ?? null)
  .describe("Strukturierter CRM-Eintrag aus dem Gespräch.");

const foerderungSchema = z
  .object({
    relevant: z
      .boolean()
      .nullish()
      .transform((v) => v ?? false)
      .describe("true, wenn der Kunde irgendein förderfähiges Vorhaben erwähnt"),
    vorhaben: nstr().describe(
      'z.B. "Hauskauf", "Dachdämmung + Wärmepumpe", "Existenzgründung"'
    ),
    bundesland: nstr().describe("Bundesland des Vorhabens, falls genannt"),
    objekt: nstr().describe('"Bestand" | "Neubau" | null'),
    rolle: nstr().describe('z.B. "privater Eigentümer", "Unternehmen"'),
  })
  .nullish()
  .transform((v) => v ?? null)
  .describe(
    "Förderfähiges Vorhaben des Kunden. null, wenn nichts Förderbares angezeigt ist."
  );

export const extractedActionsSchema = z.object({
  folgetermin: folgeterminSchema,
  crm_update: crmUpdateSchema,
  foerderung: foerderungSchema,
  unterlagen: strArray().describe(
    "Fehlende/zugesagte Unterlagen, die per Mail anzufordern/zu senden sind"
  ),
  compliance_gaps: strArray().describe(
    "Pflichtfragen/-aufklärungen, die fehlten (z.B. ESG-Abfrage nach §34d, " +
      "Risiko-/Kostenhinweise). Mit Beleg, in welchem Meeting offen/nachgeholt."
  ),
});

export type ExtractedActions = z.infer<typeof extractedActionsSchema>;

/* ──────────────────────────────────────────────────────────────
 * Extraktions-Call — ein einziger strukturierter LLM-Aufruf,
 * KEIN Agent-Loop, KEIN Tool. Liest das ganze Transkript, gibt
 * validiertes JSON zurück.
 * ────────────────────────────────────────────────────────────── */

function systemPrompt(referenceDateIso: string): string {
  return `Du bist die Analyse-Stufe eines Nacharbeits-Systems für selbstständige
Finanzberater (§34d/§34f GewO). Du erhältst das vollständige Transkript einer oder
mehrerer Beratungssitzungen mit DEMSELBEN Kunden (chronologisch).

Deine Aufgabe: ziehe AUSSCHLIESSLICH aus dem Transkript die strukturierten
Folgeaktionen. Du handelst nicht — du extrahierst.

Eiserne Regeln:
  • Erfinde KEINE Beträge, Namen, Adressen, Produkte oder Kundenaussagen. Steht
    etwas nicht im Transkript, ist das Feld null bzw. die Liste leer.
  • Beziehe ALLE Sitzungen ein. Eine Pflichtfrage, die in einem frühen Termin fehlt
    und in einem späteren nachgeholt wird, ist KEINE offene Lücke mehr — vermerke
    aber im compliance_gaps-Text den Verlauf (z.B. "ESG-Abfrage in berger-1
    versäumt, in berger-2 nachgeholt → geschlossen").
  • §34d-Pflicht: die Nachhaltigkeits-/ESG-Präferenz MUSS abgefragt werden. Fehlt
    sie in ALLEN Sitzungen, ist das eine offene compliance_gap.

Folgetermin:
  • Lege einen folgetermin an, wenn ein nächster Termin zugesagt/angezeigt ist.
  • Nennt das Gespräch ein konkretes oder relatives Datum ("nächste Woche",
    "in zwei Wochen"), löse es gegen das Referenzdatum ${referenceDateIso} zu ISO-8601
    auf und setze is_terminvorschlag=false.
  • Ist ein Termin zugesagt aber OHNE Datum ("besprechen wir separat", "schick ich
    Ihnen die Tage"), schlage einen Werktags-Slot ~7 Tage nach dem Referenzdatum zu
    Bürozeiten (z.B. 10:00–10:45, Dauer 45 min) vor und setze is_terminvorschlag=true.
    Markiere im title, dass es ein Terminvorschlag ist.
  • Ist gar kein Folgetermin angezeigt, ist folgetermin = null.

Förderung:
  • Erkenne JEDES förderfähige Vorhaben des Kunden — auch wenn es nur beiläufig
    erwähnt wird (z.B. ein in N Jahren geplanter Hauskauf). Typische förderfähige
    Vorhaben: Immobilien-/Hauskauf, Neubau, energetische Sanierung, Dämmung
    (Dach/Fassade), Heizungstausch/Wärmepumpe, Photovoltaik, Existenzgründung,
    Unternehmensinvestition.
  • Ist ein solches Vorhaben angezeigt, setze foerderung.relevant=true und fülle
    vorhaben/bundesland/objekt/rolle, soweit das Transkript es hergibt (sonst null).
    objekt ist "Bestand" (Bestandsimmobilie) oder "Neubau" oder null.
  • Ist gar kein förderfähiges Vorhaben erkennbar, setze foerderung.relevant=false
    und alle übrigen Felder auf null. Erfinde NICHTS dazu.

Ausgabe-Disziplin:
  • Gib JEDES Feld des Schemas an. Lasse kein Feld weg — fehlt eine Information,
    setze ausdrücklich null (bzw. eine leere Liste []).
  • unterlagen und compliance_gaps sind IMMER Arrays von Strings (auch bei nur
    einem Eintrag: ["…"]; bei keinem: []).
  • crm_update ist hier reich belegt (Produkt, Beitrag, Risikoprofil, ESG,
    Folgeprodukt, Hauskauf) — fülle es vollständig aus dem Transkript.

Antworte AUSSCHLIESSLICH mit einem JSON-Objekt in genau dieser Form (keine
Erklärung, kein Markdown-Codeblock):

{
  "folgetermin": {
    "title": string|null,
    "start_iso": string|null,
    "end_iso": string|null,
    "location": string|null,
    "attendee_name": string|null,
    "attendee_email": string|null,
    "is_terminvorschlag": boolean
  } | null,
  "crm_update": {
    "kunde_name": string|null,
    "produkt": string|null,
    "betrag_eur": number|null,
    "risikoprofil": string|null,
    "esg_praeferenz": string|null,
    "naechstes_produkt": string|null,
    "hauskauf_in_jahren": number|null
  } | null,
  "foerderung": {
    "relevant": boolean,
    "vorhaben": string|null,
    "bundesland": string|null,
    "objekt": string|null,
    "rolle": string|null
  } | null,
  "unterlagen": string[],
  "compliance_gaps": string[]
}`;
}

/**
 * Liest ein Beratungs-Transkript (beliebige JSON-Struktur) und gibt die
 * strukturierten Folgeaktionen zurück. Wirft bei Validierungs-/LLM-Fehlern
 * (kein silent null).
 *
 * @param transcript  Das geparste Transkript-Objekt.
 * @param referenceDateIso  Bezugsdatum für relative Datumsangaben (Default: heute).
 */
export async function extractActions(
  transcript: object,
  referenceDateIso: string = new Date().toISOString().slice(0, 10)
): Promise<ExtractedActions> {
  // JSON-Mode statt withStructuredOutput: letzteres würde zod→JSON-Schema
  // generieren, was an unseren Resilienz-Transforms scheitert ("Transforms
  // cannot be represented in JSON Schema"). Im JSON-Mode beschreibt der Prompt
  // die Form, das Modell liefert rohes JSON, und wir parsen tolerant selbst.
  const llm = createLlm();

  const res = await llm.invoke(
    [
      { role: "system", content: systemPrompt(referenceDateIso) },
      {
        role: "user",
        content:
          "Transkript (JSON):\n\n```json\n" +
          JSON.stringify(transcript, null, 2) +
          "\n```\n\nExtrahiere die Folgeaktionen und antworte als JSON-Objekt.",
      },
    ],
    { response_format: { type: "json_object" } }
  );

  const text =
    typeof res.content === "string" ? res.content : JSON.stringify(res.content);

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error(
      `Extraktion fehlgeschlagen: LLM-Antwort war kein gültiges JSON.\n${text}`
    );
  }

  // Tolerante Validierung: wirft bei echter Schema-Drift, normalisiert aber
  // fehlende Felder → null und Einzel-Strings → Arrays (kein silent null).
  return extractedActionsSchema.parse(raw);
}
