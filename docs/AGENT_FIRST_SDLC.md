# Auspex — Agent-First SDLC

Auspex is run **agent-first**: agents plan, build, test, and ship autonomously.
Humans-in-the-loop (HITL) are reserved for the few junctures where human reasoning
and judgment add the most value — **not** on every pull request.

## The two HITL gates

### Gate 1 — Sprint planning sign-off (before execution)
A human reviews and signs off on:
- The **planned work** for the sprint (the backlog / tickets), and
- The **overarching sprint goal for each department** (Engineering, Product,
  Design, GTM/Strategy).

Nothing is executed until this sign-off. This is where human strategy shapes
*what* gets built and *why*.

### Gate 2 — End-of-sprint demo & sign-off (after execution)
Every sprint concludes with a demo on the **live preview deploy**
(https://cjmurray1985.github.io/preordain/) or best-fit tooling. A human signs off
to close the sprint.

**Pre-demo (agent):** run a **live validation pass** (Chrome DevTools MCP) before
greenlighting — load the deploy, confirm no console errors, and smoke-test the
sprint's functionality. Automated CI cannot catch rendered-text or visual
regressions; the live pass can. Only greenlight once it is clean.

**Demo framing — assume the reviewer already knows everything built previously
(no re-teaching of prior work).** Tee up every demo as:
1. **Last time** — a one-line recap of what was reviewed last sprint.
2. **Today** — what this sprint delivers, oriented to *what to look for*.
3. **Next** — where we're heading.

**Feedback loop:** the demo invites **open-ended feedback**. The reviewer reacts
and steers; the reviewer does **not** write tickets. The team **interprets** that
feedback, converts it into tickets, and prioritizes them into the next sprint's
Gate-1 plan. This is the primary input that shapes the next sprint.

## Autonomous execution (everything between the gates)

Once the sprint is signed off, agents execute it **fully autonomously**:

1. Move the ticket to *In Progress* (Linear).
2. Branch off `main` (`wip/pre-<n>-<slug>`).
3. Implement to the ticket's acceptance criteria.
4. Run the gates locally: `npm run lint`, `npm test`, `npm run build`.
5. Open a PR (`Fixes PRE-<n>` for issue↔PR linking).
6. **Wait for CI to pass**, then merge (merge commit), delete the branch, sync `main`.
7. Linear auto-closes the issue on merge.

No per-PR human review is required. The **automated CI gate is the reviewer.**

## Merge policy

- **Required:** the `Lint · Test · Build` CI check must be green before merge.
- **Not required:** human PR review (agent-first — reserved for the two gates above).
- Merge only green PRs; never bypass a failing check.

### Enforcement (server-side branch protection) — ✅ live
The repo is **public**, so branch protection is enabled on `main` (agent-first):
- Requires the **`Lint · Test · Build`** status check to pass (strict / up-to-date).
- **No** pull-request reviews required (autonomous merge).
- `enforce_admins: true`; no force-push; no branch deletion.

Note: branch protection/rulesets are not available on GitHub Free for *private*
repos (would need GitHub Pro); going public unlocked it for free.

## Operating hygiene

- All git/GitHub work uses the **personal** account (`cjmurray1985`); the active
  `gh` account is restored to the work account after each push. **No Yahoo-owned
  tooling** touches this project (Linear, GitHub, CI are all personal).
- Cadence anchors to the MTG set-drop calendar (~every 3 months); see
  `DECISION_LOG.md` for the set-launch readiness checklist.
