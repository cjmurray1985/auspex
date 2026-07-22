import type { CoachProfile } from './types';

/**
 * Spaced coaching — next-draft focus (PRE-52 · Sprint 4, Pillar B)
 * ===============================================================
 * Carries the player's strongest *recurring* mistake into the next draft as a
 * single focus, so coaching compounds across sessions instead of resetting
 * each time. Built entirely on facts the progression engine already detected
 * (`profile.recurring`), so:
 *  - No focus without a recurring fact (never manufactured).
 *  - Exactly one focus at a time.
 *  - Dismissible and non-blocking; drafting is never gated on it.
 *  - No manufactured urgency — a plain observation plus one next step.
 * When the habit stops recurring, `nextDraftFocus` returns null on its own.
 */
export interface DraftFocus {
  /** Stable id derived from the backing recurring pattern. */
  id: string;
  /** The recurring habit, in the coach's voice. */
  title: string;
  /** Why it's flagged (frequency-based observation). */
  why: string;
  /** The single next action to take this draft. */
  action: string;
}

/**
 * The one habit to focus on for the next draft: the strongest recurring
 * pattern (a "focus"-severity habit first, else the top-ranked one), or null
 * when there is no recurring fact yet.
 */
export function nextDraftFocus(profile: CoachProfile): DraftFocus | null {
  const p = profile.recurring.find((r) => r.severity === 'focus') ?? profile.recurring[0];
  if (!p) return null;
  return { id: `focus-${p.id}`, title: p.title, why: p.description, action: p.recommendation };
}

// Session-scoped dismissal: don't nag within a session, but re-offer next
// session until the habit stops recurring (at which point the focus is gone).
const KEY = 'auspex:focus:dismissed:v1';

function readDismissed(): Set<string> {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw) return new Set(JSON.parse(raw) as string[]);
  } catch {
    /* ignore — treat as none dismissed */
  }
  return new Set();
}

export function isFocusDismissed(id: string): boolean {
  return readDismissed().has(id);
}

export function dismissFocus(id: string): void {
  try {
    const s = readDismissed();
    s.add(id);
    sessionStorage.setItem(KEY, JSON.stringify([...s]));
  } catch {
    /* non-fatal — dismissal is best-effort */
  }
}
