# Auspex — Sprint 4 Plan ("Signature & Substance")

**Owner:** CEO (ex-WOTC) · **Duration:** 2 weeks (Linear cycle 1, Jul 20 – Aug 3)
**Team:** Phase 1 founding roster (see `.cursor/rules/agency-*.mdc`)
**Status:** approved at sprint-planning gate — executing autonomously
**Linear:** project *Phase 4 — Signature & Substance* · milestone *Sprint 4*

> Prior sprint plans (S1–S3) are captured in Linear milestones and
> `docs/DECISION_LOG.md`. This file always describes the **active** sprint.

## North Star Metric

> **% of active drafters whose Draft Rating improves over a rolling window.**
> We win when players *get better*, not when they play more. Each ticket names
> the lever (🎯) it pulls.

## Sprint goal

> Make Auspex **unmistakably ours** and make **getting better visible** —
> a signature skeuomorphic feel paired with coaching that measurably moves the
> rating. **Entirely within this client-only workspace.**

Two pillars:
- **A · Unmistakably Auspex** — answer the standing "components look generically
  AI-made" note with a bespoke, tactile scrying-instrument aesthetic.
- **B · Coaching that moves the rating** — deepen the improvement loop so the
  North Star actually climbs.

## Guardrails (apply to every ticket)

- `src/coach/` engines stay deterministic, offline-first, no React/network
  imports. Engines emit facts → `narrate.ts` phrases → UI renders.
- Additive, minimal diffs. Skeuomorphism via **tokens/primitives**, not ad-hoc
  hex. Legibility and interactivity never sacrificed for ornament.
- `prefers-reduced-motion` honored for every new motion/whimsy.
- Hold the bundle budget. `npm run lint` + `npm run build` stay green per PR.
- IP hygiene preserved (no WOTC pips/symbols; unofficial-fan-tool + attribution).

---

## Workstreams

### Pillar A — Unmistakably Auspex

- **S4-1 · Skeuomorphic grimoire GUI pass** (PRE-48 · 🎯 UI Designer + 🎭 Brand
  Guardian · High). Extend the token system with skeuomorphic surface primitives
  (bevels, inset/emboss, vellum/metal textures, rune dividers) and apply them
  coach → deck → landing. *AC:* shared primitives; coach matches the grimoire
  direction; consistent tactile treatment; no legibility/interactivity
  regression; a11y contrast + reduced-motion held.
  🎯 *Lever:* legible, trustworthy, distinctive feedback → players engage with
  and act on coaching.
- **S4-2 · Signature card-reveal & pick feedback** (PRE-50 · ✨ Whimsy + 🎨
  Frontend · Medium). Restrained "scry" micro-interaction on pick/reveal.
  *AC:* fires on pick/reveal only; never delays the click; zero new deps; budget
  held; fully disabled under reduced-motion.
  🎯 *Lever:* earned delight reinforces the draft→review→improve loop.

### Pillar B — Coaching that moves the rating

- **S4-3 · Set-tailored coaching content** (PRE-43 · 🧠 Behavioral Nudge + 🎯
  Game Designer · High). Archetype/color-pair-aware moments and copy per active
  set. *AC:* coaching references the format's real archetypes/signals;
  deterministic; fact-grounded; falls back cleanly for unknown sets.
  🎯 *Lever:* format-true advice → faster, transferable learning.
- **S4-4 · Improvement-over-time progress view** (PRE-51 · 🎯 Game Designer + 🎯
  UI Designer · Urgent). Trend surface: Draft Rating + a decision-quality signal
  over a rolling window. *AC:* rolling trend; honest during calibration;
  deterministic/offline via the storage seam; grayscale-legible; reduced-motion
  safe.
  🎯 *Lever:* makes improvement — the product's whole point — visible.
- **S4-5 · Resurface recurring mistakes (spaced coaching)** (PRE-52 · 🧠
  Behavioral Nudge + 🎯 Game Designer · High). Detect a repeated habit across
  drafts; resurface exactly one focus for the next draft. *AC:* recurring (not
  one-off); one focus; dismissible; fact-backed; never blocks drafting;
  deterministic/offline; phrased via `narrate.ts`.
  🎯 *Lever:* coaching compounds instead of resetting → sustained improvement.

### Hygiene
- Cancelled Linear onboarding boilerplate (PRE-1–4). ✅
- Reconciled S3 work shipped ad-hoc (PRE-42/44/45/46 → Done). ✅
- Confirm the set-launch checklist in `docs/DECISION_LOG.md` is current.

---

## North Star lever map
| Workstream | Lever on "% of drafters improving" |
|---|---|
| S4-1 Skeuo pass | Distinctive, legible feedback players trust and act on |
| S4-2 Whimsy | Earned delight reinforces the improvement loop |
| S4-3 Set-tailored coaching | Format-true advice → faster, transferable learning |
| S4-4 Progress view | Makes improvement visible → motivates the next draft |
| S4-5 Spaced coaching | Compounding practice on real weaknesses → higher rating |

## Out of scope this workspace (Phase 2 infra)
Accounts/auth · cross-device sync · live 17Lands proxy (PRE-26) · payments ·
mobile app · hosting/CI beyond current · community ops.

## Definition of done
`npm run lint` + `npm run build` green · app fully functional offline after first
load · no regression to grades or bundle budget · each ticket meets its AC and
moves its named metric · sprint closes with a demo.
