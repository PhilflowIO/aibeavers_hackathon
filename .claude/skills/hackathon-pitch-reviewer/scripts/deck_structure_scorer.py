#!/usr/bin/env python3
"""
AI BEAVERS Hackathon — Pitch Deck Scorer.

Adapted from the investor pitch-deck-reviewer (borghei heuristics) to the
*actual* AI BEAVERS founder-hackathon rubric (Hamburg, House of AI, 06.06.2026).

Two differences from the investor scorer this was forked from:

  1. Rubric. Investor decks are scored on YC/Sequoia slide presence. Hackathon
     projects are scored on the 6 published judging criteria (problem/customer
     20, market/business 20, product+demo 20, AI-leverage 15, evidence 15,
     pitch clarity 10). This scorer encodes those weights.

  2. Hard 7-slide cap. The investor scorer *warned* below 8 slides and rewarded
     10-12. This hackathon REJECTS decks over 7 slides ("max 7 slides, every
     slide must do work"). >7 is a disqualifying structural flag here, not a
     nudge. There is no separate cover slide — the 7 work-slides ARE the deck.

It scores *structure + coverage* read off a deck_summary.md, not truth. A
well-covered deck for a vague business still scores high here; always add a
human content critique on top (see the agent's hard rules).

Usage:
    python3 deck_structure_scorer.py deck_summary.md
    python3 deck_structure_scorer.py deck_summary.md --json
"""

import argparse
import json
import re
import sys
from pathlib import Path

# --- The 6 published AI BEAVERS judging criteria (weights sum to 100) -------
# Each criterion is matched against the deck-summary text via signal patterns.
# `anti` patterns are weak-signals that, if matched, drop a warning (the rubric
# explicitly calls these out as low-scoring: "everyone", "no competition",
# adjective-only traction, generic AI-trend slides).
RUBRIC = [
    {
        "key": "problem_customer",
        "label": "Problem + customer clarity",
        "weight": 20,
        "patterns": [
            r"\b(problem|pain|schmerz|broken|status quo|workaround|today they|heute)\b",
            r"\b(customer|kunde|user|segment|persona|buyer|käufer|berater|vermittler|role)\b",
        ],
        "need": "all",  # both a pain AND a named customer
        "anti": [r"\b(everyone needs|everybody needs|jeder (?:kann|braucht|will)|alle teams|all teams|any team|für alle)\b"],
        "hint": "Name ONE specific customer (role, segment) + a concrete, quantified pain. "
                "Avoid 'everyone' markets — the rubric scores them low.",
    },
    {
        "key": "market_business",
        "label": "Market + business potential",
        "weight": 20,
        "patterns": [
            r"\b(market|markt|TAM|SAM|SOM|addressable|bottom[- ]?up)\b",
            r"\b(business model|geschäftsmodell|pricing|preis|revenue|who pays|wer zahlt|€\s*/|\$\s*/|per (?:seat|month|user))\b",
        ],
        "need": "any",
        "anti": [r"\b(huge market|riesen[- ]?markt|1%\s*of)\b"],
        "hint": "Bottom-up sizing (customer count × revenue per customer), not '1% of a $100B "
                "market'. Say who pays, how much, how often.",
    },
    {
        "key": "product_demo",
        "label": "Product execution + demo",
        "weight": 20,
        "patterns": [
            r"\b(solution|lösung|product|produkt|how it works|wie es funktioniert|built|gebaut|prototype|prototyp)\b",
            r"\b(demo|live|preview|hosted|url|qr|screenshot|on[- ]screen|auf dem schirm)\b",
        ],
        "need": "any",
        "anti": [],
        "hint": "Show the built product. A live demo / hosted URL / QR strongly helps — the "
                "core workflow must visibly work, not just be described.",
    },
    {
        "key": "ai_leverage",
        "label": "AI-native leverage + technical approach",
        "weight": 15,
        "patterns": [
            r"\b(agent|LLM|model|modell|extract|transcript|transkript|autonom|automat)\b",
            r"\b(acts?|executes?|handelt|führt aus|does the work|tut|carries out|ausgeführt)\b",
        ],
        "need": "any",
        "anti": [r"\b(ai[- ]?powered|powered by ai|generic ai|ai trend|revolution)\b"],
        "hint": "AI as a meaningful capability, not decoration. Best signal: the agent "
                "ACTS/executes, it doesn't just summarize. Name what was built.",
    },
    {
        "key": "evidence_edge",
        "label": "Evidence, insight + founder edge",
        "weight": 15,
        "patterns": [
            r"\b(quote|interview|gespräch|conversation|pilot|LOI|waitlist|warteliste|validated|validiert)\b",
            r"\b(domain|access|zugang|why us|why this team|founder|edge|insight|lived experience|maklerpool)\b",
        ],
        "need": "any",
        "anti": [],
        "hint": "Real signal: a customer quote, a conversation, domain access, or a sharp reason "
                "you are the right team. This is the most-missed criterion — fix it with one "
                "real quote.",
    },
    {
        "key": "pitch_clarity",
        "label": "Pitch clarity",
        "weight": 10,
        "patterns": [
            r"\bwe help\b|\bwir (?:sind|helfen)\b|\bfirst sentence\b|\bone[- ]?liner\b",
            r"\b(next step|nächster schritt|go[- ]?to[- ]?market|gtm|first 50|erste 50|channel|kanal)\b",
        ],
        "need": "any",
        "anti": [r"\b(buzzword|synergy|disrupt|paradigm)\b"],
        "hint": "First sentence in the shape 'We help [customer] do [painful job] because today "
                "they [bad workaround]'. End with a concrete next step / GTM channel.",
    },
]

