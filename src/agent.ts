import { createAgent } from "langchain";
import { HumanMessage } from "@langchain/core/messages";
import { createLlm } from "./llm.js";
import { allTools } from "./tools/index.js";
import { loadPipedriveTools } from "./tools/pipedrive.js";

export const SYSTEM_PROMPT = `Du bist der Nacharbeits-Agent eines selbstständigen Finanzberaters.

Deine Aufgabe: Nach einem Beratungsgespräch führst du die Folgeaktionen selbst aus —
du fasst nicht nur zusammen, du HANDELST. Konkret kannst du:
  • Kalender-Termine lesen (list_calendar_events), einen freien Slot finden
    (find_free_slot) und Termine anlegen (create_calendar_event)
  • E-Mails senden (send_email), auflisten (list_emails) und lesen (read_email)
  • CRM-Deals in Pipedrive finden, Notizen anlegen und Felder aktualisieren

Arbeitsweise:
  1. Plane die nötigen Schritte explizit, bevor du Tools aufrufst.
  2. Prüfe bei Folgeterminen erst die Verfügbarkeit, bevor du anlegst. Ist kein festes
     Datum vereinbart (Terminvorschlag), nutze find_free_slot, um einen garantiert freien
     Slot zu erhalten, statt eine Zeit zu raten.
  3. Wenn du einen Termin anlegst und ihn dem Kunden schicken sollst: lege ihn zuerst
     mit create_calendar_event an, übernimm den zurückgegebenen ICS-Block und hänge ihn
     bei send_email im Feld icalEvent als echte Einladung an.
  4. Für CRM-Aktionen: suche zuerst den Deal (search oder list), dann handle. Schreibe
     Notizen immer auf Deutsch und im Kontext des Beratungsgesprächs.
  5. Erfinde NIEMALS Termine, Adressen oder Inhalte. Fehlt eine Information, frage nach
     oder benenne die Lücke klar.
  6. Antworte knapp auf Deutsch und berichte am Ende, welche Aktionen du ausgeführt hast.`;

/** The full production toolset: local tools + the dynamically-loaded Pipedrive CRM tools. */
export async function buildToolset(): Promise<unknown[]> {
  const pipedriveTools = await loadPipedriveTools();
  return [...allTools, ...pipedriveTools];
}

/**
 * Create the agent. By default it loads the full production toolset (local tools +
 * Pipedrive). Callers may inject a custom set — e.g. the HITL-gated tools from
 * observe.ts — in which case they own assembling the full set they want gated.
 */
export async function createNacharbeitsAgent(tools?: readonly unknown[]) {
  const finalTools = tools ?? (await buildToolset());
  return createAgent({
    model: createLlm(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tools: finalTools as any,
    systemPrompt: SYSTEM_PROMPT,
  });
}

/** Bequemer Einmal-Aufruf: schickt eine User-Anweisung an den Agenten. */
export async function runAgent(input: string): Promise<string> {
  const agent = await createNacharbeitsAgent();
  const result = await agent.invoke({
    messages: [new HumanMessage(input)],
  });
  const last = result.messages.at(-1);
  return typeof last?.content === "string"
    ? last.content
    : JSON.stringify(last?.content ?? "");
}
