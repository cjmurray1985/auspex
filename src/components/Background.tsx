import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useDraft } from '../store';
import { artForSet, BG_MIN_WIDTH, artUrl, useBgPrefs } from '../data/backgrounds';
import { prefersReducedMotion } from '../fx/reducedMotion';

// The three.js atrium is decorative and menu-only, so it's code-split — three.js
// never lands in the draft/build bundle.
const AtriumScene = lazy(() =>
  import('./AtriumScene').then((m) => ({ default: m.AtriumScene })),
);

const ROTATE_MS = 16000;
// Skip anything narrower than this even if the CDN listing claimed otherwise.
const MIN_WIDTH = BG_MIN_WIDTH;

/**
 * Full-bleed hi-res art background scraped from mtgpics.com (set 493), cross-
 * fading between pieces with a slow Ken Burns drift. A dark, color-tinted scrim
 * plus a faint halftone overlay keep foreground UI legible and edges crisp on
 * hi-dpi displays. The pool is user-curatable via #bg-gallery.
 */
export function Background() {
  const phase = useDraft((s) => s.phase);
  const currentRound = useDraft((s) => s.currentRound);
  const selectedSet = useDraft((s) => s.selectedSet);
  const excluded = useBgPrefs((s) => s.excluded);

  const urls = useMemo(() => {
    // Homepage is a plain black canvas (a future 3D "seed" environment lands
    // here) — no rotating art on the menu.
    if (phase === 'menu') return [];
    // Only the SELECTED set's own mtgpics art — never another set's. Sets with
    // no scraped pool yield no urls, so the layer stays a clean gradient.
    const ex = new Set(excluded[selectedSet.code] ?? []);
    const pick = artForSet(selectedSet.code)
      .filter((a) => a.w >= MIN_WIDTH && !ex.has(a.num))
      .map((a) => artUrl(selectedSet.mtgpicsCode, a.num));
    // De-dupe and shuffle for variety across sessions
    return [...new Set(pick)].sort(() => Math.random() - 0.5);
  }, [excluded, selectedSet, phase]);

  // Two stacked layers we alternate between for a smooth crossfade. Each layer
  // carries its own crop position so portrait art can be top-anchored.
  type Layer = { url: string; pos: string } | null;
  const [layers, setLayers] = useState<{ a: Layer; b: Layer; showA: boolean }>({
    a: null,
    b: null,
    showA: true,
  });
  const idxRef = useRef(0);
  // URLs known to 404 or be below the resolution floor — skipped without refetch
  const rejected = useRef<Set<string>>(new Set());

  // Find the next art that loads and is at least MIN_WIDTH wide, then hand it back.
  const loadFrom = useRef<(start: number, onFound: (layer: { url: string; pos: string }) => void) => void>(
    () => {},
  );
  loadFrom.current = (start, onFound) => {
    if (!urls.length) return;
    let attempts = 0;
    const tryAt = (idx: number) => {
      if (attempts++ >= urls.length) return; // exhausted — nothing usable
      const url = urls[idx];
      if (rejected.current.has(url)) {
        tryAt((idx + 1) % urls.length);
        return;
      }
      const img = new Image();
      // Prioritise the very first background art so it arrives ASAP.
      if (idxRef.current === 0) img.fetchPriority = 'high';
      img.onload = () => {
        if (img.naturalWidth >= MIN_WIDTH) {
          idxRef.current = idx;
          // Portrait pieces (taller than wide, e.g. "Villain") crop from the
          // top so the subject's head/upper body stays in frame; landscape art
          // stays centered.
          const pos = img.naturalHeight > img.naturalWidth ? 'center top' : 'center center';
          onFound({ url, pos });
        } else {
          rejected.current.add(url); // too low-res
          tryAt((idx + 1) % urls.length);
        }
      };
      img.onerror = () => {
        rejected.current.add(url); // missing on mtgpics
        tryAt((idx + 1) % urls.length);
      };
      img.src = url;
    };
    tryAt(((start % urls.length) + urls.length) % urls.length);
  };

  // Cross-fade to a new image by loading it into the currently-hidden layer
  // and flipping which layer is shown.
  const crossfade = (layer: { url: string; pos: string }) =>
    setLayers((prev) =>
      prev.showA ? { ...prev, b: layer, showA: false } : { ...prev, a: layer, showA: true },
    );

  const showNext = useRef<() => void>(() => {});
  showNext.current = () => {
    loadFrom.current(idxRef.current + 1, crossfade);
  };

  // Seed the first layer once art is available — cross-fade it in too (both
  // layers start empty/hidden, so the first image fades rather than popping).
  useEffect(() => {
    if (!urls.length) return;
    idxRef.current = 0;
    rejected.current.clear();
    loadFrom.current(0, crossfade);
  }, [urls]);

  // On the menu, cycle gently on a timer (fresh hero on arrival too)
  useEffect(() => {
    if (phase !== 'menu' || urls.length < 2) return;
    showNext.current();
    const id = setInterval(() => showNext.current(), ROTATE_MS);
    return () => clearInterval(id);
  }, [phase, urls]);

  // During the draft, only change the art when the pack changes (each round)
  useEffect(() => {
    if (phase !== 'draft' || urls.length < 2) return;
    showNext.current();
  }, [phase, currentRound, urls]);

  // Returning to the homepage clears any art so it's a clean black canvas.
  useEffect(() => {
    if (phase === 'menu') setLayers({ a: null, b: null, showA: true });
  }, [phase]);

  if (phase === 'menu') {
    // Static art shown for reduced-motion users and as the Suspense fallback
    // while the 3D scene's chunk + texture load (also the WebGL-less fallback).
    const still = (
      <div
        className="bg-academy-img"
        style={{ backgroundImage: `url(${import.meta.env.BASE_URL}academy-atrium.jpg)` }}
      />
    );
    return (
      <div className="bg-root bg-academy" aria-hidden>
        {prefersReducedMotion() ? (
          still
        ) : (
          <Suspense fallback={still}>
            <AtriumScene />
          </Suspense>
        )}
        <div className="bg-academy-scrim" />
      </div>
    );
  }

  return (
    <div className={`bg-root bg-phase-${phase}`} aria-hidden>
      <div
        className={`bg-layer kenburns${layers.showA ? ' show' : ''}`}
        style={
          layers.a
            ? { backgroundImage: `url(${layers.a.url})`, backgroundPosition: layers.a.pos }
            : undefined
        }
      />
      <div
        className={`bg-layer kenburns${!layers.showA ? ' show' : ''}`}
        style={
          layers.b
            ? { backgroundImage: `url(${layers.b.url})`, backgroundPosition: layers.b.pos }
            : undefined
        }
      />
      {/* Fixed fine halftone screen: adds high-frequency micro-contrast that
          reads as crisper edges on hi-dpi displays, masking soft upscaling of
          the smaller (~1024px) pieces. Kept very subtle. */}
      <div className="bg-halftone" />
      <div className="bg-scrim" />
    </div>
  );
}
