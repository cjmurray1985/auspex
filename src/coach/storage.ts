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

// Signed-out (guest) history stays on the original key so existing users lose
// nothing; each signed-in profile gets its own namespaced key.
const GUEST_KEY = 'mtgdraft:records:v1';
const PROFILE_PREFIX = 'auspex:records:v1:';
const ACCOUNT_KEY = 'auspex:account';
const MIGRATED_FLAG = 'auspex:migratedGuest';
const LEGACY_KEY = 'mtgdraft:history';
const MAX_RECORDS = 200;

/** Read the active profile id straight from storage (no store dependency). */
function activeProfileId(): string | null {
  try {
    const raw = localStorage.getItem(ACCOUNT_KEY);
    if (raw) return (JSON.parse(raw) as { id?: string }).id ?? null;
  } catch {
    /* ignore */
  }
  return null;
}

/** The records key for the current account (guest key when signed out). */
function recordsKey(): string {
  const id = activeProfileId();
  return id ? PROFILE_PREFIX + id : GUEST_KEY;
}

/**
 * One-time: copy pre-account (guest) history into the first profile a user
 * signs into, so their existing performance data follows them. Later profiles
 * start fresh. Best-effort; never throws.
 */
export function migrateGuestData(profileId: string): void {
  try {
    if (localStorage.getItem(MIGRATED_FLAG)) return;
    const guest = localStorage.getItem(GUEST_KEY);
    const profKey = PROFILE_PREFIX + profileId;
    if (guest && !localStorage.getItem(profKey)) {
      localStorage.setItem(profKey, guest);
    }
    localStorage.setItem(MIGRATED_FLAG, '1');
  } catch {
    /* ignore */
  }
}

/**
 * The default, fully-offline store. Keeps the compact (card-blob-free)
 * `DraftRecord` set in `localStorage`, namespaced per profile, and migrates the
 * old lightweight history for signed-out users.
 */
export class LocalStorageRecordStore implements RecordStore {
  load(): DraftRecord[] {
    const key = recordsKey();
    try {
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw) as DraftRecord[];
    } catch {
      /* corrupt — fall through */
    }
    // Only the guest namespace inherits the ancient lightweight history.
    return key === GUEST_KEY ? migrateLegacy() : [];
  }

  save(records: DraftRecord[]): void {
    try {
      const trimmed = records.slice(-MAX_RECORDS);
      localStorage.setItem(recordsKey(), JSON.stringify(trimmed));
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
