import type { CategoryKey, DraftRecord, PickTier } from './types';

/**
 * Storage seam
 * ============
 * Persistence talks to a `RecordStore` — never to `localStorage` directly. This
 * is the single seam a future remote-sync backend implements: it can cache
 * locally for offline reads and sync in the background, with no change to the
 * engines, the UI, or `persistence.ts`.
 *
 * Offline-first is preserved because the default store is fully local. A store
 * must be synchronous and must never throw — callers treat persistence as a
 * best-effort side channel, and drafting/grading must work even if it fails.
 */
export interface RecordStore {
  /** Return all persisted draft records, oldest first. Must never throw. */
  load(): DraftRecord[];
  /** Persist the full record set (implementations may trim). Must never throw. */
  save(records: DraftRecord[]): void;
}

const KEY = 'mtgdraft:records:v1';
const LEGACY_KEY = 'mtgdraft:history';
const MAX_RECORDS = 200;

/**
 * The default, fully-offline store. Keeps the compact (card-blob-free)
 * `DraftRecord` set in `localStorage` and migrates the old lightweight history.
 */
export class LocalStorageRecordStore implements RecordStore {
  load(): DraftRecord[] {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw) as DraftRecord[];
    } catch {
      /* corrupt — fall through to legacy migration */
    }
    return migrateLegacy();
  }

  save(records: DraftRecord[]): void {
    try {
      const trimmed = records.slice(-MAX_RECORDS);
      localStorage.setItem(KEY, JSON.stringify(trimmed));
    } catch {
      /* quota — non-fatal */
    }
  }
}

/** Best-effort migration from the old lightweight history key. */
function migrateLegacy(): DraftRecord[] {
  try {
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const old = JSON.parse(legacy) as Array<{
        date: string;
        set: string;
        overall: number;
        letter: string;
        archetype: string;
      }>;
      return old.map((h, i) => ({
        id: `legacy-${i}`,
        date: h.date,
        set: h.set,
        overall: h.overall,
        letter: h.letter,
        confidence: 'medium',
        archetype: h.archetype,
        colors: '',
        categories: {} as Record<CategoryKey, number>,
        tierCounts: { best: 0, strong: 0, acceptable: 0, weak: 0, mistake: 0 } as Record<PickTier, number>,
        momentKinds: [],
        flags: [],
        bestRecovery: 0,
      }));
    }
  } catch {
    /* ignore */
  }
  return [];
}

let active: RecordStore = new LocalStorageRecordStore();

/** The store persistence currently reads/writes through. */
export function getRecordStore(): RecordStore {
  return active;
}

/**
 * Swap the active store. A remote-sync backend registers here at startup — no
 * engine or UI change required. Pass `null` to reset to the local default.
 */
export function setRecordStore(store: RecordStore | null): void {
  active = store ?? new LocalStorageRecordStore();
}
