import { useSyncExternalStore } from 'react';

/**
 * Minimal path-based router
 * =========================
 * Auspex has no page framework — navigation is a zustand `phase` machine. This
 * adds just enough URL routing for the Draft Academy to give each set its own
 * shareable page (…/auspex/draft-academy/msh/) without pulling in react-router.
 *
 * Paths are expressed relative to the Vite base (`import.meta.env.BASE_URL`),
 * which is `/` in dev and `/auspex/draft-academy/` on GitHub Pages. Everything
 * here works with either. Deep links depend on the SPA fallback (`404.html`)
 * shipped by the Pages deploy workflow.
 */

/** Vite base path — always ends with a slash (e.g. '/' or '/auspex/draft-academy/'). */
const BASE = import.meta.env.BASE_URL;

/** The current path relative to the app base, without leading/trailing slashes. */
export function currentSubPath(): string {
  let p = window.location.pathname;
  if (p.startsWith(BASE)) p = p.slice(BASE.length);
  return p.replace(/^\/+|\/+$/g, '');
}

const listeners = new Set<() => void>();
function emit() {
  for (const l of listeners) l();
}

/** Push a new sub-path (relative to base) and re-render subscribers. */
export function navigate(subPath: string) {
  const clean = subPath.replace(/^\/+|\/+$/g, '');
  const url = BASE + (clean ? `${clean}/` : '');
  if (url === window.location.pathname) return;
  window.history.pushState({}, '', url);
  emit();
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  window.addEventListener('popstate', emit);
  return () => {
    listeners.delete(cb);
    if (listeners.size === 0) window.removeEventListener('popstate', emit);
  };
}

/** React hook: the current sub-path, updating on navigate()/back/forward. */
export function useSubPath(): string {
  return useSyncExternalStore(subscribe, currentSubPath);
}
