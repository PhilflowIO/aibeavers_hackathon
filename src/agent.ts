import { createAgent } from "langchain";
import { HumanMessage } from "@langchain/core/messages";
import { createLlm } from "./llm.js";
import { allTools } from "./tools/index.js";

const SYSTEM_PROMPT = `Du bist der Nacharbeits-Agent eines selbstständigen Finanzberaters.

Deine Aufgabe: Nach einem Beratungsgespräch führst du die Folgeaktionen selbst aus —
du fasst nicht nur zusammen, du HANDELST. Konkret kannst du:
  • Kalender-Termine lesen (list_calendar_events) und anlegen (create_calendar_event)
  • E-Mails senden (send_email), auflisten (list_emails) und lesen (read_email)

Arbeitsweise:
  1. Plane die nötigen Schritte explizit, bevor du Tools aufrufst.
  2. Prüfe bei Folgeterminen erst die Verfügbarkeit, bevor du anlegst.
  3. Wenn du einen Termin anlegst und ihn dem Kunden schicken sollst: lege ihn zuerst
     mit create_calendar_event an, übernimm den zurückgegebenen ICS-Block und hänge ihn
     bei send_email im Feld icalEvent als echte Einladung an.
  4. Erfinde NIEMALS Termine, Adressen oder Inhalte. Fehlt eine Information, frage nach
     oder benenne die Lücke klar.
  5. Antworte knapp auf Deutsch und berichte am Ende, welche Aktionen du ausgeführt hast.`;

export function createNacharbeitsAgent() {
  return createAgent({
    model: createLlm(),
    tools: allTools,
    systemPrompt: SYSTEM_PROMPT,
  });
}

/** Bequemer Einmal-Aufruf: schickt eine User-Anweisung an den Agenten. */
export async function runAgent(input: string): Promise<string> {
  const agent = createNacharbeitsAgent();
  const result = await agent.invoke({
    messages: [new HumanMessage(input)],
  });
  const last = result.messages.at(-1);
  return typeof last?.content === "string"
    ? last.content
    : JSON.stringify(last?.content ?? "");
}
