# aibeavers_hackathon — Nacharbeits-Agent

KI-Agent für selbstständige Finanzberater, der nach dem Beratungsgespräch die
Folgeaktionen **ausführt** statt nur zusammenzufassen. Schritt 1: E-Mail (SMTP/IMAP)
und Kalender (CalDAV) als Agent-Tools.

## Stack

LangChain 1.x (`createAgent`) · Claude · TypeScript/Node 22 · `nodemailer` + `imapflow`
(Mail) · `tsdav` + `ics` (CalDAV-Kalender).

## Setup

```bash
pnpm install
cp .env.example .env     # Credentials eintragen (Anthropic, SMTP, IMAP, CalDAV)
pnpm typecheck
```

## Nutzung

```bash
# Einmal-Aufruf
pnpm agent "Lies meine letzten 5 Mails und fasse sie zusammen."
pnpm agent "Lege am 12.06.2026 um 10:00 einen 45-Min-Folgetermin mit Herrn Berger an \
            und schick ihm die Einladung an berger@example.de."

# Interaktive REPL
pnpm agent
```

## Agent-Fähigkeiten (Tools)

| Tool | Wirkung |
|---|---|
| `send_email` | Mail senden (optional mit iCalendar-Einladung im Anhang) |
| `list_emails` | Posteingang auflisten (UID, Absender, Betreff, Datum) |
| `read_email` | Volltext einer Mail per UID lesen |
| `list_calendar_events` | Termine aus dem CalDAV-Kalender lesen |
| `create_calendar_event` | Termin anlegen, gibt ICS für die Einladung zurück |

## Konfiguration

Alle Credentials über `.env` (siehe `.env.example`). CalDAV funktioniert mit jedem
CalDAV-Server (Nextcloud, Fastmail, Google via App-Passwort).

Details & Architektur: `CLAUDE.md` und `02-KONZEPT-der-nacharbeits-agent.md`.
