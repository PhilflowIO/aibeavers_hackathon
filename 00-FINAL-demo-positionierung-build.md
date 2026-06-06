> ⚠️ **ÜBERHOLT (2026-06-05).** Diese Richtung („Beweisakte mit Retrieval", Compliance als Held = Angst-Frame) wurde verworfen — Phil fühlte sie nicht, und sie trifft Weak-Pattern #5. Kanonisch ist jetzt → `02-KONZEPT-der-nacharbeits-agent.md` (der Agent *führt die Nacharbeit aus*: Termin/CRM/Antrag, Gier statt Angst). Hier nur noch als Historie + MoE-Panel-Material.

# 00 — FINAL: Verdikt, Positionierung, Demo-Bogen, Build-Entscheidungen

*Synthese der 3-Agenten-MoE (Judge / Positionierung / Demo). Dies ist die kanonische Referenz — überschreibt abweichende Demo-Guidance in den anderen Docs.*

## Verdikt (alle drei Lenses konvergieren)

**Die These ist richtig, der Pitch verkauft den Agenten — aber die geplante Demo *beweist* ihn nicht.** Heute zeigt die Demo einen exzellenten **grounded extractor + RAG + Voice** (~60 % Agent). Jeder Hero-Moment endet in einer *Aussage* oder *Rückfrage* („Ich habe vorbereitet…", „Soll ich…?") — der Agent **plant und reasont, aber HANDELT nie sichtbar.** Plan→Tool→**Act** bricht beim Act ab. Ein scharfer Judge sagt zu Recht: „Das ist ein LLM, das ein Formular füllt." Judge-Score heute ≈ **77/100** (oberes „Strong"); mit den Fixes → **82+** (Finale).

## Die zwei Fixes, die alles drehen

**FIX 1 — Der Agent muss sichtbar HANDELN (Judge + Demo-Lens).**
Mindestens **ein ausgeführter Tool-Call live auf dem Schirm**: der Agent *schreibt* die ESG-Frage in die Folgetermin-Agenda, *legt* den Kalendereintrag an, *entwirft* die Mail — sichtbar, nicht „soll ich?". Plus eine **Plan-Checkliste, die sich live abhakt** (✓ Protokoll ✓ Compliance geprüft ⚠ Lücke ✓ Cross-Sell ✓ Folgetermin) = der visuelle Beweis für autonomes, mehrschrittiges Handeln. Das ist YC-2026 „they just do the work" statt Copilot.

**FIX 2 — Positionierung von Tool-Form zu Service-Form (Positionierungs-Lens).**
Nicht „ein Agent, der…", sondern **„Wir sind die Doku- und Compliance-Kraft des Beraters."** Das Protokoll ist der **Einstieg** (Tag-1-Wert, der den Verkauf macht); die **kumulierende, abfragbare Beweisakte über den ganzen Bestand** ist die **Firma** (System-of-Record). Otter/keasy bauen den *Button* (Auto-Protokoll) in 6 Monaten nach — aber nicht die *Kombination* aus Souveränität (Geschäftsmodell-Umbau) × Compliance-Template × Grounding-Beweiskette × Bestands-Kontinuität (10 J. Aufbewahrung). Wir ersetzen die **Doku-Arbeit**, nicht den Berater (er haftet) → umgeht den „AI-Jobtitel"-Disqualifier.

## Finale Positionierung

> **„Wir sind die Doku- und Compliance-Kraft des Finanzberaters: jedes Beratungsgespräch wird automatisch zur gesetzeskonformen, lückenlos belegten Beweisakte — und über den ganzen Bestand zur abfragbaren Verkaufsintelligenz. Lokal und DSGVO-souverän, weil US-Notetaker bei Finanzdaten gar nicht erst antreten dürfen und deutsche Branchen-Tools nicht zuhören."**

First sentence (15 Sek): *„Finanzberater verlieren über die Hälfte ihrer Zeit an die Doku nach dem Gespräch — und ein lückenhaftes Protokoll dreht im Streitfall die Beweislast gegen sie. Wir sind ihre Doku-Kraft: jedes Gespräch wird automatisch zur gesetzeskonformen Beweisakte und zur abfragbaren Verkaufschance — lokal, weil US-Notetaker bei Finanzdaten nicht antreten dürfen."*

## Build-Entscheidungen (de-risk — die Agentik gewinnt, nicht der Stack)

> ⚠️ **Größtes Bau-Risiko (Demo-Lens): Over-Engineering frisst die Agentik-Zeit.** Der Voxtral-GPU-Box-via-Headscale + pgvector+tsvector+RRF + BGE-M3 + LettuceDetect + Hetzner-Stack ist ein 3-Tage-Stack. Wenn Phil am Tag daran schraubt, ist der Agentik-Beweis (Plan-Checkliste + Tool-Calls) abends nicht fertig. **Der Judge bewertet nicht die RAG-Pipeline — er bewertet, ob er einen Agenten handeln sieht.**

