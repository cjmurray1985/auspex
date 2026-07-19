import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { create } from 'zustand';
import type { RatedCard } from '../types';
import { keywordHints } from '../data/keywords';

/**
 * Global hover-preview layer, in the spirit of Arena: hovering a card shows an
 * enlarged version (with keyword reminder boxes) positioned beside the card so
 * it never covers it, plus a soft color-matched glow around the hovered card.
 */

interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface HoverState {
  card: RatedCard | null;
  rect: Rect | null;
  mode: 'full' | 'keywords';
  /** Whether to draw the color glow around the hovered card. */
  glow: boolean;
  /** When frozen (e.g. during a pick), `show` is ignored so a card being
      animated away can't re-trigger the glow. */
  frozen: boolean;
  show: (card: RatedCard, rect: Rect, mode: 'full' | 'keywords', glow?: boolean) => void;
  hide: () => void;
  freeze: () => void;
  unfreeze: () => void;
  /** Fully clear the preview AND any freeze — used on screen/phase changes so a
   *  hover can never leak from the draft into the coach review. */
  reset: () => void;
}

export const useHover = create<HoverState>((set) => ({
  card: null,
  rect: null,
  mode: 'full',
  glow: true,
  frozen: false,
  show: (card, rect, mode, glow = true) =>
    set((s) => (s.frozen ? {} : { card, rect, mode, glow })),
  hide: () => set({ card: null, rect: null }),
  freeze: () => set({ frozen: true }),
  unfreeze: () => set({ frozen: false }),
  reset: () => set({ card: null, rect: null, frozen: false }),
}));

const toRect = (el: Element): Rect => {
  const r = el.getBoundingClientRect();
  return { left: r.left, top: r.top, width: r.width, height: r.height };
};

/** Spread these onto any element representing `card`. */
export function hoverProps(
  card: RatedCard,
  mode: 'full' | 'keywords' = 'full',
  opts?: { glow?: boolean },
): Pick<React.HTMLAttributes<HTMLElement>, 'onMouseEnter' | 'onMouseLeave'> {
  const glow = opts?.glow !== false;
  // Only fire on enter/leave — not on every mouse move — so the hover store
  // (and the preview layer) don't re-render continuously while the pointer
  // sits over a card. The preview is anchored to the card's rect, not the
  // cursor, so per-move updates were pure overhead.
  return {
    onMouseEnter: (e) => useHover.getState().show(card, toRect(e.currentTarget), mode, glow),
    onMouseLeave: () => useHover.getState().hide(),
  };
}

// Bumped 20% from the previous 340px.
const PREVIEW_W = 408;
const PREVIEW_H = PREVIEW_W * 1.4;
const KW_W = 240;
const GAP = 20;

/** Glow color echoing the card's color identity. */
function glowColor(card: RatedCard): string {
  if (card.typeLine.includes('Land') && !card.colors.length) return '#d0b070';
  if (card.colors.length > 1) return '#e9c46a';
  const c = card.colors[0];
  return (
    {
      W: '#f2e6bf',
      U: '#5fa8e6',
      B: '#9a7fce', // violet reads better than pure black
      R: '#e5715a',
      G: '#6cc47f',
    }[c] ?? '#a9bccf'
  );
}

/**
 * Color-matched glow around the hovered card. Kept in its own always-mounted
 * AnimatePresence so it can fade *out* (rather than blink out) when the hover
 * clears — including on a pick, where we fade the glow before flying the card.
 */
function GlowLayer({ card, rect, show }: { card: RatedCard | null; rect: Rect | null; show: boolean }) {
  return (
    <AnimatePresence>
      {card && rect && show && (
        <motion.div
          key={card.instanceId ?? card.id}
          className="hover-glow"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12, ease: 'easeOut' }}
          style={{
            left: rect.left - 4,
            top: rect.top - 4,
            width: rect.width + 8,
            height: rect.height + 8,
            boxShadow: `0 0 9px 1px ${glowColor(card)}cc, 0 0 20px 4px ${glowColor(card)}55`,
          }}
          aria-hidden
        />
      )}
    </AnimatePresence>
  );
}

