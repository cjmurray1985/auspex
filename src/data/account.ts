import { create } from 'zustand';
import { migrateGuestData } from '../coach/storage';

/**
 * Local profile / account
 * =======================
 * The app is offline-first and static-hosted, so "signing in" is currently a
 * LOCAL account: a handle that names a profile whose performance data + settings
 * live on this device, keyed by profile id. The same handle always resolves to
 * the same profile, so it behaves like an account across sessions. When a real
 * auth backend lands, this store becomes its client — the RecordStore seam
 * (see coach/storage.ts) already namespaces data per profile.
 */
export interface Profile {
  id: string;
  name: string;
  createdAt: string;
}

const KEY = 'auspex:account';

function load(): Profile | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Profile;
  } catch {
    /* ignore */
  }
  return null;
}

/** Stable id from a handle so re-entering the same name reopens the profile. */
function idFromName(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || `player-${Date.now().toString(36)}`;
}

interface AccountStore {
  profile: Profile | null;
  signIn: (name: string) => Profile;
  signOut: () => void;
}

export const useAccount = create<AccountStore>((set) => ({
  profile: load(),
  signIn: (name) => {
    const clean = name.trim().slice(0, 40);
    const id = idFromName(clean);
    const profile: Profile = { id, name: clean, createdAt: new Date().toISOString() };
    try {
      localStorage.setItem(KEY, JSON.stringify(profile));
    } catch {
      /* ignore */
    }
    // First-ever sign-in inherits any pre-account (guest) history.
    migrateGuestData(id);
    set({ profile });
    return profile;
  },
  signOut: () => {
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
    set({ profile: null });
  },
}));

/** Current profile id (read straight from storage; safe before the store inits). */
export function currentProfileId(): string | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return (JSON.parse(raw) as Profile).id;
  } catch {
    /* ignore */
  }
  return null;
}
