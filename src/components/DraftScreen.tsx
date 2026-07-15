import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useDraft, PICK_SECONDS } from '../store';
import { Card3D } from './Card3D';
import { hoverProps, useHover } from './CardPreview';
import { DeckPanel } from './DeckPanel';
import type { RatedCard } from '../types';

// Display order: WUBRG, then multicolor, colorless, lands.
const COLOR_GROUP_ORDER = ['W', 'U', 'B', 'R', 'G', 'M', 'C', 'L'];
const RARITY_ORDER: Record<string, number> = { mythic: 0, rare: 1, uncommon: 2, common: 3 };

function colorGroup(card: RatedCard): string {
  if (card.typeLine.includes('Land') && !card.colors.length) return 'L';
  if (card.colors.length > 1) return 'M';
  return card.colors[0] ?? 'C';
}

function sortPackForDisplay(pack: RatedCard[]): RatedCard[] {
  return [...pack].sort((a, b) => {
    const rarityDiff = RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity];
    if (rarityDiff !== 0) return rarityDiff;
    const groupDiff =
      COLOR_GROUP_ORDER.indexOf(colorGroup(a)) - COLOR_GROUP_ORDER.indexOf(colorGroup(b));
    if (groupDiff !== 0) return groupDiff;
    return a.cmc - b.cmc || a.name.localeCompare(b.name);
  });
}

function Timer() {
  const pickDeadline = useDraft((s) => s.pickDeadline);
  const humanPack = useDraft((s) => s.humanPack);
  const makePick = useDraft((s) => s.makePick);
  const [remaining, setRemaining] = useState(PICK_SECONDS);

  useEffect(() => {
    const id = setInterval(() => {
      if (!pickDeadline) return;
      const left = Math.max(0, (pickDeadline - Date.now()) / 1000);
      setRemaining(left);
      if (left <= 0 && humanPack.length) {
        // Auto-pick the strongest card, like Arena does on timeout
        const best = humanPack.reduce((a, b) => (b.rating.score > a.rating.score ? b : a));
        makePick(best);
      }
    }, 250);
    return () => clearInterval(id);
  }, [pickDeadline, humanPack, makePick]);

  const pct = (remaining / PICK_SECONDS) * 100;
  const urgent = pct < 25;
  return (
    <div className="timer-wrap">
      <svg
        className={`timer-clock${urgent ? ' urgent' : ''}`}
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden
      >
        <circle cx="12" cy="13" r="8.2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M12 8.6V13l2.8 1.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M9 3h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
      <div className="pick-timer">
        <div className={urgent ? 'urgent' : ''} style={{ width: `${pct}%` }} />
      </div>
      <span className={`timer-secs${urgent ? ' urgent' : ''}`}>{Math.ceil(remaining)}s</span>
    </div>
  );
}

export function DraftScreen() {
  const humanPack = useDraft((s) => s.humanPack);
  const currentRound = useDraft((s) => s.currentRound);
  const currentPickInRound = useDraft((s) => s.currentPickInRound);
  const makePick = useDraft((s) => s.makePick);
  const [lastPicked, setLastPicked] = useState<string | null>(null);
  const pickingRef = useRef(false);
  const sortedPack = useMemo(() => sortPackForDisplay(humanPack), [humanPack]);

  // Whenever a new pack is shown, keep the hover glow/preview frozen until the
  // cards have finished animating in — otherwise a card sliding under the
  // (stationary) cursor fires a boundary hover and the glow flashes on cards
  // that aren't visually loaded yet. The settle time scales with pack size to
  // match the staggered entrance.
  useEffect(() => {
    const hover = useHover.getState();
    hover.freeze();
    const settle = Math.min(sortedPack.length, 15) * 40 + 320;
    const t = setTimeout(() => hover.unfreeze(), settle);
    // Always release the freeze on cleanup (incl. unmount into the builder) so
    // hover can never get stuck suppressed.
    return () => {
      clearTimeout(t);
      hover.unfreeze();
    };
  }, [currentRound, currentPickInRound, sortedPack.length]);

  const pick = (card: RatedCard) => {
    if (pickingRef.current) return; // ignore rapid double-clicks
    pickingRef.current = true;

    // Fade the hover glow away first, and freeze hover so the card being
    // animated away can't re-trigger it — the glow never lingers past the card.
    const hover = useHover.getState();
    hover.freeze();
    hover.hide();

    // Glow fades (~0.12s), then the card flies away at the same speed as before.
    // Hover stays frozen here — the pack-change effect below unfreezes it only
    // once the next pack has finished animating in.
    const GLOW_MS = 120;
    setTimeout(() => setLastPicked(card.instanceId ?? card.id), GLOW_MS);
    setTimeout(() => {
      makePick(card);
      pickingRef.current = false;
    }, GLOW_MS + 180);
  };

  return (
    <div className="draft-screen">
      <div className="draft-topbar">
        <h2 className="draft-pp">
          <span className="pack-dots">
            {[0, 1, 2].map((i) => (
              <i
                key={i}
                className={`pack-dot${i === currentRound ? ' on' : ''}${i < currentRound ? ' done' : ''}`}
              />
            ))}
          </span>
          PICK {currentPickInRound + 1}
        </h2>
        <Timer />
      </div>

      <div className="draft-body">
        <motion.div
          className="pack-grid"
          key={`${currentRound}-${currentPickInRound}`}
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.04 } } }}
        >
          <AnimatePresence>
            {sortedPack.map((card) => (
              <motion.div
                key={card.instanceId ?? card.id}
                className="pack-slot"
                variants={{
                  hidden: { opacity: 0, y: 26, rotateY: 28, scale: 0.92 },
                  show: {
                    opacity: 1,
                    y: 0,
                    rotateY: 0,
                    scale: 1,
                    transition: { type: 'spring', stiffness: 260, damping: 22 },
                  },
                }}
                animate={
                  lastPicked === (card.instanceId ?? card.id)
                    ? { x: 260, y: -140, opacity: 0, scale: 0.4, transition: { duration: 0.26 } }
                    : undefined
                }
                style={{ perspective: 900 }}
                {...hoverProps(card, 'full')}
              >
                <Card3D card={card} onClick={() => pick(card)} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        <DeckPanel />
      </div>
    </div>
  );
}
