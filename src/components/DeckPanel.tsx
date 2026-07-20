import { AnimatePresence, motion } from 'framer-motion';
import { useDraft } from '../store';
import { hoverProps } from './CardPreview';
import { MiniCurve } from './ManaSymbols';
import type { RatedCard } from '../types';

const isLand = (c: RatedCard) => c.typeLine.includes('Land');

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
              className="ddp-row"
              onClick={() => onRowClick(g.card)}
              {...hoverProps(g.card, 'full')}
            >
              <span className="ddp-qty">{g.qty}x</span>
              <div className="ddp-strip">
                <img
                  className="ddp-strip-art"
                  src={g.card.imageNormal}
                  alt={g.card.name}
                  loading="lazy"
                  draggable={false}
                />
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