Für den **Hackathon-Tag** (≠ Produkt-Roadmap):
- **STT = Voxtral-API von Mistral (EU) als DEFAULT**, nicht Fallback. GPU-Box/Headscale streichen. **Besser noch: das Riester-Gespräch vorab transkribieren und als JSON ins Repo** → Demo läuft ab Agent-Layer netzwerk-unabhängig.
- **Kein pgvector/RRF für die Demo.** Ein Gespräch ist ~3–4K Tokens → **Full-Context in den LLM** (Anthropic <200K-Regel). Cross-Call = einfach BEIDE Transkripte in den Context laden, kein Retrieval-Infra nötig.
- **Der Build = ein gut geprompteter LLM-Call** → strukturiertes JSON `{protokoll, compliance_gaps, cross_sell, plan_steps, actions}` (2–3h, Phil) + **UI: Plan-Checkliste + Panels (Protokoll/CRM-Kalender/Compliance-Flag) + Zitat-Klick** (4–5h, Jacob) + **ElevenLabs auf die Q&A-Antwort** (1–2h).
- Voxtral@GPU, pgvector-Hybrid, LettuceDetect-DE = **Produkt-/Roadmap-Story fürs Deck**, NICHT der Tagesbau.

## Finaler 3-Minuten-Demo-Bogen (jeder Beat = ein ACT, keine Aussage)

UI: links **Plan-Checkliste**, rechts wechselnde Panels.

- **[0:00–0:25] Hook:** First sentence → „Hier ist ein echtes Riester-Gespräch — sehen Sie zu, was er *tut*." Klick „Analysieren".
- **[0:25–0:50] PLAN sichtbar:** Checkliste hakt sich live ab (✓ Protokoll ✓ §34d geprüft ⚠ 1 Lücke ✓ Verkaufschance ✓ Folgetermin vorbereitet ○ bereit). *„Er hat nicht mitgeschrieben — er hat einen Plan abgearbeitet."*
- **[0:50–1:25] ACT 1 — Compliance-Lücke + Eingriff (Hero):** rotes Flag „§34d: Nachhaltigkeitspräferenz fehlt — Pflicht seit 02.08.2022". *„Er erkennt, was FEHLT — das kann ein Notetaker strukturell nicht."* **Akt:** schreibt das ESG-Item sichtbar in die Folgetermin-Agenda.
- **[1:25–1:55] ACT 2 — Cross-Sell + Kalender-Eintrag:** „Hauskauf in 2 Jahren" → Wohn-Riester/Baufi/Risikoleben. **Akt:** Agent legt CRM-/Kalendereintrag „Folgetermin Berger — Wohn-Riester + ESG" an.
- **[1:55–2:30] ACT 3 — Cross-Call-Q&A per Voice (Wow + System-of-Record-Beweis):** *„Zeig mir alle offenen Punkte von Herrn Berger aus BEIDEN Terminen."* → ElevenLabs antwortet über **beide** Gespräche mit Belegen („ESG im 2. Termin nachgeholt ✓; Wohn-Riester offen"). Klick aufs Zitat → Sprung zur Stelle. Gegenprobe (nicht Gesprochenes) → „dafür finde ich keine Stelle." *„Wir generieren nicht, wir belegen — und über den Bestand entsteht die Beweisakte, aus der kein Berater mehr migriert."* (= der eine Beat, den Otter/keasy nicht reproduzieren.)
- **[2:30–3:00] Close:** Souveränität (Pflicht, nicht Bonus) + frisch gebaut (Capture = OSS, Agent-Hirn = unsere Arbeit) + ehrliches Risiko (Live-Join = nächster Schritt, Montag mit 2 echten Beratern testen). Schluss: *„Die anderen geben dir ein Protokoll. Wir geben dir die Beweisakte UND den nächsten Abschluss."*

## Offene To-Dos (vor Samstag)
1. **Zweites Rollenspiel** = der Folgetermin (ESG nachgeholt + Wohn-Riester angesprochen), damit ACT 3 (Cross-Call) *demobar* ist statt behauptet. ~2 Min, kurz.
2. **Eine echte Finanzberater-„wann kann ich testen?"-Zeile** (Ulf-Netzwerk/Maklerpool) — Evidence ist das schwächste Rubrik-Feld; Kai zählt nicht.
3. **Terminologie fix:** §34f = „Geeignetheitserklärung", §34d = „Beratungsdokumentation" — im Skript sauber.
