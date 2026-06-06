# 02 — KONZEPT: Der Nacharbeits-Agent

*Kanonisch. Überschreibt `00-FINAL` und `01-KONZEPT` (beide = verworfene „Beweisakte mit Retrieval"-Richtung — Angst-Frame, nicht gefühlt, Weak-Pattern #5). Gegen alle drei AIB-Docs gegengecheckt. Leitprinzip: EIN Käufer, EIN Hero-System, EIN sichtbarer Akt. Alles andere ist Vision — nicht Build, nicht Pitch.*

---

## Das Produkt (die eine Sache)

> **Der Berater closed im Gespräch. Die gesamte Nacharbeit danach — Termin, CRM, Antrag, die offene Pflichtfrage — macht der Agent. Aus dem Transkript, von selbst, bevor der Abschluss im Papierkram stirbt.**

Der Notetaker fasst zusammen, was *war*, und schiebt tote Daten ins CRM, die der Berater hinterher selbst in Aktionen übersetzen muss. **Unser Agent überspringt den Schritt: er führt die Folgeaktionen aus.** Nachbearbeitungszeit → null.

Das ist kein Copilot, der fragt „soll ich?". Es ist der YC-2026-Bar wörtlich: *„they don't sell software — they just do the work."*

---

## Der Käufer (namentlich, kein „für alle")

**Selbstständiger Finanzberater / Versicherungsvermittler mit §34d/§34f-Zulassung**, Maklerpool-angebunden, lebt von der Abschlussquote. Lädt sich nach jedem Gespräch in Admin: terminieren, Unterlagen anfordern, Antrag vorbereiten, Pflichtfelder nachhalten. Diese Nacharbeit frisst die Zeit, in der er das nächste Geld verdienen könnte — und genau da zerbröseln Abschlüsse, die im Raum schon „ja" waren.

**Status quo (Rubrik-Frage 4):** macht er heute von Hand, abends, oder gar nicht (→ Abschluss stirbt). Sein echter Konkurrent ist nicht Otter — es ist sein eigener Feierabend-Papierkram.

**Warum dieser Käufer:** Phil hat über Ulf/Maklerpool direkten Zugang → echtes „wann krieg ich das?" in Schrift = das schwächste Rubrik-Feld (Evidence, 15 %) ist hier *lösbar*. Bei keinem anderen Käufer.

---

## Was der Agent TUT (der Kern — sichtbare Akte, kein Reasoning ins Leere)

Input = Transkript eines Beratungsgesprächs. Output = **ausgeführte Folgeaktionen**, live auf dem Schirm als Plan-Checkliste, die sich abhakt:

1. **Termin** — legt den Folgetermin an + verschickt eine **echte Kalender-Einladung** (Hero-Akt: die Mail landet live sichtbar). Agenda vorbefüllt: Wohn-Riester + die fehlende ESG-Frage.
2. **CRM** — findet den Kunden, trägt Gesprächsergebnis + Next-Best-Product ein (Panel: ausgeführter Eintrag).
3. **Antrag/Unterlagen** — bereitet den Antrag fürs nächste Produkt vor (vorausgefüllt aus dem Transkript: 162 €, „ausgewogen", Berger) + fordert per Mail genau die Unterlagen an, die fürs nächste Mal fehlen.

**Sub-Akt, nicht Held:** Compliance. *„Übrigens — die gesetzlich vorgeschriebene ESG-Frage (§34d, Pflicht seit 02.08.2022) fehlt im Gespräch. Setz ich auf die Folgetermin-Agenda."* Lücken-Catch als *eine* der Folgeaktionen, nicht als Hauptakt.

---

## Was wir am Samstag bauen (ehrlich gerechnet, 9h, 2 Leute)

- **EIN System läuft echt:** Google-Kalender. Agent legt Folgetermin an → echte Einladung kommt live als Mail an = der verifizierbare „er hat *gehandelt*"-Wow.
- **Zwei Systeme als ausgeführte Panels** (CRM-Eintrag, Antrag) + **ehrliche Roadmap-Zeile** „das sind die nächsten zwei echten Integrationen" — statt drei halb-kaputte Live-Integrationen in 9h zu basteln.
- **Build-Kern** = ein gut geprompteter LLM-Call → strukturiertes JSON `{folgetermin, crm_update, antrag, unterlagen, compliance_gap}` (2–3h, Phil) + **UI: Plan-Checkliste + ausgeführte Panels + echter Kalender-Call** (4–5h, Jacob).
- **Input** = `demo-transcript.json` (vorbereitet = erlaubte „idea notes"). **Kein** Echtzeit-STT, **kein** pgvector/Retrieval, **kein** Raven-Code-Import. Frisches public Repo, Commits vom 06.06.

---

## Was wir BEWUSST NICHT tun (= Vision, kein Sprawl)

- ❌ **„Jeder kann das nutzen" / PM + Recruiter + Sales im Pitch** — Weak-Pattern #6 (horizontal „für alle"). Lebt als *eine* Vision-Zeile, nicht auf der Bühne.
- ❌ **Drei Live-Integrationen** — Sprawl, in 9h nicht baubar. Ein echtes System + zwei ehrliche Panels.
- ❌ **Echtzeit-Mithören im Gespräch** — 3-Tage-Stack + Rechtsfrage. Post-call auf eigener Aufnahme = sauberer Boden.
- ❌ **Beweisakte mit Retrieval über den Bestand** — der verworfene Angst-Frame. Compliance ist Sub-Akt.
- ❌ **Mermaid-Prozessviz** — echter Raven-USP, aber PM-Territorium → Vision/Roadmap.

> Regel: kommt im Pitch ein zweiter Käufer oder ein zweites „und auch noch…", streichen.

---

## Die Demo (3 Min, jeder Beat = ein ausgeführter AKT)

UI: links Plan-Checkliste, rechts wechselnde Panels.

- **[0:00–0:25] Hook:** First sentence → „Hier ist ein echtes Riester-Gespräch. Sehen Sie zu, was der Agent danach *tut* — nicht sagt, tut." Klick „Nacharbeit starten".
- **[0:25–0:55] PLAN live:** Checkliste hakt sich ab (✓ Transkript ✓ Folgetermin ✓ CRM ✓ Antrag ⚠ Pflichtfrage). *„Er fasst nicht zusammen — er arbeitet einen Plan ab."*
- **[0:55–1:35] HERO — echter Akt:** Agent legt Folgetermin an → **echte Kalender-Einladung kommt live als Mail an.** „Das ist nicht gemockt — die Einladung ist gerade rausgegangen."
- **[1:35–2:10] CRM + Antrag:** Kunde gefunden, Ergebnis eingetragen, Wohn-Riester-Antrag vorausgefüllt aus dem Gespräch (162 €, „ausgewogen"). *„Nacharbeitszeit: war 30 Min, ist null."*
- **[2:10–2:35] Sub-Akt Compliance:** „ESG-Frage fehlt — Pflicht seit 02.08.2022 — hab ich auf die Folgetermin-Agenda gesetzt." (Beiläufig, beweist Tiefe ohne Angst-Pitch.)
- **[2:35–3:00] Close + Vision:** *„Heute der Finanzberater. Dahinter: jedes meeting-lastige Team ersäuft in derselben Nacharbeit — PMs, Recruiter, Sales."* + Souveränität (lokal/EU, bei Finanzdaten Pflicht) + ehrliches Risiko (CRM/Ticket = nächste Integrationen, Montag mit 2 echten Beratern testen). Schluss: *„Andere geben dir ein Protokoll. Wir geben dir deinen Feierabend zurück — und den nächsten Abschluss."*

---

## Positionierung

> **„Wir sind die Nacharbeit des Finanzberaters: jedes Beratungsgespräch erledigt sich nach dem Termin von selbst — Folgetermin, CRM, Antrag, offene Pflichtfrage, alles ausgeführt aus dem Gespräch. Lokal und DSGVO-souverän, weil US-Notetaker bei Finanzdaten nicht antreten dürfen."**

First sentence (15 Sek): *„Ein selbstständiger Finanzberater verliert pro Gespräch eine halbe Stunde an Nacharbeit — terminieren, CRM, Antrag — und genau da sterben Abschlüsse, die im Raum schon ‚ja' waren. Wir sind sein Agent: nach dem Gespräch erledigt sich die ganze Nacharbeit von selbst, aus dem Transkript. Lokal, weil US-Tools bei Finanzdaten nicht antreten dürfen."*

---

## Vision / Roadmap (die Bigness — eine Zeile auf dem Deck, NICHT der Build)

- **Horizontal:** jedes meeting-lastige Team erzeugt System-Pflege-Nacharbeit → PM (Tickets), Recruiter (Kandidaten-Synthese), Sales (CRM). Gleicher Agent, anderer Beachhead.
- **Mermaid-Prozessviz:** spricht ein Team über einen Ablauf, rendert der Agent den Flow live als Diagramm. (Raven-USP, PM-Welt.)
- **Tiefere Integrationen:** CRM/Ticket/Antrag echt ausgeführt statt entworfen.
- **Souveräne Infra:** Voxtral auf eigener GPU für regulierte Kunden.
- **Beweisakte über den Bestand:** kumulierende, abfragbare Akte — der spätere System-of-Record.

---

## Rubrik-Self-Check (gegen Judging-Guide)

| Kriterium | Gew. | Stand mit diesem Konzept |
|---|---|---|
| Problem + Kunde | 20% | ✅ namentlicher Käufer (selbst. Vermittler), klarer Schmerz (Nacharbeit frisst Abschlüsse) |
| Markt + Business | 20% | ✅ Bottom-up: X Vermittler × €/Monat; Vision gibt den Pfad nach groß |
| Produkt + Demo | 20% | ✅ echter Kalender-Akt live = der Kern beweist sich |
| AI-Leverage | 15% | ✅ Agent *handelt* (YC-2026-Bar), nicht Deko |
| Evidence / Founder-Edge | 15% | ⚠️ braucht das Ulf-Quote (s. To-Dos) — sonst stärkstes Risiko |
| Pitch-Klarheit | 10% | ✅ first sentence im Schema „We help X do Y because today Z" |

## Offene To-Dos (vor Samstag)
1. **Ein echtes „wann krieg ich das?"-Quote** von einem Finanzberater (Ulf/Maklerpool), in Schrift. Löst das einzige gelbe Rubrik-Feld.
2. **7-Slide-Deck** (Problem+Kunde · Lösung · Why-now · Markt+Wettbewerb bottom-up · Business+Evidence · GTM erste 50 · Team).
3. **Public GitHub-Repo** anlegen, Commits ab 06.06.
4. **Terminologie:** §34d = Beratungsdokumentation, §34f = Geeignetheitserklärung.

## Rollen
- **Jacob (Coder):** Agent-Call-Verdrahtung + UI (Checkliste/Panels) + echter Google-Kalender-Call.
- **Phil (Produkt + Pitch):** die Prompts (`folgeaktionen` aus Transkript), das `demo-transcript.json`, das Berater-Quote, Deck + Pitch.
