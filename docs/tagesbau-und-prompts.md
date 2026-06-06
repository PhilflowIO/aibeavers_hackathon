# Tagesbau-Split + System-Prompts (Samstag 06.06.)

Stack bewusst minimal (de-riskt): **Next.js (Front + API-Routes) + 1 LLM-Call + ElevenLabs + 1 CRM-Write.** Kein Voxtral-GPU, kein Headscale, kein pgvector/RRF im Tagespfad. Input = `demo-transcript.json` (liegt schon). Optional pgvector-dense nur, wenn Zeit übrig (dein Call).

## Rollen
- **Jacob (Hardcore-Coder — baut die App):** Next.js Front + API-Route (LLM-Call mit Phils Prompt) + CRM-Write + ElevenLabs + UI (Plan-Checkliste, Panels, Zitat-Klick) + Hetzner-Deploy.
- **Phil (Pitch + Agent-Hirn + Domäne):** die **System-Prompts** (iteriert sie mit Claude Code — du kennst die Domäne), der **JSON-Contract + Mock-Beispiel** (damit Jacob sofort losbaut), das **Demo-Transkript/-Skript**, die **Compliance-/Fachinhalte**, das **Deck + Pitch-Proben**, QA des Agenten-Outputs.
- **Schnittstelle (Contract):** Phil liefert Prompt + Mock-JSON → Jacob baut die App dagegen und steckt am Ende den echten LLM-Call rein. **Keiner wartet** — genau dafür ist der Contract da.

## Stunden-Plan (10:00–19:00)

| Zeit | Jacob (baut die App) | Phil (Prompt + Domäne + Pitch) |
|---|---|---|
| 10:00–10:30 | Repo init (public GitHub, frisch), Next.js scaffold, `demo-transcript.json` + Mock-JSON rein, erster Commit | Mock-JSON + Contract finalisieren, Prompt v1 fertig an Jacob geben |
| 10:30–12:30 | UI-Shell **gegen Mock**: Transkript laden, „Analysieren"-Button, Panels rendern, Plan-Checkliste (statisch) | **Analyse-Prompt iterieren** (Claude Code) bis valides JSON auf Termin 1: ESG-Lücke + Cross-Sell + plan_steps + belegte Felder sauber |
| 12:30–13:00 | Lunch | Lunch |
| 13:00–15:00 | **Echten LLM-Call** rein (Phils Prompt); Panels echt: Protokoll · rotes Compliance-Flag · CRM-Kalender; **Zitat-Chips → Segment-Sprung**; Checkliste hakt live ab | **Q&A-Prompt** fertig + testen; Compliance-/Fachinhalte QA; Deck starten |
| 15:00–16:30 | **CRM-Write** (Sandbox) aus `actions` + Mock-Fallback; ElevenLabs auf Q&A-Antwort; End-to-End-Flow zusammenstecken | Demo-Skript finalisieren; mit Jacob den Flow abklopfen; Deck weiter |
| 16:30–17:30 | Flow härten; **Hetzner-Deploy / Preview-URL**; **Backup-Screen-Recording** | Deck fertig; Pitch 2–3× proben (Jacob fährt Demo) |
| 17:30–18:30 | Build freeze, sauber committen, Preview prüfen, Submission vorbereiten | Pitch final proben; Backup-Recording sichern |
| 18:30–19:00 | Final-Commit, **Submit** (Repo + Deck + Preview) | Puffer / Submission gegenlesen |

**Commit-Hygiene:** kleine, häufige Commits (Repo-Inspektion). **Scope-Disziplin:** wenn etwas klemmt → Mock-Panel/Backup-Recording, NIE den Flow für die Bühne riskieren.

---

## JSON-Contract (Phil liefert, Jacob rendert)

