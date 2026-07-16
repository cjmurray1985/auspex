# Preordain — Sprint 1 Plan (Phase 1)

**Owner:** CEO (ex-WOTC) · **Duration:** 2 weeks · **Team:** Phase 1 founding roster
(see `.cursor/rules/agency-*.mdc`) · **Status:** presented post-offsite, ready to execute

## North Star Metric

> **% of active drafters whose Draft Rating improves over a rolling window.**
> We win when players *get better*, not when they play more. Every ticket below
> names the lever (🎯) it pulls on this metric. (Ratified at the founding offsite —
> see `agency-mission.mdc`.)

## Sprint goal

> Harden Preordain from a brilliant prototype into a polished, resilient,
> set-launch-ready tool — **entirely within this client-only workspace.**

No backend exists yet, so this sprint deliberately does **not** build accounts,
sync, or payments (those need infrastructure outside this repo — see *Out of
scope*). Instead we bank every improvement that raises polish, resilience, and
retention using only the code in `src/`.

## Offsite decisions baked into this sprint
1. **The storage seam ships first** (DA-151) — no client→server work precedes it.
2. **Set-rotation config is the Q1 infra priority** (DA-101) — gates launch-readiness.
3. **LLM is enhancement-only, proven by a fact-contract test** (DA-111 + DA-112).
4. **"Improvement over outcome" gets a guard test** (DA-121) — the thesis, enforced.
5. **A habit flag → one weekly goal → at most one nudge** (DA-122 + DA-123) — no
   double-counting between Game Design and Behavioral Nudge.

## Guardrails (apply to every ticket)

- The `src/coach/` engines stay deterministic, offline-first, and free of
  React/network imports. Engines emit facts → `narrate.ts` phrases → UI renders.
- Additive, minimal diffs. No engine rewrites. Respect module boundaries.
- Hold the ~117 KB gzipped shell budget. `npm run lint` and `npm run build`
  stay green.

---

## Workstreams

### 1. Data resilience & set-launch readiness — 🔧 Data Engineer
Anchors the product to the ~3-month set cadence.

- **DA-101 · Set rotation as config.** Move the active set (`MSH`) into a single
  config surface so adding a set is a data change, not code edits across
  `src/data/scryfall.ts` and `src/data/seventeenlands.ts`.
  *AC:* switching sets touches one config value; app still boots offline.
- **DA-102 · Data-maturity confidence.** Widen provider confidence when 17lands
  samples are below the ≥500 GIH WR floor (early-set noise).
  *AC:* `providers/seventeenlands.ts` reports lower confidence on thin data;
  contested/`not-penalized` logic in `decision.ts` reflects it.
- **DA-103 · Fail-soft cache audit.** Verify every source degrades to the next
  provider (WinRate → PickOrder → Heuristic) with no crash when a fetch fails.
  *AC:* simulated 17lands/Scryfall failure still yields a full grade offline.

### 2. LLM narration adapter (scaffold) — 🤖 AI Engineer
Prove the swap without shipping secrets.

- **DA-111 · `Explainer` adapter scaffold.** Implement a pluggable adapter
  behind `setExplainer()` in `narrate.ts` with a hard deterministic fallback to
  `TemplateExplainer` on error/timeout/offline. Model transport stubbed to a
  local/dev path (real key routing is a backend task, out of scope).
  *AC:* toggling the adapter changes tone only; grades identical; offline still
  narrates; no secrets in the bundle.
- **DA-112 · Fact-contract test.** Snapshot the exact fact objects each
  `Explainer` method receives so an LLM can never see re-evaluable card pools.
  *AC:* test fails if any decision-bearing data leaks into narration inputs.

### 3. Progression & ethical retention — 🎯 Game Designer + 🧠 Behavioral Nudge
The meta-game that makes improvement stick.

- **DA-121 · Rating-curve tuning.** Review `profile.ts` so the Draft Rating can
  rise on a cold deck and stall on a hot one (decision-quality, not outcomes).
  *AC:* documented curve; unit checks on recency weighting.
- **DA-122 · Habit → weekly goal mapping.** Ensure each detected habit flag
  produces exactly one specific, winnable weekly goal.
  *AC:* every `HabitFlag` maps to a goal with a clear completion condition.
- **DA-123 · Ethical nudge surfacing.** Surface fact-grounded nudges in the UI
  (dismissible, one action each, no manufactured urgency). Copy phrased via
  `narrate.ts`, sourced from `profile.ts`/`moments.ts`.
  *AC:* no nudge without a backing fact; all dismissible; core drafting never
  blocked.

### 4. Design system & accessibility — 🎯 UI Designer + 🎭 Brand Guardian
- **DA-131 · Tokenize the design system.** Extract color/type/spacing +
  pip/curve components into tokens in `src/index.css`.
  *AC:* screens consume tokens; no ad-hoc hex values in components.
- **DA-132 · Color-is-not-the-only-signal.** Pair every color pip with an
  icon/label/shape across builder + review (colorblind safety, WCAG contrast).
  *AC:* audit passes; grade/color meaning readable in grayscale.
- **DA-133 · IP + attribution surface.** Add an unobtrusive "unofficial fan
  tool" disclaimer and Scryfall/17lands/mtgpics attribution.
  *AC:* no implied WOTC affiliation; all data/art sources credited.

### 5. Delight & performance — ✨ Whimsy Injector + 🎨 Frontend Developer
- **DA-141 · Rank-up celebration.** Add a milestone burst on rank-up / new
  personal best, scaled to the achievement, on the existing zero-dep FX canvas.
  *AC:* fires only on real milestones; no dependency added.
- **DA-142 · `prefers-reduced-motion` pass.** Reduced-motion fallback for
  atmosphere + every celebration.
  *AC:* reduced-motion users get a calm, complete experience.
- **DA-143 · Lazy-load heavy views.** Code-split the review UI and atmosphere so
  the initial shell stays lean.
  *AC:* verified bundle stays within budget; first paint unaffected.

### 6. Architecture & product hygiene — 🏛️ Software Architect + 🧭 PM + 🧭 CoS
- **DA-151 · Persistence sync-readiness (interface only).** Refactor
  `persistence.ts` behind a storage interface so a future remote sync backend
  drops in without engine/UI changes. Implementation stays localStorage.
  *AC:* storage is an interface; `DraftRecord` stays card-blob-free; still
  offline.
- **DA-152 · Metric definitions.** PM defines the one behavior/retention metric
  each shipped ticket should move; CoS logs decisions + set-launch checklist.
  *AC:* every workstream has a named success metric in the decision log.

---

## North Star lever map (🎯 = how each workstream moves rating-improvement)
| Workstream | Lever on "% of drafters improving" |
|---|---|
| 1 · Data resilience | Accurate, day-one set data → grades players can trust and learn from |
| 2 · LLM narration | Clearer *why* behind each pick → faster learning, thesis kept intact |
| 3 · Progression & nudges | The direct engine of improvement: better decisions → higher rating |
| 4 · Design & a11y | Legible feedback for everyone → more players can actually improve |
| 5 · Delight & perf | Earned celebration reinforces the improvement loop; speed keeps them in it |
| 6 · Architecture & hygiene | Protects the rating's integrity and enables durable progress tracking |

## Out of scope this workspace (needs infra beyond this repo)
Accounts & auth · cross-device sync backend · live 17lands proxy deployment ·
payments/subscriptions · mobile app · CI/CD & hosting · real community ops.
These are Phase 2 once a server exists (tracked separately).

## Definition of done
`npm run lint` + `npm run build` green · app fully functional offline after first
load · no regression to grades or bundle budget · each ticket meets its AC and
moves its named metric.
