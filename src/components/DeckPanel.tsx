import type { CSSProperties } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useDraft } from '../store';
import { hoverProps } from './CardPreview';
import { ManaCost, MiniCurve } from './ManaSymbols';
import type { RatedCard } from '../types';

const isLand = (c: RatedCard) => c.typeLine.includes('Land');

/** WUBRG / multicolor / colorless / land key used to tint each row. */
function colorKey(card: RatedCard): string {
  if (isLand(card)) return 'L';
  if (card.colors.length > 1) return 'M';
  if (card.colors.length === 0) return 'C';
  return card.colors[0];
}

// Official MTG mana colors (full-contrast) for the multicolor gradient frame.
const FRAME_HEX: Record<string, string> = {
  W: '#f5f2e1',
  U: '#0e68ab',
  B: '#2c2a33',
  R: '#d3202a',
  G: '#136f3f',
};
const GOLD_FRAME = '#c9a44a';

/** Colors in the order they appear in the mana cost (first colored pip first),
 *  deduped — e.g. {1}{G}{W}{W} → ['G','W']. Falls back to the card's color set. */
function manaColorOrder(card: RatedCard): string[] {
  const order: string[] = [];
  const seen = new Set<string>();
  for (const tok of card.manaCost.match(/\{([^}]+)\}/g) ?? []) {
    for (const ch of tok.slice(1, -1).split('/')) {
      if ('WUBRG'.includes(ch) && !seen.has(ch)) {
        seen.add(ch);
        order.push(ch);
      }
    }
  }
  return order.length ? order : card.colors;
}

/**
 * Full-contrast gradient for the lower rectangle of multicolor rows,
 * transitioning through the card's drafted colors (mana-cost order). 2–3 colors
 * get the gradient; 4+ colors fall back to the flat gold frame defined in CSS.
 */
function capStyle(card: RatedCard): CSSProperties | undefined {
  if (colorKey(card) !== 'M') return undefined;
  let cols = manaColorOrder(card);
  if (cols.length < 2) cols = card.colors;
  if (cols.length >= 4) return undefined; // flat gold frame via CSS
  const stops = cols.map((c) => FRAME_HEX[c] ?? GOLD_FRAME).join(', ');
  return { background: `linear-gradient(120deg, ${stops})` };
}

interface Group {
  card: RatedCard;
  qty: number;
}

/** Group identical cards (same oracle id) so duplicates show a multiplier. */
function groupCards(cards: RatedCard[]): Group[] {
  const map = new Map<string, Group>();
  for (const c of cards) {
    const g = map.get(c.id);
    if (g) g.qty += 1;
    else map.set(c.id, { card: c, qty: 1 });
  }
  return [...map.values()].sort(
    (a, b) =>
      Number(isLand(a.card)) - Number(isLand(b.card)) ||
      a.card.cmc - b.card.cmc ||
      a.card.name.localeCompare(b.card.name),
  );
}

/**
 * The right-side deck panel shown during the draft: a deckbox header with the
 * first pick's art, a live count and mana curve, the running (grouped) card
 * list, and a Deck / Sideboard toggle. Clicking a row moves one copy to the
 * other pile.
 */
export function DeckPanel() {
  const deck = useDraft((s) => s.deck);
  const humanPool = useDraft((s) => s.humanPool);
  const activeTab = useDraft((s) => s.activeTab);
  const setActiveTab = useDraft((s) => s.setActiveTab);
  const moveToDeck = useDraft((s) => s.moveToDeck);
  const moveToPool = useDraft((s) => s.moveToPool);

  const deckIds = new Set(deck.map((c) => c.instanceId ?? c.id));
  const sideboard = humanPool.filter((c) => !deckIds.has(c.instanceId ?? c.id));

  const active = activeTab === 'deck' ? deck : sideboard;
  const groups = groupCards(active);
  const boxArt = active[0]?.artCrop ?? active[0]?.imageNormal;

  // Clicking a deck card sends a copy to the sideboard, and vice-versa.
  const onRowClick = (card: RatedCard) =>
    activeTab === 'deck' ? moveToPool(card) : moveToDeck(card);

  return (
    <div className="deck-panel">
      <div className="ddp-header">
        <div
          className="deckbox"
          style={boxArt ? { backgroundImage: `url(${boxArt})` } : undefined}
        >
          {!boxArt && <span className="deckbox-empty">?</span>}
        </div>
        <div className="ddp-meta">
          <div className="ddp-title">{activeTab === 'deck' ? 'Deck' : 'Sideboard'}</div>
          <div className="ddp-count">
            {active.length}
            {activeTab === 'deck' && <span className="ddp-count-max">/40</span>} Cards
          </div>
        </div>
        <MiniCurve cards={active} />
      </div>

      <div className="ddp-list">
        <AnimatePresence initial={false}>
          {groups.map((g) => (
            <motion.div
              key={g.card.id}
              layout
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className={`ddp-row c-${colorKey(g.card)}`}
              onClick={() => onRowClick(g.card)}
              {...hoverProps(g.card, 'full')}
            >
              <span className="ddp-qty">{g.qty}x</span>
              <div className="ddp-cap" style={capStyle(g.card)}>
                <div className="ddp-inner">
                  <span className="ddp-name">{g.card.name}</span>
                  <ManaCost cost={g.card.manaCost} />
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {!groups.length && (
          <div className="ddp-empty">
            {activeTab === 'deck' ? 'Your picks appear here.' : 'Sideboard picks stash here.'}
          </div>
        )}
      </div>

      <div className="ddp-tabs">
        <button
          className={`ddp-tab${activeTab === 'deck' ? ' active' : ''}`}
          onClick={() => setActiveTab('deck')}
        >
          Deck <span className="ddp-tab-n">{deck.length}</span>
        </button>
        <button
          className={`ddp-tab${activeTab === 'sideboard' ? ' active' : ''}`}
          onClick={() => setActiveTab('sideboard')}
        >
          Sideboard <span className="ddp-tab-n">{sideboard.length}</span>
        </button>
      </div>
    </div>
  );
}
