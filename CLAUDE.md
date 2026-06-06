# CLAUDE.md — aibeavers_hackathon

Projekt-Instruktionen für diesen Repo. Ergänzt die globale `~/.claude/CLAUDE.md`
(Root-Cause-Haltung, Git-Discipline, Kommunikations-Defaults gelten unverändert).

## Was wir bauen

Der **Nacharbeits-Agent** für selbstständige Finanzberater (§34d/§34f). Nach einem
Beratungsgespräch führt er die Folgeaktionen **selbst aus** — er fasst nicht zusammen,
er HANDELT: Folgetermin anlegen + echte Kalender-Einladung verschicken, später CRM-
Eintrag und Antrags-Vorbereitung.

> Produkt-Kanon: `docs/02-KONZEPT-der-nacharbeits-agent.md` (überschreibt `00-FINAL` und `01`).
> Architektur-Brief: `docs/architektur-fuer-jacob.md`. Bei Konflikt gewinnt das Konzept-02.

**Aktueller Meilenstein (Schritt 1):** Der Agent kann
- E-Mails **senden** (SMTP) und **empfangen/lesen** (IMAP)
- Kalender-Items **lesen** und **erstellen** (CalDAV via tsdav)

## Stack

- **Runtime:** Node 22, TypeScript (ESM, `"type":"module"`), ausgeführt via `tsx`.
- **Agent:** LangChain **1.x** — `createAgent({ model, tools, systemPrompt })` aus dem
  `langchain`-Hauptpaket. ⚠️ NICHT die alte `createReactAgent`-API aus
  `@langchain/langgraph/prebuilt` — die ist in 1.x deprecated.
- **LLM:** Qwen über die OpenAI-kompatible API (`@langchain/openai` `ChatOpenAI` mit
  `configuration.baseURL`, Default `qwen-max`, temp 0). Endpoint/Modell per ENV, weil der
  Hackathon-Sponsor den Key stellt.
- **Mail:** `nodemailer` (SMTP senden), `imapflow` + `mailparser` (IMAP empfangen).
- **Kalender:** `tsdav` (CalDAV) + `ics` (iCalendar-Generierung).
- **Config:** `zod`-validiertes ENV, lazy pro Subsystem (`src/config.ts`).

## Struktur

```
src/
  config.ts          zod-validiertes ENV, lazy loader pro Subsystem
  llm.ts             Qwen-Modell-Factory (OpenAI-kompatibel)
  agent.ts           createAgent(...) + runAgent(input) Helfer
  index.ts           CLI: einmal-Aufruf (arg) oder REPL
  tools/
    email.ts         send_email · list_emails · read_email
    calendar.ts      list_calendar_events · create_calendar_event
    index.ts         allTools-Bündel
```

## Konventionen (projekt-spezifisch)

- **Neue Agent-Fähigkeit = neues Tool** in `src/tools/`, registriert in `tools/index.ts`.
  Tools sind `tool(fn, { name, description, schema })` aus `@langchain/core/tools` mit
  zod-Schema. Beschreibungen auf Deutsch, handlungsorientiert (der Agent liest sie).
- **Credentials** kommen ausschließlich aus ENV (`.env`, niemals committen — siehe
  `.env.example`). Jedes Subsystem lädt seine Sektion lazy, damit Teil-Tests ohne
  vollständige Creds laufen.
- **Kein Erfinden:** Tools geben echte Fehler/Lücken zurück, der System-Prompt verbietet
  Halluzination von Terminen/Adressen. (Grounding-Linie aus dem Produkt-Kanon.)
- **Hero-Flow:** `create_calendar_event` gibt den erzeugten ICS-Block zurück → der Agent
  hängt ihn via `send_email`-Feld `icalEvent` als echte Einladung an. Diesen Pfad nicht
  brechen — er ist der sichtbare „er hat gehandelt"-Akt der Demo.

## Stolperfallen (verifiziert)

- **tsdav ESM-Interop:** `tsdav` hat kein `"type":"module"`; Node liest den ESM-Build als
  CJS und Named-Imports schlagen fehl. Daher Default-Import + Destrukturierung:
  `import tsdav from "tsdav"; const { createDAVClient } = tsdav;`.
- **mailparser `html`** ist `string | false` — vor `.trim()` auf String prüfen.
- **createDAVClient-Returntyp** ≠ exportierter `DAVClient`. Eigenen Typ ableiten:
  `type CalDavClient = Awaited<ReturnType<typeof createDAVClient>>`.

## Befehle

```bash
pnpm typecheck                      # tsc --noEmit
pnpm agent "deine anweisung"        # einmal-Aufruf
pnpm agent                          # interaktive REPL
pnpm dev                            # tsx watch
```

## Roadmap (nächste Schritte, NICHT Teil von Schritt 1)

- CRM-Tool (Eintrag/Update als ausgeführter Akt).
- Antrags-/Unterlagen-Vorbereitung aus dem Transkript.
- Transkript-Ingestion + `{folgetermin, crm_update, antrag, unterlagen, compliance_gap}`-
  Extraktion als strukturierter Vor-Schritt vor der Tool-Ausführung.
```