# --- The 7 recommended work-slides (structure gate, not points) -------------
# Order matters; presence is a structural check. No separate title/cover slide.
RECOMMENDED_SLIDES = [
    {"label": "1. Problem + Customer",
     "patterns": [r"\b(problem|pain|schmerz|customer|kunde|käufer)\b"]},
    {"label": "2. Solution + Product",
     "patterns": [r"\b(solution|lösung|product|produkt|built|gebaut|demo)\b"]},
    {"label": "3. Why Now",
     "patterns": [r"\bwhy now\b|\bwarum jetzt\b|\btiming\b|\bregulation|\bregulierung|\bshift|\bunlock|\bneu(?:erdings)?\b"]},
    {"label": "4. Market + Competition",
     "patterns": [r"\b(market|markt|TAM|SAM|SOM)\b", r"\b(competition|competitor|wettbewerb|alternative|status quo)\b"]},
    {"label": "5. Business model + Traction/Evidence",
     "patterns": [r"\b(business model|geschäftsmodell|pricing|preis|traction|evidence|evidenz|validated|pilot)\b"]},
    {"label": "6. Go-to-market",
     "patterns": [r"\b(go[- ]?to[- ]?market|gtm|first 50|erste 50|channel|kanal|distribution|vertrieb)\b"]},
    {"label": "7. Team (+ contact)",
     "patterns": [r"\b(team|founders?|gründer|hire|contact|kontakt)\b"]},
]


def _hit(patterns, text):
    return [bool(re.search(p, text, re.IGNORECASE | re.MULTILINE)) for p in patterns]


