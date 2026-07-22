# Auspex — Decision Log & Metric Definitions

Owner: Product Manager + Chief of Staff · Established: Sprint 1 (Phase 1)

This is the single source of truth for **why** we made each call and **which
metric** each piece of work is accountable to. It is append-only; supersede an
entry rather than editing history.

## North Star Metric

> **% of active drafters whose Draft Rating improves over a rolling window.**

We win when players *get better*, not when they play more. No initiative may
optimize a vanity/engagement metric at the expense of this one.

## Success metric per workstream (Sprint 1)

| # | Workstream | Success metric (how it serves the North Star) |
|---|---|---|
| 1 | Data resilience & set-launch readiness | Accurate, day-one set data → players learn from grades they can trust |
| 2 | LLM narration adapter | Clearer *why* per pick → faster learning, with the thesis provably intact |
| 3 | Progression & ethical retention | The direct engine of improvement: better decisions → higher rating |
| 4 | Design system & accessibility | Legible feedback for everyone → more players *can* improve |
| 5 | Delight & performance | Earned celebration reinforces the loop; speed keeps players in it |
| 6 | Architecture & product hygiene | Protects rating integrity and durable progress tracking |

## Ratified decisions (founding offsite)

| Date | Decision | Owner | Rationale |
|---|---|---|---|
| 2026-07-15 | North Star = rating-improvement %, not engagement | PM | Coaching product; improvement is the end, engagement a means |
| 2026-07-15 | Storage seam ships first (PRE-5) | Software Architect | De-risks the hardest transition; unblocks nothing prematurely |
| 2026-07-15 | Set-rotation is a config op (PRE-6) | Data Engineer | Set drops every ~3 months must be scheduled, not a scramble |
| 2026-07-15 | LLM is enhancement-only, proven by a fact-contract test (PRE-9/10) | AI Engineer | Engines decide; the narrator only phrases — never re-decides |
| 2026-07-15 | "Improvement over outcome" is guard-tested (PRE-11) | Game Designer | The rating must rise on a cold deck and stall on a hot one |
| 2026-07-15 | One habit → one goal → at most one nudge (PRE-12/13) | Behavioral Nudge | No double-counting; ethical, fact-grounded, dismissible |
| 2026-07-15 | Ship private, unofficial fan tool with full attribution (PRE-16) | Brand Guardian | Respect WOTC IP and the community's data sources |
| 2026-07-15 | Personal Linear + personal GitHub only; no Yahoo-owned tooling | CEO | Keep the venture cleanly separate from employer systems |
| 2026-07-15 | CI (lint+test+build) is the per-PR gate; added GitHub Actions | DevOps | Enforce quality automatically on every change (PRE-21) |
| 2026-07-15 | Agent-first SDLC: HITL only at sprint planning + demo sign-off; sprints run autonomously; no per-PR human review | CEO / CoS | Human reasoning at key junctures; agents execute in between (PRE-22, see AGENT_FIRST_SDLC.md) |
| 2026-07-15 | Branch protection deferred — GitHub Free blocks it on private repos; decision pending: make public or upgrade to Pro | CEO | Enforcement needs a plan/visibility change; agents self-enforce green-CI merges until then |
| 2026-07-22 | Sprint 4 = "Signature & Substance": two pillars — (A) skeuomorphic grimoire feel + signature whimsy, (B) coaching that moves the rating | CEO | Answers the standing "generic/AI-made" brand note while pushing the North Star; approved at planning gate |
| 2026-07-22 | Skeuomorphism ships as tokenized surface primitives, not ad-hoc styling; legibility/interactivity/a11y are non-negotiable | UI Designer / Brand Guardian | Keeps the look consistent and centrally governed (PRE-48) |
| 2026-07-22 | Reconciled S3 work shipped ad-hoc between sprints: PRE-42/44/45/46 marked Done; PRE-1–4 onboarding boilerplate cancelled | CoS | Linear should reflect reality; keep the board trustworthy |

## Set-launch readiness checklist (run before each set drop)

- [ ] `ACTIVE_SET` updated (code, name, mtgpicsCode, mtgpicsSetId) — one place (PRE-6)
- [ ] Scryfall card data + art resolve for the new set
- [ ] 17Lands data available; thin early-set data widens confidence (PRE-7)
- [ ] Fail-soft verified: grading works offline / on source failure (PRE-8)
- [ ] Background art list refreshed for the set (or gracefully skips 404s)
- [ ] `npm run lint`, `npm run test`, `npm run build` all green
- [ ] App boots and grades a full draft offline after first load

## Out of scope this workspace (Phase 2 — needs a backend)

Accounts & auth · cross-device sync · live 17Lands proxy deploy · payments ·
mobile · CI/CD & hosting · real community ops. The storage seam (PRE-5) and the
LLM client seam (PRE-9) are the drop-in points for these.
