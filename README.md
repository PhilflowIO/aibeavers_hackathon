<div align="center">

# 🦫 Nacharbeits-Agent

### Der Finanzberater closed im Gespräch. Die Nacharbeit erledigt der Agent.

**Termin, Einladung, CRM, Antrag, offene Pflichtfrage — ausgeführt aus dem Transkript, von selbst, bevor der Abschluss im Papierkram stirbt.**

*AI BEAVERS × Mollie Founder Hackathon · Hamburg, House of AI · 6. Juni 2026*

</div>

---

## Das Problem

Ein selbstständiger Finanzberater (§34d/§34f-Zulassung) verliert **pro Beratungsgespräch eine halbe Stunde an Nacharbeit** — terminieren, CRM pflegen, Antrag vorbereiten, Pflichtfelder nachhalten. Genau diese Nacharbeit frisst die Zeit, in der er das nächste Geld verdienen könnte. Und genau da **zerbröseln Abschlüsse, die im Raum schon „ja" waren.**

Sein echter Konkurrent ist nicht ein anderes Notetaker-Tool — es ist sein eigener Feierabend-Papierkram. Heute macht er die Nacharbeit von Hand, abends, oder gar nicht.

## Die Lösung

Ein Notetaker fasst zusammen, was *war*, und schiebt tote Daten ins CRM, die der Berater hinterher selbst in Aktionen übersetzen muss. **Unser Agent überspringt den Schritt: er führt die Folgeaktionen aus.** Nachbearbeitungszeit → null.

Das ist kein Copilot, der fragt „soll ich?". Es ist der YC-2026-Bar wörtlich:

> *„They don't sell software — they just do the work."* — Gustaf Alströmer, YC

Input = Transkript eines Beratungsgesprächs. Output = **ausgeführte Folgeaktionen**, live auf dem Schirm als Plan-Checkliste, die sich abhakt:

1. **📅 Termin** — legt den Folgetermin an + verschickt eine **echte Kalender-Einladung**. Die Mail landet live sichtbar beim Kunden. *(← der Hero-Akt der Demo)*
2. **📇 CRM** — findet den Kunden, trägt Gesprächsergebnis + Next-Best-Product ein.
3. **📄 Antrag/Unterlagen** — bereitet den Antrag fürs nächste Produkt vor (vorausgefüllt aus dem Transkript) + fordert per Mail genau die fehlenden Unterlagen an.
4. **⚠️ Compliance (Sub-Akt)** — *„Die gesetzlich vorgeschriebene ESG-Frage (§34d, Pflicht seit 02.08.2022) fehlt im Gespräch. Setz ich auf die Folgetermin-Agenda."*

## Warum jetzt, warum wir

- **Why now:** Agenten können erstmals zuverlässig mehrschrittig *handeln* statt nur extrahieren — und bei Finanzdaten dürfen US-Notetaker (Otter & Co.) regulatorisch **gar nicht erst antreten**. Lokal/EU-souverän ist hier Pflicht, nicht Bonus.
- **Founder-Edge:** direkter Zugang zum Käufer über Maklerpool-Netzwerk → echtes „wann krieg ich das?" statt TAM-Folie.
- **Wedge → Firma:** Heute der Finanzberater. Dahinter ersäuft *jedes* meeting-lastige Team in derselben System-Pflege-Nacharbeit — PMs (Tickets), Recruiter (Kandidaten), Sales (CRM). Gleicher Agent, anderer Beachhead.

> **First sentence (Pitch):** *„Ein selbstständiger Finanzberater verliert pro Gespräch eine halbe Stunde an Nacharbeit — terminieren, CRM, Antrag — und genau da sterben Abschlüsse, die im Raum schon ‚ja' waren. Wir sind sein Agent: nach dem Gespräch erledigt sich die ganze Nacharbeit von selbst, aus dem Transkript. Lokal, weil US-Tools bei Finanzdaten nicht antreten dürfen."*

---

## Dieses Repo

Der **Agent-Layer (Schritt 1)** — das Fundament, auf dem die Demo läuft: ein LangChain-Agent, der **E-Mails senden + empfangen** und **Kalender-Items lesen + erstellen** kann. Diese Tools sind die ausführenden Hände des Agenten.

### Agent-Fähigkeiten

| Tool | Wirkung |
|---|---|
| `create_calendar_event` | Termin im Kalender anlegen — gibt den ICS-Block für die Einladung zurück |
| `send_email` | Mail senden, optional mit iCalendar-Einladung im Anhang |
| `list_calendar_events` | Termine aus dem Kalender lesen (Verfügbarkeit prüfen) |
| `list_emails` | Posteingang auflisten (UID, Absender, Betreff, Datum) |
| `read_email` | Volltext einer Mail per UID lesen |

**Der Hero-Flow:** `create_calendar_event` legt den Termin an und gibt das ICS zurück → der Agent hängt es via `send_email` als **echte Kalender-Einladung** an den Kunden. Das ist der sichtbare „er hat *gehandelt*"-Moment: die Einladung geht live raus, nicht gemockt.