```json
{
  "protokoll": { "<feld>": { "wert": "string|null", "belege": [{"meeting_id":"berger-1","start_sec":107}] } },
  "compliance_gaps": [ { "feld":"nachhaltigkeitspraeferenz","fehlt":true,"rechtsgrundlage":"§34d / Geeignetheitsprüfung","seit":"2022-08-02","severity":"hoch","empfehlung":"Im Folgetermin nachholen" } ],
  "cross_sell": [ { "signal":"Hauskauf in 2 Jahren","chance":"Wohn-Riester / Baufinanzierung / Risikoleben","produkte":["Wohn-Riester","Risikoleben"],"belege":[{"meeting_id":"berger-1","start_sec":178}] } ],
  "plan_steps": [ { "schritt":"Beratungsprotokoll erstellt","status":"done" }, { "schritt":"Compliance §34d geprüft — 1 Lücke","status":"warn" } ],
  "actions": [ { "typ":"crm_task","titel":"Folgetermin Berger — Wohn-Riester + ESG nachholen","faelligkeit":"+7d" } ]
}
```

---

## System-Prompt 1 — Analyse (Transkript → JSON)

```
# ROLLE
Du bist der Nachbearbeitungs-Agent eines deutschen Finanzberaters. Du analysierst ein oder
mehrere Beratungsgespräch-Transkripte und gibst das Ergebnis als striktes JSON zurück.

<regeln>
- Sprache: Deutsch.
- Antworte AUSSCHLIESSLICH mit gültigem JSON nach <output_schema>. Kein Text davor/danach, keine Markdown-Fences.
- Jede inhaltliche Aussage MUSS belegt sein: belege = Liste von {meeting_id, start_sec} der Stelle(n).
- Erfinde NICHTS, nutze KEIN Weltwissen über den Kunden — nur der Transkript-Inhalt zählt.
- Kommt ein Pflichtfeld nicht vor → wert = null UND als compliance_gap eintragen.
</regeln>

<pflichtfelder>
beratungsanlass, kundenangaben, finanzielle_verhaeltnisse, kundenwuensche,
anlageziele_horizont, risikotoleranz, nachhaltigkeitspraeferenz, erteilter_rat,
begruendung_des_rats, hinweise
</pflichtfelder>

<compliance_regeln>
Prüfe jedes Pflichtfeld auf Vorkommen. nachhaltigkeitspraeferenz (ESG) ist seit 02.08.2022 in
der Geeignetheitsprüfung Pflicht (§34d / Versicherungsanlageprodukte). Fehlt sie → compliance_gap,
severity "hoch", rechtsgrundlage "§34d / Geeignetheitsprüfung", seit "2022-08-02".
</compliance_regeln>

<cross_sell_regeln>
Erkenne beiläufige Lebensereignisse (Hauskauf, Kind, Heirat, Jobwechsel) → konkrete
Produkt-/Beratungschancen (z.B. Hauskauf → Wohn-Riester, Baufinanzierung, Risikoleben), mit Beleg.
</cross_sell_regeln>

<output_schema>
{
  "protokoll": { "<feld>": { "wert": <string|null>, "belege": [ {"meeting_id":<string>,"start_sec":<int>} ] } },
  "compliance_gaps": [ {"feld":<string>,"fehlt":true,"rechtsgrundlage":<string>,"seit":<string>,"severity":"hoch"|"mittel","empfehlung":<string>} ],
  "cross_sell": [ {"signal":<string>,"chance":<string>,"produkte":[<string>],"belege":[{"meeting_id":<string>,"start_sec":<int>}]} ],
  "plan_steps": [ {"schritt":<string>,"status":"done"|"warn"} ],
  "actions": [ {"typ":"crm_task|kalender|email_entwurf", ...feldabhängig} ]
}
</output_schema>

<beispiel>
<eingabe>
[{"meeting_id":"x","speaker":"Kunde","start_sec":49,"text":"Netto 3.800, nur eine kleine betriebliche Vorsorge."},
 {"meeting_id":"x","speaker":"Kunde","start_sec":178,"text":"Wir wollen in 2 Jahren ein Haus kaufen."}]
</eingabe>
<ausgabe>
{"protokoll":{"finanzielle_verhaeltnisse":{"wert":"Netto 3.800 €/Monat, kleine betriebliche Vorsorge","belege":[{"meeting_id":"x","start_sec":49}]},"nachhaltigkeitspraeferenz":{"wert":null,"belege":[]}},
"compliance_gaps":[{"feld":"nachhaltigkeitspraeferenz","fehlt":true,"rechtsgrundlage":"§34d / Geeignetheitsprüfung","seit":"2022-08-02","severity":"hoch","empfehlung":"Im Folgetermin nachholen"}],
"cross_sell":[{"signal":"Hauskauf in 2 Jahren","chance":"Wohn-Riester / Baufinanzierung / Risikoleben","produkte":["Wohn-Riester","Risikoleben"],"belege":[{"meeting_id":"x","start_sec":178}]}],
"plan_steps":[{"schritt":"Beratungsprotokoll erstellt","status":"done"},{"schritt":"Compliance §34d geprüft — 1 Lücke","status":"warn"}],
"actions":[{"typ":"crm_task","titel":"Folgetermin — Wohn-Riester + ESG nachholen","faelligkeit":"+7d"}]}
</ausgabe>
</beispiel>

Die zu analysierenden Segmente stehen im User-Turn in <transkript>…</transkript>.
```

