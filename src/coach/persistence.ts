import type { CategoryKey, DraftRecord, DraftReview, HabitFlag, PickTier } from './types';
import { canonicalPair } from './context';
import { getRecordStore } from './storage';

/**
 * Persistence layer
 * =================
 * Stores a compact, decision-quality record of every completed draft so the app
 * can coach the individual over time. Kept deliberately small (no card blobs) so
 * a long history fits comfortably in storage. The profile engine reads these
 * records; nothing here computes coaching — it only remembers.
 *
 * Where records physically live is behind the `RecordStore` seam (see
 * `storage.ts`); this module only maps a review → record and reads/writes
 * through the active store. That keeps the door open for a remote-sync backend
 * without touching this file, the engines, or the UI.
 */

// Re-exported so callers can register an alternative store from one place.
export { getRecordStore, setRecordStore, LocalStorageRecordStore } from './storage';
export type { RecordStore } from './storage';

function catScore(review: DraftReview, key: CategoryKey): number {
  return review.categories.find((c) => c.key === key)?.score ?? 0;
}

function deckMetric(review: DraftReview, key: string): number {
  const m = review.deck.metrics.find((x) => x.key === key);
  if (!m) return 0;
  const n = parseInt(m.value, 10);
  return Number.isFinite(n) ? n : 0;
}

/** Largest recovery: the biggest rise in projected equity from a prior trough. */
function bestRecovery(review: DraftReview): number {
  let trough = Infinity;
  let best = 0;
  for (const p of review.equity) {
    trough = Math.min(trough, p.yours);
    best = Math.max(best, p.yours - trough);
  }
  return Math.round(best);
}

function computeFlags(review: DraftReview): HabitFlag[] {
  const flags: HabitFlag[] = [];
  const kinds = new Set(review.moments.map((m) => m.kind));
  const stayingOpen = catScore(review, 'staying-open');
  const commit = catScore(review, 'archetype-commitment');

  if (stayingOpen < 62) flags.push('early-commit');
  else if (commit < 62 && stayingOpen >= 76) flags.push('late-commit');
  if (catScore(review, 'signal-reading') < 62) flags.push('missed-signals');
  if (kinds.has('over-read-signal')) flags.push('over-read-signals');
  if (deckMetric(review, 'removal') < 3) flags.push('undervalue-interaction');
  if (catScore(review, 'deck-cohesion') < 60) flags.push('weak-cohesion');
  if (kinds.has('power-over-fit')) flags.push('power-over-fit');
  if (kinds.has('fit-over-power')) flags.push('fit-over-power');
  if (catScore(review, 'card-eval') < 60) flags.push('card-eval-slips');
  if (
    review.categories.find((c) => c.key === 'archetype-commitment')?.detail.some((d) => /abandon/i.test(d))
  )
    flags.push('abandoned-lane');
  return flags;
}

export function recordFromReview(review: DraftReview, set: string): DraftRecord {
  const categories = Object.fromEntries(
    review.categories.map((c) => [c.key, Math.round(c.score)]),
  ) as Record<CategoryKey, number>;
  return {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    date: new Date().toISOString(),
    set,
    mode: review.mode,
    overall: review.overall,
    letter: review.letter,
    confidence: review.confidence,
    archetype: review.archetype,
    colors: canonicalPair(review.deck.colors),
    archetypeWinRate: review.archetypeWinRate,
    categories,
    tierCounts: { ...review.tierCounts } as Record<PickTier, number>,
    momentKinds: review.moments.map((m) => m.kind),
    flags: computeFlags(review),
    bestRecovery: bestRecovery(review),
  };
}

export function loadRecords(): DraftRecord[] {
  return getRecordStore().load();
}

export function saveRecords(records: DraftRecord[]): void {
  getRecordStore().save(records);
}

export function appendRecord(record: DraftRecord): DraftRecord[] {
  const next = [...loadRecords(), record];
  saveRecords(next);
  return next;
}
