import type { CoachProfile } from './types';

/**
 * Ethical nudges (DA-123)
 * =======================
 * A nudge is a single, dismissible prompt with exactly one next action, drawn
 * *only* from facts the coach already detected (recurring habits and unmet
 * weekly goals). Rules encoded here:
 *  - **No nudge without a backing fact.** We never manufacture one; if there is
 *    nothing real to say, there is no nudge.
 *  - **One action.** Each nudge carries a single recommendation.
 *  - **No manufactured urgency.** Nudges are plain observations + a next step;
 *    no countdowns, streak-baiting, or loss-aversion copy.
 *  - **Dismissible & non-blocking.** Dismissals persist so we never nag; core
 *    drafting is never gated on a nudge.
 */
export interface Nudge {
  /** Stable id derived from the backing fact (used for dismissal). */
  id: string;
  source: 'habit' | 'goal';
  /** The observed fact, in the coach's voice. */
  title: string;
  /** The single next action. */
  action: string;
  /** Provenance: the id of the backing pattern/goal. */
  factId: string;
}

/**
 * Fact-grounded nudges in priority order. Recurring habits (the strongest real
 * signal) come first, then unmet weekly goals. Empty when nothing real exists.
 */
export function selectNudges(profile: CoachProfile): Nudge[] {
  const out: Nudge[] = [];
  for (const p of profile.recurring) {
    out.push({ id: `nudge-${p.id}`, source: 'habit', title: p.title, action: p.recommendation, factId: p.id });
  }
  for (const g of profile.goals) {
    if (g.met) continue; // a met goal is not a nudge
    out.push({ id: `nudge-${g.id}`, source: 'goal', title: g.title, action: g.detail, factId: g.id });
  }
  return out;
}

const DISMISS_KEY = 'mtgdraft:nudges:dismissed:v1';

function readDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (raw) return new Set(JSON.parse(raw) as string[]);
  } catch {
    /* ignore — treat as none dismissed */
  }
  return new Set();
}

export function isDismissed(id: string): boolean {
  return readDismissed().has(id);
}

export function dismissNudge(id: string): void {
  try {
    const s = readDismissed();
    s.add(id);
    localStorage.setItem(DISMISS_KEY, JSON.stringify([...s]));
  } catch {
    /* non-fatal — dismissal is best-effort */
  }
}

/**
 * The single nudge to show right now: the first fact-grounded, not-dismissed
 * candidate, or `null` when there is nothing (never manufactured).
 */
export function activeNudge(
  profile: CoachProfile,
  dismissed: (id: string) => boolean = isDismissed,
): Nudge | null {
  return selectNudges(profile).find((n) => !dismissed(n.id)) ?? null;
}
