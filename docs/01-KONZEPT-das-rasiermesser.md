> ⚠️ **ÜBERHOLT (2026-06-05).** „Abwesenheit beweisen über den Bestand" = der verworfene Angst-Frame. Kanonisch ist jetzt → `02-KONZEPT-der-nacharbeits-agent.md`. Hier nur als Historie.

# 01 — KONZEPT: Das Rasiermesser

*Die geschärfte Essenz. Schärft `00-FINAL` zu. Leitprinzip: EINE Sache, maximale Tiefe, null Sprawl. Alles, was hier nicht steht, ist Roadmap — nicht Pitch, nicht Tagesbau.*

---

## Das Rasiermesser (die eine Sache)

> **Der Agent sieht, was im Gespräch *fehlt* — und beweist es mit der Quelle.**

Der Notetaker schreibt mit, was *gesagt* wurde. Unser Agent fängt, was **nicht** gesagt wurde — und belegt seine Behauptung, statt sie zu raten.

Eine Demo, die *nur* das zeigt, macht den Raum still:
> *„Der Berater hat die gesetzlich vorgeschriebene Nachhaltigkeitsfrage nie gestellt. Der Agent hat's gemerkt, hat das ganze Gespräch geprüft, und sagt dir: an keiner Stelle gefragt — hier ist der Beweis, und hier ist die Frage, die fehlt."*

---

## Warum das gewinnt (vier Dinge auf einmal)

1. **Echt agentisch.** Eine *Abwesenheit* zu beweisen ist schwerer als Retrieval: der Agent muss das Gespräch erschöpfend gegen ein externes Regel-Wissen prüfen und mit Sicherheit sagen „kommt nicht vor". Das kann ein Notetaker oder ein Ein-Prompt-Wrapper **strukturell nicht**. Hier steckt die Engineering-Tiefe — nicht in der Breite von Integrationen.
2. **Grounded = Anti-Halluzination intrinsisch.** „Fehlt" zu behaupten *erzwingt* Belegbarkeit (erschöpfte Suche + Refusal-Floor: „ich rate nicht, ich hab alles geprüft"). Genau der Zahn gegen „aber KI halluziniert".
3. **Tiefster Käufer-Schmerz.** Ein lückenhaftes Protokoll dreht im Streitfall die Beweislast gegen den Berater (Beweislastumkehr, existenziell). Der Agent ist der Schutzschild, der die Lücke fängt, *bevor* sie zum Haftungsfall wird.
4. **Die Antithese zum Notetaker in einem Satz.** „Der schreibt, was war — unserer fängt, was fehlt." Kein „wie Otter, aber souverän". Eine strukturell andere Sache.

**Und der wichtigste Effekt: es ist EINE Sache.** Kein „und wir machen auch noch CRM, Voice, Joiner, eigene Infra". Jede zusätzliche Behauptung im Pitch verwässert das Rasiermesser. Disziplin = weglassen.

---

## Positionierung (Service-Form, eine Zeile)

> **„Wir sind die Compliance-Kontrolle des Finanzberaters: jedes Beratungsgespräch wird automatisch auf gesetzliche Lücken geprüft — belegt, nicht geraten. Über den ganzen Bestand."**

First sentence (15 Sek):
> *„Ein lückenhaftes Beratungsprotokoll dreht im Streitfall die Beweislast gegen den Berater. Notetaker schreiben mit, was gesagt wurde — unser Agent fängt, was *fehlt*: er prüft jedes Gespräch gegen die gesetzlichen Pflichtfelder und beweist die Lücke mit der Stelle. Lokal, souverän."*

---

## Was wir bauen (frisch, agentisch, schmal-aber-tief)

Ein **frischer Agent mit Tool-Use-Loop** (am 06.06. von null, public Repo). Der Loop ist der Kern — nicht ein einzelner Prompt:

1. **`retrieve`** — holt die relevanten Stellen aus dem/den Gespräch(en). Bei mehreren Gesprächen über den Bestand: echtes Retrieval (pgvector-dense über einen kleinen frischen Korpus). *Hier* ist Retrieval kein Shiny Object, sondern nötig — und es macht den „über den Bestand"-Beweis echt.
2. **`check_compliance`** — reasoned die Pflichtfelder (VVG §61/§18 FinVermV, ESG seit 02.08.2022) gegen das Gespräch. **Kernfähigkeit: eine Abwesenheit feststellen** — erschöpfend, mit Konfidenz.
3. **`prove`** — verankert jeden Befund mit der Quelle (für ein „vorhanden": die Stelle; für ein „fehlt": Nachweis der erschöpften Suche + Refusal-Floor).
4. **`draft_fix`** — formuliert die fehlende Pflicht-Frage / den nachzuholenden Punkt fertig aus. *Das* ist der sichtbare Akt — frisch gebaut, keine externe Integration nötig.

Alles über **APIs, kein eigenes Infra** (OpenAI/Qwen für das Reasoning; pgvector frisch aufgesetzt). Input = `demo-transcript.json` (+ ein kleiner frischer Bestand, generier ich).

