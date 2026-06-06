---
name: hackathon-pitch-reviewer
description: >
  Score an AI BEAVERS hackathon pitch against the published 6-criteria judging
  rubric and the hard 7-slide cap before submission. Flags weak/missing
  criteria, over-limit decks, and rubric-flagged weak language with a 0-100
  score. Use before submitting the deck, before pitching, or when reviewing a
  hackathon pitch.
metadata:
  version: 1.0.0
  adapted_from: pitch-deck-agent/pitch-deck-reviewer (investor → hackathon)
  python-tools: deck_structure_scorer.py
---

# Hackathon Pitch Reviewer

Score a pitch against the *actual* AI BEAVERS rubric — 6 weighted criteria, a
hard 7-slide cap, and the rubric's named weak-signals. Adapted from the
investor pitch-deck-reviewer: the YC/Sequoia slide rubric and the
reward-more-slides logic were replaced with the hackathon's 6 criteria and a
disqualifying >7-slide gate.

This checks *coverage + structure*, not truth: a well-covered deck for a vague
business still scores high. Always add a human content critique on top.

## Workflow

1. **Summarize** the deck slide-by-slide into `deck_summary.md` — one bullet
   per slide, describing what it *says*. Use `assets/deck_summary_template.md`.
   (Or generate it straight from `pitch_data.json` in the closed loop.)
2. **Score:**
   ```bash
   python3 scripts/deck_structure_scorer.py deck_summary.md
   python3 scripts/deck_structure_scorer.py deck_summary.md --json   # machine
   ```
3. **Read the gate.** The payload reports `score` (0-100), `slide_cap_ok`,
   missing core slides, and `gate_pass` (score ≥ 80 AND ≤ 7 slides AND no
   missing core slide). Close every FAIL and warning, then re-score.
4. **Content critique.** The scorer is structural. On top, judge by hand:
   is the customer truly specific? Is traction numbers-not-adjectives? Is there
   a real quote (criterion 5 is the most-missed)? Does the AI actually *act*?

## Closed loop with the builder

When `create_pitch_deck.py` produced the deck, the slide titles already map to
this rubric (Problem & Kunde, Lösung & Produkt, Why Now, Markt & Wettbewerb,
Geschäftsmodell & Evidence, Go-to-Market, Team). Generate `deck_summary.md`
from the `pitch_data.json` keys, score, feed FAILs back into the JSON, iterate.

## References

- `references/aib_judging_heuristics.md` — the 6 criteria verbatim, scoring
  scale, what counts as evidence, structural mistakes.
- `assets/deck_summary_template.md` — 7-slide summary template.