export function CardPreviewLayer() {
  const { card, rect, mode, glow } = useHover();

  // Safety net so a preview can never get "stuck": if the hovered element
  // unmounts (e.g. the last pick flies away into grading, or a review step
  // swaps cards) the onMouseLeave never fires. Any of these globally dismiss it.
  useEffect(() => {
    const hide = () => useHover.getState().hide();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') hide();
    };
    window.addEventListener('scroll', hide, true);
    window.addEventListener('pointerdown', hide, true);
    window.addEventListener('blur', hide);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('scroll', hide, true);
      window.removeEventListener('pointerdown', hide, true);
      window.removeEventListener('blur', hide);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  return (
    <>
      <GlowLayer card={card} rect={rect} show={glow} />
      {card && rect && <PreviewBlock card={card} rect={rect} mode={mode} />}
    </>
  );
}

function PreviewBlock({ card, rect, mode }: { card: RatedCard; rect: Rect; mode: 'full' | 'keywords' }) {
  const hints = keywordHints(card);
  const showBlock = mode === 'full' || hints.length > 0;

  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Extra card panels: back face (DFC) and any tokens the card creates.
  const extraCards: Array<{ src: string; tag: string }> = [];
  if (mode === 'full') {
    if (card.backImage) extraCards.push({ src: card.backImage, tag: 'Back Face' });
    for (const t of card.tokenImages ?? []) extraCards.push({ src: t, tag: 'Creates Token' });
  }

  // Position the block on whichever side of the card has room, then vertical
  // fallback — so it never overlaps the hovered card.
  const cardPanels = mode === 'full' ? 1 + extraCards.length : 0;
  const cardsW = cardPanels * PREVIEW_W + Math.max(0, cardPanels - 1) * 10;
  const blockW = cardsW + (hints.length ? KW_W + 10 : 0);
  const blockH = mode === 'full' ? PREVIEW_H + 18 : hints.length * 78 + 8;

  const rightRoom = vw - rect.left - rect.width;
  const leftRoom = rect.left;

  let left: number;
  let top: number;
  if (rightRoom >= blockW + GAP) {
    left = rect.left + rect.width + GAP;
    top = clamp(rect.top + rect.height / 2 - blockH / 2, 8, vh - blockH - 8);
  } else if (leftRoom >= blockW + GAP) {
    left = rect.left - GAP - blockW;
    top = clamp(rect.top + rect.height / 2 - blockH / 2, 8, vh - blockH - 8);
  } else {
    // No horizontal room: stack above or below, whichever is larger
    const belowRoom = vh - rect.top - rect.height;
    const aboveRoom = rect.top;
    left = clamp(rect.left + rect.width / 2 - blockW / 2, 8, vw - blockW - 8);
    top =
      belowRoom >= aboveRoom
        ? Math.min(rect.top + rect.height + GAP, vh - blockH - 8)
        : Math.max(rect.top - GAP - blockH, 8);
  }

  return (
    <>
      <div className="hover-layer" style={{ left, top }}>
        {mode === 'full' && (
          <div className="hover-card-panel" style={{ width: PREVIEW_W }}>
            <img
              className="hover-card-img"
              src={card.imageLarge || card.imageNormal}
              alt={card.name}
              style={{ width: PREVIEW_W }}
            />
          </div>
        )}
        {extraCards.map((ec, i) => (
          <div key={i} className="hover-card-panel" style={{ width: PREVIEW_W }}>
            <span className="hover-panel-tag">{ec.tag}</span>
            <img className="hover-card-img" src={ec.src} alt={ec.tag} style={{ width: PREVIEW_W }} />
          </div>
        ))}
        {showBlock && hints.length > 0 && (
          <div className="hover-keywords" style={{ width: KW_W }}>
            {hints.map((h) => (
              <div key={h.name} className="hover-kw">
                <div className="hover-kw-name">{h.name}</div>
                <div className="hover-kw-text">{h.text}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(v, max));
}