### Stack

| Schicht | Technologie |
|---|---|
| **Agent** | [LangChain 1.x](https://github.com/langchain-ai/langchainjs) — `createAgent({ model, tools, systemPrompt })` |
| **LLM** | Qwen (`@langchain/openai` über OpenAI-kompatible API, Default `qwen-max`, temp 0 = deterministisch) |
| **Mail** | `nodemailer` (SMTP senden) · `imapflow` + `mailparser` (IMAP empfangen) |
| **Kalender** | `tsdav` (CalDAV — Nextcloud/Fastmail/Google) · `ics` (iCalendar-Generierung) |
| **Runtime** | Node 22 · TypeScript (ESM) · `tsx` · `zod`-validiertes ENV |

> Bewusst **CalDAV statt Google-API**: ein Switch, jeder souveräne Kalender, DSGVO-Linie bleibt sauber.

### Setup

```bash
pnpm install
cp .env.example .env     # Credentials: Qwen/DashScope · SMTP · IMAP · CalDAV
pnpm typecheck
```

### Nutzung

```bash
# Einmal-Aufruf
pnpm agent "Lies meine letzten 5 Mails und fasse sie zusammen."
pnpm agent "Lege am 12.06.2026 um 10:00 einen 45-Min-Folgetermin mit Herrn Berger an \
            und schick ihm die Einladung an berger@example.de."

# Interaktive REPL
pnpm agent
```

---

## Demo-UI

Die HERO-Demo läuft als Next.js-App unter `apps/web`:

```bash
pnpm install && pnpm dev:web
# → http://localhost:3000
```

`USE_MOCK_ANALYSIS` ist standardmäßig `true` — die UI läuft so **ohne Credentials** (gemockte Analyse/QA). Für den **LIVE-Hero** (echte Kalender-Einladung + echte Mail) müssen in `.env` gesetzt sein:

- `USE_MOCK_ANALYSIS=false` + `ALLOW_LIVE_ACTION_EXECUTION=true`
- SMTP-Credentials (`SMTP_HOST` etc.) und CalDAV-Credentials (`CALDAV_SERVER_URL` etc.)

---

## Das Team

| | Rolle |
|---|---|
| **Jacob** | Hardcore-Coder — Agent-Verdrahtung, UI (Plan-Checkliste + Panels), echter Kalender-/Mail-Akt, Deploy |
| **Phil** | Produkt + Pitch + Agent-Hirn — System-Prompts, JSON-Contract, Demo-Transkript, Compliance-Domäne, Deck |

## Demo (3 Min — jeder Beat ist ein ausgeführter Akt)

1. **Hook** — *„Hier ist ein echtes Riester-Gespräch. Sehen Sie zu, was der Agent danach* tut *— nicht sagt, tut."*
2. **Plan live** — Checkliste hakt sich ab: ✓ Transkript ✓ Folgetermin ✓ CRM ✓ Antrag ⚠ Pflichtfrage
3. **Hero** — Agent legt Folgetermin an → **echte Kalender-Einladung kommt live als Mail an.** *„Das ist nicht gemockt."*
4. **CRM + Antrag** — Kunde gefunden, Ergebnis eingetragen, Wohn-Riester-Antrag vorausgefüllt. *„Nacharbeitszeit: war 30 Min, ist null."*
5. **Compliance** — *„ESG-Frage fehlt — Pflicht seit 02.08.2022 — hab ich auf die Agenda gesetzt."*
6. **Close** — *„Andere geben dir ein Protokoll. Wir geben dir deinen Feierabend zurück — und den nächsten Abschluss."*

---

## Mehr Kontext

| Dokument | Inhalt |
|---|---|
| [`CLAUDE.md`](CLAUDE.md) | Stack, Konventionen, verifizierte Stolperfallen (für Entwickler & Agenten) |
| [`docs/02-KONZEPT-der-nacharbeits-agent.md`](docs/02-KONZEPT-der-nacharbeits-agent.md) | **Produkt-Kanon** — Käufer, Akt, Positionierung |
| [`docs/architektur-fuer-jacob.md`](docs/architektur-fuer-jacob.md) | Voll-Architektur-Brief (Capture → STT → Agent → Output) |
| [`docs/00-FINAL-demo-positionierung-build.md`](docs/00-FINAL-demo-positionierung-build.md) | Demo-Bogen + Build-Entscheidungen (Historie) |
| [`docs/AI BEAVERS founder hackathon judging and scoring guide.md`](docs/AI%20BEAVERS%20founder%20hackathon%20judging%20and%20scoring%20guide.md) | Judging-Rubrik (wonach bewertet wird) |

<div align="center">

**Heute der Finanzberater. Morgen jedes Team, das in seiner eigenen Nacharbeit ersäuft.**

</div>
