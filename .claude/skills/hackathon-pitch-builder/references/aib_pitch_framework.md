# AI BEAVERS Hackathon — Pitch Framework (canonical, deduped)

Single source of truth for this project's pitch: the 7-slide structure, the
6-criteria judging rubric, the 3-minute live-pitch beats, and the design
palette. The builder emits exactly what the reviewer scores — keep them in
lockstep. Adapted from the generic investor pitch-deck framework; everything
investor-specific (10-12 slides, seed/Series-A weights, LTV/CAC gating) was
replaced with the *published AI BEAVERS rules* (Hamburg, House of AI,
06.06.2026). Source docs: `docs/AI BEAVERS founder hackathon judging and
scoring guide.md`, `docs/founder hackathon - participant guide (logistics).md`.

## Hard constraints (from the published rules)

1. **Max 7 slides.** Every slide must do work. There is NO separate title /
   cover slide — the 7 work-slides are the deck. The builder bakes company name
   + tagline onto slide 1.
2. **3-minute live pitch, no Q&A** in the preliminary round. Finalists get
   3 min + 2 min Q&A. The *spoken pitch* carries the score, not the deck alone.
3. **Submission by 19:00 (hard cut):** public GitHub repo (README + same-day
   commit history) + the ≤7-slide deck. Live demo / hosted URL is preferred but
   optional — and you can demo live during the pitch.
4. **Built during the event.** Idea notes, research, a prepared demo transcript
   are allowed; a pre-built product is not.

## The 7 work-slides (builder JSON key → slide)

This is the exact sequence `create_pitch_deck.py` emits and
`deck_structure_scorer.py` checks. Combined slides keep the count at 7.

| # | Slide | JSON key | What strong looks like |
|---|-------|----------|------------------------|
| 1 | Problem & Kunde | `problem_customer` (+ `first_sentence`, `company_name`, `tagline`) | ONE named customer (role/segment), quantified pain, what they do today (badly). No "everyone". |
| 2 | Lösung & Produkt | `solution_product` (+ `demo_url`) | What you built, how it works, demo/QR. Show, don't describe. |
| 3 | Why Now | `why_now` | What changed (new API, regulation, cost collapse). For AI: why more than a wrapper. |
| 4 | Markt & Wettbewerb | `market_competition` `{market, our_advantages, competitors}` | Bottom-up sizing (count × €/customer). Direct + indirect competitors + status quo. Never "no competition". |
| 5 | Geschäftsmodell & Evidence | `business_evidence` | Who pays, how much, how often + what you validated (quote, pilot, LOI). |
| 6 | Go-to-Market | `go_to_market` | How the first 50 customers find you. A real, runnable channel — not "SEO" / "go viral". |
| 7 | Team (+ Kontakt) | `team` (+ `contact`) | Why this team has the edge. End with contact. |

Market and Competition are merged onto one slide (rubric criterion "Market +
business potential" covers both) so the count stays at 7. Business model and
traction/evidence are merged for the same reason.

## The 6 judging criteria (the scorer's rubric, weights = 100)

| Criterion | Weight | Strong signal |
|---|---:|---|
| Problem + customer clarity | 20 | Specific named customer + concrete pain. Kills "everyone". |
| Market + business potential | 20 | Bottom-up sizing, who-pays clarity, honest competition. |
| Product execution + demo | 20 | Built + visibly works; live demo / hosted URL. |
| AI-native leverage + technical | 15 | AI as capability, not decoration. Best: the agent *acts*. |
| Evidence, insight + founder edge | 15 | Quote / conversation / domain access / why-this-team. Most-missed. |
| Pitch clarity | 10 | First-sentence shape; one idea per slide; concrete next step. |

Gate target: **rubric score ≥ 80, ≤ 7 slides, no missing core slide.**

## The 3-minute live pitch (beat structure — this wins or loses it)

The deck is the artifact; the 3-minute spoken pitch is what judges score. Five
beats. If a demo runs, the demo IS beats 2-3. Fix the FIRST SENTENCE above all.

1. **[0:00–0:25] Customer + problem (the first sentence).** Shape:
   *"We help [specific customer] do [specific painful job] because today they
   are stuck with [bad current workaround]."* Say who it's for and what painful
   thing you solve — in one sentence, before anything else.
2. **[0:25–1:35] What you built — show it.** Run the demo. Let the product DO
   the thing on screen. Narrate the core workflow, not the architecture.
3. **[1:35–2:10] Why now + the proof beat.** What changed that makes this
   possible/urgent; drop the real customer quote / evidence here.
4. **[2:10–2:35] Evidence / founder edge.** Why you are the team — domain
   access, the conversation you had, the insight others miss.
5. **[2:35–3:00] What you'd do next + close.** One concrete next step (who you
   test with Monday, what you'd charge). End on the one-line vision.

Judge-friendly rule: in 3 minutes, make the judge's job easy. One idea per
breath. Numbers, not adjectives. If you fix only one thing, fix sentence one.

## Design (projector palette)

- 16:9 widescreen. Primary `#1A365D` (navy), Secondary `#2B6CB0` (blue),
  Accent `#E53E3E` (red — urgency), Text `#1A202C`, BG white / `#F7FAFC`.
- Headlines 36-40pt, body 18-22pt, footnote 10-13pt. Slide `n/7` + name footer.
- One idea per slide. Numbers, not adjectives.

## Bottom-up market sizing (compute, don't hand-wave)

Use `scripts/metrics.py` for the model teaser, but the market slide wants
**bottom-up**: `addressable customers × revenue per customer per year`. State
the customer count source. "1% of a $100B market" scores low — the rubric says
so explicitly.

## Top mistakes (rubric-flagged — the scorer warns on these)

1. More than 7 slides → disqualifying structure here.
2. "Everyone needs this" / no specific customer.
3. "The market is huge" with no customer detail / no bottom-up math.
4. Claiming "no competition".
5. Adjective-only traction ("strong growth") instead of numbers / a quote.
6. Generic AI-trend framing ("AI-powered", "revolution") — AI must be a real
   capability that the product visibly uses.
7. A demo that looks good but doesn't prove the core use case.
8. Old work presented as built-at-the-hackathon (judges inspect git history).
9. Walls of text — one idea per slide.
10. Weak team slide (names only, no "why us"), no contact.

## What does NOT win points (don't over-invest)

Prettiest deck, giant TAM slide with no buyer logic, most complex architecture,
production-grade polish, long feature lists, generic AI wrapper with startup
vocabulary. A focused product with a specific customer + honest traction logic
beats a broad glossy pitch.
