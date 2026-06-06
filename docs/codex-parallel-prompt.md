# Codex parallel task — aibeavers_hackathon (NO CONFLICTS)

You are **Codex**, working in parallel with Jacob (Cursor) and Phil (Claude).
Repo: `/home/jw/Documents/Repositories/aibeavers_hackathon`
Hackathon demo: **Nacharbeits-Agent** for Finanzberater.

## Your mission (pick Track A first; Track B only if A is done)

**Track A — CRM sandbox execution (primary, most isolated)**
**Track B — Voice Q&A polish (secondary, UI-only)**

Do **one track per branch**. Do not rescaffold the app.

---

## HARD RULES — do not violate

### Do NOT touch (Phil's lane)

- `docs/**` (especially `tagesbau-und-prompts.md`, prompts prose) — *except this file*
- `demo-transcript.json` content
- `docker-compose*`, `Dockerfile*`, Hetzner/infra, OTEL/tracing, `Fördermittel/**`
- `src/agent.ts` system prompts
- GPU/Voxtral/Headscale/pgvector anything

### Do NOT touch (Jacob / Cursor active lane)

- `apps/web/components/shell/AppShell.tsx`
- `apps/web/components/DemoClient.tsx`
- `apps/web/lib/demo-state.ts` (unless doing Track B and only the `runQa` signature + Voice hook — see below)
- `packages/shared/src/schemas/**` (JSON contract is Phil-owned)
- `apps/web/next.config.ts`
- Root `package.json`, `pnpm-workspace.yaml`
- `src/tools/email.ts`, `src/tools/calendar.ts` (hero path — frozen)
- `apps/web/app/api/analyze/route.ts`, `apps/web/app/api/qa/route.ts`

### Git discipline

```bash
git checkout -b codex/crm-sandbox    # Track A
# or
git checkout -b codex/voice-qa         # Track B
```

Small commits. **Never commit `.env` or secrets.**

### Verify before done

```bash
cd /home/jw/Documents/Repositories/aibeavers_hackathon
pnpm typecheck:web
```

---

## Context you need (read only)

- Product canon: `docs/02-KONZEPT-der-nacharbeits-agent.md`
- JSON contract + action shapes: `packages/shared/src/schemas/analysis.ts`
- Mock analysis: `packages/shared/src/mocks/analysis-berger-1.json`
- CRM action shape: `{ typ: "crm_task", titel: string, faelligkeit: string }` (e.g. `"+7d"`)
- Demo customer: **Thomas Berger**
- `POST /api/execute-actions` already handles `kalender` + `email_entwurf` live; **`crm_task` is stubbed** (returns `status: "mocked"`). Your job is real CRM write with mock fallback.

---

## TRACK A — CRM sandbox (recommended)

### Create NEW files only

```
apps/web/app/api/lib/crm/
  types.ts          # CrmResult, CrmProvider interface
  parse-faelligkeit.ts   # reuse logic from execute-helpers if needed, don't duplicate badly
  hubspot.ts        # create task/deal/note in HubSpot sandbox
  pipedrive.ts      # create activity/deal in Pipedrive sandbox
  index.ts          # executeCrmTask(action, ctx) — picks provider from env, mock fallback
```

### Env vars — append ONLY to `.env.example` (new section at bottom)

```
# CRM (Codex — sandbox)
CRM_PROVIDER=mock          # mock | hubspot | pipedrive
HUBSPOT_ACCESS_TOKEN=
PIPEDRIVE_API_TOKEN=
PIPEDRIVE_COMPANY_DOMAIN=  # e.g. yourcompany
```

### Surgical edit (ONLY file you're allowed to modify outside `crm/`)

**File:** `apps/web/app/api/execute-actions/route.ts`
**ONLY** replace the `case "crm_task":` block (lines ~88–98) to call:

```ts
import { executeCrmTask } from "../lib/crm";
// ...
case "crm_task":
  return await executeCrmTask(action, { kunde, kundeEmail: kunde_email });
```

### Behavior

- `CRM_PROVIDER=mock` or missing token → `{ status: "mocked", panel_data: {...} }` (same UX as today)
- Real write success → `{ status: "success", external_id, panel_data }`
- Failure → `{ status: "error", message }` — **never throw**; demo must not break

### Optional UI tweak (allowed)

`apps/web/components/panels/CrmPanel.tsx` — show `external_id` / "Live in HubSpot" badge when result is success. Pass data via existing `actions` prop only; do not refactor PanelOrchestrator.

### Do NOT

- Add new dependencies without documenting in `apps/web/package.json` only (not root)
- Change kalender/email_entwurf paths in execute-actions

---

## TRACK B — Voice Q&A polish (only after A or if CRM blocked)

### Problem

`components/qa/QaPanel.tsx`, `PresetQuestions.tsx`, `VoicePlayer.tsx` exist but **PanelOrchestrator.tsx uses an inline Q&A UI** and does not play ElevenLabs audio.

### Allowed files

- `apps/web/components/panels/PanelOrchestrator.tsx` — replace inline `QaPanel` function with imports from `components/qa/*`
- `apps/web/components/qa/VoicePlayer.tsx`
- `apps/web/components/qa/QaAnswer.tsx`
- `apps/web/lib/demo-state.ts` — **minimal change only:**
  - `runQa(frage?: string)` calls `askQuestion(frage ?? DEFAULT, meetings)`
  - After answer, call `synthesizeSpeech(result.antwort)` and pass audio URL to panel (handle 501 gracefully — text-only fallback)

### Do NOT

- Change `/api/tts/route.ts` unless fixing an obvious bug (no rewrite)
- Change analyze flow or checklist timing

### Preset questions (demo script)

1. "Wie viel soll Herr Berger monatlich einzahlen?"
2. "Zeig mir alle offenen Punkte aus BEIDEN Terminen."
3. "Hat er nachhaltig investieren wollen?" → should hit refusal or berger-2 beleg

---

## Definition of done

**Track A**

- [ ] `executeCrmTask` works with `CRM_PROVIDER=mock` (no regression)
- [ ] HubSpot OR Pipedrive path implemented (one real provider is enough)
- [ ] `pnpm typecheck:web` passes
- [ ] Short commit: `feat(web): CRM sandbox execution with mock fallback`

**Track B**

- [ ] Preset Q&A uses shared qa components
- [ ] Voice plays when `ELEVENLABS_API_KEY` set; silent fallback otherwise
- [ ] `pnpm typecheck:web` passes
- [ ] Short commit: `feat(web): wire Q&A presets and ElevenLabs playback`

---

## If blocked

- No CRM API key → ship mock-only provider + document env in `.env.example`
- Merge conflicts → stop and list conflicting files; do not force-push
- Unsure about schema → read `packages/shared`, do not invent fields

## Coordination note

Jacob owns deploy + hero calendar/mail. Phil owns prompts + infra. **You own CRM execution + voice UX** — nothing else.
