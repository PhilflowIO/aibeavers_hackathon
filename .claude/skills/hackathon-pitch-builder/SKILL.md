---
name: hackathon-pitch-builder
description: >
  Build the AI BEAVERS founder-hackathon pitch — a 7-slide .pptx plus the
  3-minute live-pitch script — from this project's product canon. Enforces the
  hard 7-slide cap and the 6-criteria judging rubric. Use when creating,
  improving, or assembling the hackathon pitch deck or the 3-minute pitch for
  the Nacharbeits-Agent (or any AI BEAVERS submission).
metadata:
  version: 1.0.0
  adapted_from: pitch-deck-agent/pitch-deck-builder (investor → hackathon)
  python-tools: create_pitch_deck.py, metrics.py
---

# Hackathon Pitch Builder

Generate the AI BEAVERS pitch: a **7-slide** `.pptx` and the **3-minute** spoken
pitch, aligned to the published judging rubric. Adapted from the investor
pitch-deck-builder; the investor 10-12-slide framework and seed/Series-A
weights were replaced with the hackathon's hard 7-slide cap and 6-criteria
rubric.

Read `references/aib_pitch_framework.md` once at the start — it is the single
source of truth (7 slides, 6 criteria, 3-min beats, design).

## Workflow

1. **Ground in the canon.** For this project, content comes from
   `docs/02-KONZEPT-der-nacharbeits-agent.md` (canonical) — customer, problem,
   demo beats, positioning, first sentence are already written there. Do NOT
   invent customers, quotes, or numbers (project rule: "Kein Erfinden").
2. **Gather / fill the JSON** (model below). Probe for: the named customer, the
   quantified pain, the demo URL, a real customer quote (the most-missed
   evidence criterion), bottom-up market math, the GTM channel, the team edge.
   Offer placeholders for genuinely missing pieces and flag them.
3. **Bottom-up sizing.** Market slide wants `customers × €/customer/year`, not
   "1% of a huge market". Use `scripts/metrics.py` for any unit-economics teaser.
4. **Generate the deck:**
   `python3 scripts/create_pitch_deck.py pitch_data.json <name>-deck.pptx`
5. **Write the 3-minute script** as `pitch_script.md` using the 5-beat
   structure in the framework (the demo is beats 2-3). Time each beat. Fix the
   first sentence above all.
6. **Self-review.** Hand off to `hackathon-pitch-reviewer`. If the rubric score
   is < 80, or > 7 slides, or a core slide is missing, close the gap and
   regenerate. Loop until the gate passes.

## JSON data model

```json
{
  "company_name": "Projektname",
  "tagline": "Eine Zeile, was ihr tut",
  "first_sentence": "Wir helfen [Kunde] bei [schmerzhafter Job], weil sie heute [schlechter Workaround].",
  "problem_customer": ["Namentlicher Kunde (Rolle)", "Quantifizierter Schmerz", "Status quo heute"],
  "solution_product": ["Was ihr gebaut habt", "Kern-Workflow", "Der Aha-Moment"],
  "demo_url": "https://… (optional, stark erwünscht)",
  "why_now": ["Was sich geändert hat (API/Regulierung/Kosten)", "Warum mehr als ein Wrapper"],
  "market_competition": {
    "market": ["Bottom-up: N Kunden × €X/Jahr", "Quelle der Kundenzahl"],
    "our_advantages": ["Warum ihr gewinnt", "Verteidigbarkeit"],
    "competitors": ["Direkt", "Indirekt / Status quo"]
  },
  "business_evidence": ["Wer zahlt, wie viel, wie oft", "Was validiert (Quote/Pilot/LOI)"],
  "go_to_market": ["Wie die ersten 50 euch finden", "Ein konkreter Kanal"],
  "team": ["Gründer — relevanter Edge", "Warum dieses Team"],
  "contact": "name@domain — LinkedIn"
}
```

Only `company_name` is required; missing keys render a flagged placeholder.
`market_competition` is the `{market, our_advantages, competitors}` object →
the combined two-column slide 4.

## References

- `references/aib_pitch_framework.md` — 7 slides, 6 criteria, 3-min beats,
  design palette, bottom-up sizing, top mistakes. Read before advising.

## Setup

`uv pip install python-pptx` (or `pip install python-pptx`). Verified with
python-pptx 1.0.2.