def score(text):
    matched, missing, warnings, total = [], [], [], 0
    for rule in RUBRIC:
        hits = _hit(rule["patterns"], text)
        ok = all(hits) if rule["need"] == "all" else any(hits)
        if ok:
            total += rule["weight"]
            matched.append({"label": rule["label"], "weight": rule["weight"]})
        else:
            missing.append({"label": rule["label"], "weight": rule["weight"], "hint": rule["hint"]})
        for ap in rule.get("anti", []):
            if re.search(ap, text, re.IGNORECASE | re.MULTILINE):
                warnings.append(f"Weak-signal in '{rule['label']}': matched anti-pattern /{ap}/ "
                                f"— the rubric scores this language low.")

    # Structure: recommended 7 work-slides present?
    slide_struct = []
    for s in RECOMMENDED_SLIDES:
        present = any(_hit(s["patterns"], text))
        slide_struct.append({"label": s["label"], "present": present})

    # Hard 7-slide cap. Count slide markers robustly. The summary's document
    # title (a single leading "# ...") is NOT a slide, so we never count H1s:
    # we take the strongest of the three real slide-marker conventions
    # (numbered list, "Slide/Folie N", or ##+ subheadings).
    numbered = re.findall(r"^\s*[0-9]+[.)]\s", text, re.MULTILINE)
    keyword = re.findall(r"^\s*(?:slide|folie)\s*\d+\s*[:\-]", text, re.IGNORECASE | re.MULTILINE)
    subheads = re.findall(r"^\s*#{2,}\s", text, re.MULTILINE)
    est = max(len(numbered), len(keyword), len(subheads))

    notes = []
    gate_pass = True
    if est > 7:
        notes.append(f"OVER LIMIT: {est} slides detected. The hackathon caps decks at 7 — "
                     f"cut {est - 7}. This is a hard submission rule, not a nudge.")
        gate_pass = False
    elif est == 0:
        notes.append("Could not detect slide headers — make sure each slide is a markdown "
                     "heading or numbered line so structure can be checked.")
    missing_core = [s["label"] for s in slide_struct if not s["present"]]
    if missing_core:
        notes.append("Recommended work-slides not detected: " + "; ".join(missing_core))

    return {
        "rubric": "ai-beavers-hackathon",
        "score": min(100, total),
        "estimated_slide_count": est,
        "slide_cap_ok": est <= 7 and est > 0,
        "gate_pass": gate_pass and total >= 80 and not missing_core,
        "matched": matched,
        "missing": missing,
        "warnings": warnings,
        "structure": slide_struct,
        "notes": notes,
    }


def render_human(r):
    out = ["AI BEAVERS Hackathon — Pitch Score", "=" * 60, "",
           f"Rubric score: {r['score']} / 100",
           f"Slides detected: {r['estimated_slide_count']}  "
           f"(cap = 7, {'OK' if r['slide_cap_ok'] else 'PROBLEM'})", ""]
    if r["matched"]:
        out.append(f"Criteria covered ({len(r['matched'])}):")
        out += [f"  PASS  {m['label']} (+{m['weight']})" for m in r["matched"]]
        out.append("")
    if r["missing"]:
        out.append(f"Criteria missing or weak ({len(r['missing'])}):")
        for m in r["missing"]:
            out.append(f"  FAIL  {m['label']} (-{m['weight']})")
            out.append(f"        Hint: {m['hint']}")
        out.append("")
    out.append("7-slide structure:")
    for s in r["structure"]:
        out.append(f"  {'OK  ' if s['present'] else 'MISS'} {s['label']}")
    out.append("")
    if r["warnings"]:
        out.append("Warnings (rubric-flagged weak language):")
        out += [f"  ! {w}" for w in r["warnings"]]
        out.append("")
    if r["notes"]:
        out.append("Structure notes:")
        out += [f"  - {n}" for n in r["notes"]]
        out.append("")
    if r["gate_pass"]:
        out.append("Verdict: GATE PASS — strong coverage, within slide cap, no missing core "
                   "slide. Now iterate on content quality, evidence, and the 3-min delivery.")
    elif r["score"] >= 80 and not r["slide_cap_ok"]:
        out.append("Verdict: content strong but FAILS the 7-slide cap. Cut slides before submit.")
    elif r["score"] >= 60:
        out.append("Verdict: solid, 1-2 criteria thin. Close the FAILs and re-score.")
    else:
        out.append("Verdict: significant gaps against the judging rubric. Address before 19:00.")
    return "\n".join(out)


def main():
    ap = argparse.ArgumentParser(description="Score a pitch deck summary against the AI BEAVERS rubric.")
    ap.add_argument("deck_summary", help="Path to deck_summary.md (slide-by-slide markdown)")
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args()

    path = Path(args.deck_summary)
    if not path.exists():
        print(f"Error: file not found: {path}", file=sys.stderr)
        return 1
    result = score(path.read_text(encoding="utf-8"))
    print(json.dumps(result, indent=2, ensure_ascii=False) if args.json else render_human(result))
    return 0 if result["gate_pass"] else 0  # always 0; gate_pass is in the payload


if __name__ == "__main__":
    sys.exit(main())