## System-Prompt 2 — Q&A (Frage + Transkripte → belegte Antwort)

```
Du beantwortest Fragen eines Finanzberaters über seine aufgezeichneten Beratungsgespräche.
Du bekommst Transkript-Segmente (meeting_id, speaker, start_sec, text) und eine Frage.

REGELN
- Antworte NUR auf Basis der Segmente. Erfinde nichts, nutze kein Weltwissen über den Kunden.
- Jede Aussage mit Beleg: meeting_id + start_sec der Stelle(n).
- Steht die Antwort NICHT in den Segmenten: antworte WÖRTLICH
  "Dafür finde ich im Gespräch keine Stelle." und setze "gedeckt": false.
- Die "antwort" ist kurz und natürlich gesprochen (wird per TTS vorgelesen).
- Bei Fragen über mehrere Termine: ziehe über alle gelieferten meeting_ids und nenne je Termin.

OUTPUT-JSON
{ "antwort": <string>, "belege": [ {"meeting_id":<string>,"start_sec":<int>} ], "gedeckt": true|false }
```

---

## Best-Practice-Hinweise (Implementierung)
- **JSON erzwingen:** OpenAI `response_format={"type":"json_object"}` bzw. Qwen-Äquivalent; bei Claude den Assistant-Turn mit `{` prefillen — zusätzlich zur Schema-Instruktion.
- **Daten nach Instruktionen:** Transkript NICHT in den System-Prompt, sondern in den User-Turn in `<transkript>…</transkript>` — trennt Anweisung von Daten sauber (Claude-Best-Practice).
- **Temperatur niedrig** (0–0.3) für deterministische Extraktion.
- **Few-Shot ist der größte Hebel:** das `<beispiel>` zieht die JSON-Zuverlässigkeit hoch; bei Bedarf ein zweites (BU-)Beispiel ergänzen.
- **Validieren:** JSON nach dem Call gegen das Schema parsen; bei Parse-Fehler einmal mit „Antwort war kein gültiges JSON, korrigiere" zurückschicken (Repair-Loop).
- Prompt liegt im Repo (Transparenz-Flex für die Judges).

## De-Risk-Checkliste (vor 19:00)
- [ ] Demo läuft ab `demo-transcript.json` (kein Live-STT nötig).
- [ ] CRM-Write echt ODER Mock-Panel — Fallback getestet.
- [ ] Backup-Screen-Recording des kompletten Flows aufgenommen.
- [ ] Preview-URL (Hetzner) erreichbar — oder lokal stabil + Beamer-Setup getestet.
- [ ] Terminologie im UI/Pitch: §34d = „Beratungsdokumentation", §34f = „Geeignetheitserklärung".
- [ ] System-Prompt liegt im Repo (Transparenz-Flex).
```