**Die Tiefe steckt im Loop und im „Abwesenheit beweisen", nicht in der Anzahl der Features.** Das ist, was nach zwei agentic engineers aussieht statt nach Vibe-Coder.

---

## Was wir BEWUSST NICHT bauen / nicht pitchen (= Roadmap, kein Sprawl)

Jedes davon würde die Positionierung verwässern und/oder die Regeln brechen:

- ❌ **CRM-/Kalender-Integrationssuite** — Roadmap. Ravens Code dürfen wir eh nicht importieren; eine eigene Suite ist Sprawl. Der „Akt" ist `draft_fix`, nicht ein CRM-Write.
- ❌ **Voxtral auf eigener GPU / Headscale** — eigene Infra = wie eigener Code = Mogel-Risiko. Falls STT überhaupt: Voxtral-API. Demo läuft aus Transkript.
- ❌ **Meeting-Bot / Joiner** — die Antithese-zu-Raven-Vision, aber Plumbing + in 9h nicht baubar. Lebt als *eine Roadmap-Zeile* im Pitch, nicht im Build.
- ❌ **Voice / ElevenLabs** — nettes Wow, aber nicht das Rasiermesser. Optionaler Flourish ganz am Ende, wenn Zeit — kein Kern.
- ❌ **Cross-Sell-Engine** — sekundär. Höchstens ein Nebensatz, nicht der Hero.
- ❌ **LettuceDetect / RRF / Reranker** — Infra-Flex, kein agentischer Beweis. Raus.

> Regel: kommt im Pitch ein zweites „und wir machen auch…", streichen. Das Rasiermesser verträgt keinen zweiten Satz.

---

## Die Demo (ein Moment, knapp drumherum)

1. **[0:00–0:20] Hook:** First sentence. „Hier ist ein echtes Riester-Beratungsgespräch."
2. **[0:20–1:00] Der Moment:** Agent prüft → rotes Flag: *„Nachhaltigkeitspräferenz: nie abgefragt. Pflicht seit 02.08.2022."* Und — der Beweis: *„Ich habe das gesamte Gespräch geprüft, an keiner Stelle gefragt."* (Refusal-Floor sichtbar: er rät nicht.) Gegenprobe: ein *vorhandenes* Feld → Klick auf den Beleg → Sprung zur Stelle. **„Belegt, nicht geraten."**
3. **[1:00–1:40] Tiefe = über den Bestand:** *„Und über alle Gespräche von Herrn Berger?"* → Agent retrieved über den Korpus → listet die Lücken belegt. Das ist der System-of-Record-Beweis — der Beat, den ein Notetaker strukturell nicht kann.
4. **[1:40–2:10] Der Akt:** Agent legt die fehlende Frage fertig formuliert hin (`draft_fix`) — *„hier ist genau die Frage, die nächste Woche fehlt."*
5. **[2:10–3:00] Close:** Antithese-Satz + Souveränität (lokal/EU, bei Finanzdaten Pflicht) + ehrlich: frisch heute gebaut; der Joiner in fremde Calls ist der nächste Schritt. Schluss: *„Notetaker schreiben mit, was war. Wir fangen, was fehlt — bevor es zum Haftungsfall wird."*

---

## Build-Kern (technisch, frisch)
- **Agent-Loop** (OpenAI/Qwen, Tool-Use): `retrieve` · `check_compliance` · `prove` · `draft_fix`.
- **Retrieval:** pgvector-dense über einen **kleinen frischen Korpus (10–20 synthetische Gespräche)** — macht „über den Bestand" echt. (Kein RRF, kein Reranker.)
- **Pflichtfeld-Wissen:** als Checkliste aus `beratungsprotokoll-vorlage-…md` in den Agenten.
- **UI:** Gespräch(e) laden → „Prüfen" → Lücken-Liste mit Beleg/„geprüft, fehlt" → Klick-Sprung → `draft_fix`-Panel.
- **Input:** `demo-transcript.json` + frischer Korpus.
- **Alles frisch am Tag, public Repo, Commits vom 06.06.** APIs statt eigener Infra.

## Rollen
- **Jacob (Coder):** Agent-Loop-Verdrahtung + Tools + UI + pgvector-Setup.
- **Phil (Pitch + Agent-Hirn):** die Prompts (`check_compliance` / `prove` / `draft_fix`), das Pflichtfeld-Wissen, der Korpus, das Deck + Pitch.

## Roadmap (je eine Zeile — die Vision überlebt, ohne den Pitch zu verwässern)
- Joiner/Meeting-Bot in fremde Zoom/Teams (die Antithese zu Raven) — Capture-Layer.
- Eigene souveräne Infra (Voxtral auf GPU) — Vollkontrolle für regulierte Kunden.
- CRM-/Kalender-Aktionen — der Fix wird automatisch ausgeführt statt nur entworfen.
- Cross-Sell-Intelligenz über den Bestand.
- Voice-Interface.
