# Pitch — AI BEAVERS Hackathon

Adaptierte Version von `~/Dokumente/coding/pitch-deck-agent/`, zugeschnitten auf
die **echten AI-BEAVERS-Regeln**: 7-Slide-Hard-Cap (statt 10-12), 6-Kriterien-
Judging-Rubrik (statt YC/Sequoia/a16z), deutsche Slides, plus 3-Minuten-Live-
Pitch-Skript. Inhalte geerdet auf `docs/02-KONZEPT-der-nacharbeits-agent.md`.

## Artefakte hier
- `pitch_data.json` — strukturierte Pitch-Daten (geerdet auf Konzept-02; TODOs markiert).
- `nacharbeits-agent-deck.pptx` — generiertes 7-Slide-Deck (→ PDF exportieren für Abgabe).
- `pitch_script.md` — getimtes 3-Minuten-Skript (Demo = Beat 2–3).
- `deck_summary.md` — Slide-für-Slide-Summary, Input für den Scorer.

## Workflow (geschlossener Loop)
```bash
S=.claude/skills
# 1. Deck bauen
python3 $S/hackathon-pitch-builder/scripts/create_pitch_deck.py \
    docs/pitch/pitch_data.json docs/pitch/nacharbeits-agent-deck.pptx
# 2. Scoren (gegen die 6 Judging-Kriterien + 7-Slide-Gate)
python3 $S/hackathon-pitch-reviewer/scripts/deck_structure_scorer.py \
    docs/pitch/deck_summary.md
# JSON-Gate: gate_pass=true → score>=80 UND <=7 Slides UND kein fehlendes Kern-Slide
python3 $S/hackathon-pitch-reviewer/scripts/deck_structure_scorer.py \
    docs/pitch/deck_summary.md --json
```

Oder einfach den Agenten fahren — er macht den ganzen Loop (build → script →
score → iterate bis gate_pass):

> „Nutze den hackathon-pitch-architect und bau unseren Pitch fertig."

## Die Regeln (Single Source of Truth)
`.claude/skills/hackathon-pitch-builder/references/aib_pitch_framework.md`

## Setup
`uv pip install python-pptx` (verifiziert mit 1.0.2).
