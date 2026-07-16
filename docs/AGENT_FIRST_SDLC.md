# Preordain — Agent-First SDLC

Preordain is run **agent-first**: agents plan, build, test, and ship autonomously.
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
Every sprint concludes with **demos of the functionality introduced**. Demos may
run in a **staging/preview environment** or via whatever tooling best achieves
sign-off (e.g. a Vercel/Netlify preview deploy, a recorded walkthrough, or a
local run against the acceptance criteria). A human signs off to close the sprint.

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

### Enforcement (server-side branch protection)
Branch protection / rulesets are **not available on GitHub Free for private
repositories** (the API returns 403 "Upgrade to GitHub Pro or make this
repository public"). To make the merge policy server-enforced, choose one:
- **Make the repo public** (branch protection is free on public repos), or
- **Upgrade to GitHub Pro** (keeps the repo private).

Recommended protection once enabled (encodes agent-first):
- Require status check **`Lint · Test · Build`** to pass (strict / up-to-date).
- **Do not** require pull-request reviews (autonomous merge).
- `enforce_admins: true`; no force-push; no branch deletion.

Until then, agents **self-enforce** by only merging PRs whose CI is green.

## Operating hygiene

- All git/GitHub work uses the **personal** account (`cjmurray1985`); the active
  `gh` account is restored to the work account after each push. **No Yahoo-owned
  tooling** touches this project (Linear, GitHub, CI are all personal).
- Cadence anchors to the MTG set-drop calendar (~every 3 months); see
  `DECISION_LOG.md` for the set-launch readiness checklist.
