import { useMemo, useState } from 'react';
import { AnimatePresence, motion, MotionConfig } from 'framer-motion';
import { useDraft } from '../store';
import { BASIC_LAND_NAMES } from '../data/scryfall';
import { hoverProps, useHover } from './CardPreview';
import { MiniCurve, ManaPip } from './ManaSymbols';
import { useDrag, type DropTarget } from './useDrag';
import { DeckDetails } from './DeckDetails';
import type { RatedCard } from '../types';

const COLOR_FILTERS = ['W', 'U', 'B', 'R', 'G', 'C'] as const;
const BASIC_COLORS = ['W', 'U', 'B', 'R', 'G'] as const;

// Accessible names so color controls never rely on color alone: mana glyphs
// carry the shape, these carry the screen-reader/label text.
const COLOR_NAMES: Record<string, string> = {
  W: 'White',
  U: 'Blue',
  B: 'Black',
  R: 'Red',
  G: 'Green',
  C: 'Colorless',
};
const CARD_TYPES = [
  'Creature',
  'Instant',
  'Sorcery',
  'Artifact',
  'Enchantment',
  'Planeswalker',
  'Land',
];
const SORTS = {
  cmc: { label: 'Mana value', fn: (a: RatedCard, b: RatedCard) => a.cmc - b.cmc },
  color: {
    label: 'Color',
    fn: (a: RatedCard, b: RatedCard) =>
      (a.colors[0] ?? 'Z').localeCompare(b.colors[0] ?? 'Z') || a.cmc - b.cmc,
  },
  rarity: {
    label: 'Rarity',
    fn: (a: RatedCard, b: RatedCard) => {
      const r = { mythic: 0, rare: 1, uncommon: 2, common: 3 };
      return r[a.rarity] - r[b.rarity] || a.cmc - b.cmc;
    },
  },
} as const;
type SortKey = keyof typeof SORTS;

const isLand = (c: RatedCard) => c.typeLine.includes('Land');

function passesFilter(
  card: RatedCard,
  search: string,
  colors: Set<string>,
  type: string,
): boolean {
  if (search && !card.name.toLowerCase().includes(search.toLowerCase())) return false;
  if (colors.size) {
    const colorless = card.colors.length === 0;
    const match = card.colors.some((c) => colors.has(c)) || (colors.has('C') && colorless);
    if (!match) return false;
  }
  if (type && !card.typeLine.includes(type)) return false;
  return true;
}

interface Group {
  card: RatedCard;
  copies: RatedCard[];
}

/** Collapse identical cards (same oracle id) into one stacked entry. */
function groupCards(cards: RatedCard[]): Group[] {
  const map = new Map<string, Group>();
  for (const c of cards) {
    const g = map.get(c.id);
    if (g) g.copies.push(c);
    else map.set(c.id, { card: c, copies: [c] });
  }
  return [...map.values()];
}

/**
 * A single stacked card in a deck column. Duplicates collapse into one entry
 * with an "×N" badge, MTG-Arena style; clicking removes one copy.
 */
function StackCard({
  group,
  onRemove,
  startDrag,
  dragId = null,
  revealPrevArt = false,
}: {
  group: Group;
  onRemove: (c: RatedCard) => void;
  startDrag?: (c: RatedCard) => (e: React.DragEvent) => void;
  /** instanceId/id of the card currently being dragged, so the source card can
      dim while it's "lifted out" of the stack. */
  dragId?: string | null;
  /** When the card above this one has multiple copies, ease the overlap so
      that card's art (and its ×N badge) shows instead of just its header. */
  revealPrevArt?: boolean;
}) {
  const top = group.copies[group.copies.length - 1];
  const isDragging = dragId != null && (top.instanceId ?? top.id) === dragId;
  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: isDragging ? 0.4 : 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className={`sc${revealPrevArt ? ' peek-art' : ''}`}
      onClick={() => onRemove(top)}
      draggable={!!startDrag}
      // Native HTML5 drag-start (capture phase so it doesn't collide with
      // framer-motion's own onDragStart gesture typing on motion elements).
      onDragStartCapture={startDrag?.(top)}
      {...hoverProps(group.card, 'full', { glow: false })}
    >
      <img src={group.card.imageNormal} alt={group.card.name} loading="lazy" draggable={false} />
      {group.copies.length > 1 && <span className="db-mult">&times;{group.copies.length}</span>}
    </motion.div>
  );
}

/**
 * A land in the deck's Lands column. Hovering reveals the full card with − / +
 * controls to adjust how many copies are in the deck (Arena-style).
 */
function LandCard({
  img,
  name,
  qty,
  reveal,
  onAdd,
  onSub,
  canAdd,
}: {
  img?: string;
  name: string;
  qty: number;
  reveal: boolean;
  onAdd: () => void;
  onSub: () => void;
  canAdd: boolean;
}) {
  return (
    <div className={`sc land-sc${reveal ? ' peek-art' : ''}`}>
      {img ? (
        <img src={img} alt={name} loading="lazy" draggable={false} />
      ) : (
        <div className="sc-fallback">{name}</div>
      )}
      {qty > 1 && <span className="db-mult">&times;{qty}</span>}
      <div className="land-ctl">
        <button className="land-ctl-btn" onClick={onSub} aria-label={`Remove one ${name}`}>
          &minus;
        </button>
        <span className="land-ctl-qty">&times;{qty}</span>
        <button
          className="land-ctl-btn"
          onClick={onAdd}
          disabled={!canAdd}
          aria-label={`Add one ${name}`}
        >
          +
        </button>
      </div>
    </div>
  );
}

// Column-key threshold: any pinned column key at or above this renders to the
// RIGHT of the Lands column (well clear of the 0–6 mana-curve keys).
const RIGHT_OF_LANDS = 100;

// Width (px) of the custom drag ghost; also the anchor math in setDragImage.
const DRAG_GHOST_W = 150;

/**
 * Build a detached, card-sized element to hand to `setDragImage`, so the cursor
 * carries a real card while dragging instead of the browser's default (often
 * clipped) element snapshot. Parked offscreen via CSS; caller removes it on
 * dragend.
 */
function makeDragImage(card: RatedCard): HTMLElement {
  const ghost = document.createElement('div');
  ghost.className = 'db-drag-ghost';
  const img = document.createElement('img');
  img.src = card.imageNormal;
  img.draggable = false;
  ghost.appendChild(img);
  document.body.appendChild(ghost);
  return ghost;
}

export function DeckBuilder() {
  const humanPool = useDraft((s) => s.humanPool);
  const deck = useDraft((s) => s.deck);
  const basics = useDraft((s) => s.basics);
  const basicLandArt = useDraft((s) => s.basicLandArt);
  const setBasics = useDraft((s) => s.setBasics);
  const moveToDeck = useDraft((s) => s.moveToDeck);
  const moveToPool = useDraft((s) => s.moveToPool);
  const autoLands = useDraft((s) => s.autoLands);
  const submitDeck = useDraft((s) => s.submitDeck);

  const [search, setSearch] = useState('');
  const [colors, setColors] = useState<Set<string>>(new Set());
  const [type, setType] = useState('');
  const [sort, setSort] = useState<SortKey>('cmc');
  const [poolCollapsed, setPoolCollapsed] = useState(false);
  // Per-copy column override: cards default to their mana value but can be
  // dragged into any column and pinned there. Keyed by instanceId → column key.
  const [colOverride, setColOverride] = useState<Record<string, number>>({});
  const [landMenuOpen, setLandMenuOpen] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const deckIds = useMemo(() => new Set(deck.map((c) => c.instanceId ?? c.id)), [deck]);

  // Shared drag state (see useDrag). `dragging` lights up the whole deck as a
  // drop zone; `over` marks the single column/zone under the pointer.
  const dragCard = useDrag((s) => s.card);
  const over = useDrag((s) => s.over);
  const dragging = dragCard !== null;
  const dragId = dragCard ? (dragCard.instanceId ?? dragCard.id) : null;
  const draggingFromDeck = dragId != null && deckIds.has(dragId);

  // Top pane is the sideboard: everything not currently in the deck.
  const sortedPool = useMemo(
    () =>
      humanPool
        .filter((c) => !deckIds.has(c.instanceId ?? c.id))
        .sort((a, b) => SORTS[sort].fn(a, b) || a.name.localeCompare(b.name)),
    [humanPool, deckIds, sort],
  );
  const filteredPool = sortedPool.filter((c) => passesFilter(c, search, colors, type));
  // Collapse duplicate copies in the sideboard into one card (count shown with
  // diamond pips). Only the top pane groups like this — the deck stacks below
  // keep their own layout.
  const poolGroups: RatedCard[][] = (() => {
    const map = new Map<string, RatedCard[]>();
    const out: RatedCard[][] = [];
    for (const c of filteredPool) {
      const g = map.get(c.id);
      if (g) g.push(c);
      else {
        const arr = [c];
        map.set(c.id, arr);
        out.push(arr);
      }
    }
    return out;
  })();

  const findCard = (key: string) => humanPool.find((c) => (c.instanceId ?? c.id) === key);

  // Update the hovered drop target, but only when it actually changes — dragover
  // fires continuously, and this keeps it from re-rendering on every tick.
  const setOver = (target: DropTarget) => {
    if (useDrag.getState().over !== target) useDrag.getState().setOver(target);
  };

  const onDropToDeck = (e: React.DragEvent) => {
    e.preventDefault();
    const card = findCard(e.dataTransfer.getData('text/plain'));
    if (card && !deckIds.has(card.instanceId ?? card.id)) moveToDeck(card);
  };
  const onDropToPool = (e: React.DragEvent) => {
    e.preventDefault();
    const card = findCard(e.dataTransfer.getData('text/plain'));
    if (card && deckIds.has(card.instanceId ?? card.id)) moveToPool(card);
  };
  const startDrag = (card: RatedCard) => (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', card.instanceId ?? card.id);
    e.dataTransfer.effectAllowed = 'move';
    // A card-sized ghost that rides under the cursor (Arena-style).
    const ghost = makeDragImage(card);
    e.dataTransfer.setDragImage(ghost, DRAG_GHOST_W / 2, 34);
    // Dismiss the hover preview/glow while dragging and keep it suppressed
    // until the drag ends (native drag doesn't fire mouseleave reliably), and
    // publish the drag so every drop target can light up in sync.
    const hover = useHover.getState();
    hover.hide();
    hover.freeze();
    useDrag.getState().begin(card);
    window.addEventListener(
      'dragend',
      () => {
        hover.unfreeze();
        useDrag.getState().end();
        ghost.remove();
      },
      { once: true },
    );
  };

  const allowDrop = (e: React.DragEvent) => e.preventDefault();

  // Drop a spell into a specific column: add it to the deck if needed and pin
  // it to that column (overriding its default mana-value placement).
  const dropToColumn = (key: number) => (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const card = findCard(e.dataTransfer.getData('text/plain'));
    if (!card) return;
    const iid = card.instanceId ?? card.id;
    if (!deckIds.has(iid)) moveToDeck(card);
    if (!isLand(card)) setColOverride((prev) => ({ ...prev, [iid]: key }));
  };

  // Removing a spell from the deck also drops any column pin it had.
  const removeSpell = (card: RatedCard) => {
    moveToPool(card);
    setColOverride((prev) => {
      const next = { ...prev };
      delete next[card.instanceId ?? card.id];
      return next;
    });
  };

  const spells = deck.filter((c) => !isLand(c));
  const nonbasicLands = deck.filter(isLand);
  const totalBasics = Object.values(basics).reduce((a, b) => a + b, 0);
  const deckSize = deck.length + totalBasics;
  const canSubmit = deckSize >= 40;
  const creatures = spells.filter((c) => c.typeLine.includes('Creature')).length;
  const totalLands = nonbasicLands.length + totalBasics;

  // A spell's column: its pinned override, else its mana value (capped at 6+).
  // Override keys >= RIGHT_OF_LANDS render to the RIGHT of the Lands column.
  const colKey = (c: RatedCard) =>
    colOverride[c.instanceId ?? c.id] ?? Math.min(Math.round(c.cmc), 6);

  // Bucket spells into columns; only columns with cards are shown.
  const byCol = new Map<number, RatedCard[]>();
  for (const c of spells) {
    const k = colKey(c);
    const arr = byCol.get(k);
    if (arr) arr.push(c);
    else byCol.set(k, [c]);
  }
  const makeCol = (key: number) => ({
    key,
    groups: groupCards([...(byCol.get(key) ?? [])].sort((a, b) => b.rating.score - a.rating.score)),
  });
  const sortedKeys = [...byCol.keys()].sort((a, b) => a - b);
  // Mana-curve columns (keys < RIGHT_OF_LANDS) sit left of Lands; any columns a
  // card has been dragged past Lands into (keys >= RIGHT_OF_LANDS) sit right.
  const leftCols = sortedKeys.filter((k) => k < RIGHT_OF_LANDS).map(makeCol);
  const rightKeys = sortedKeys.filter((k) => k >= RIGHT_OF_LANDS);
  const rightCols = rightKeys.map(makeCol);
  // Empty, droppable columns to the RIGHT of Lands. Dropping into one pins the
  // card to a brand-new column past Lands. Keep the grid at a minimum of 8
  // columns (so card sizing stays consistent) and always offer at least one.
  const rightNextKey =
    (rightKeys.length ? rightKeys[rightKeys.length - 1] : RIGHT_OF_LANDS - 1) + 1;
  // Always keep at least two empty droppable columns to the right of Lands (and
  // enough to hold the grid at a minimum of 8 columns overall).
  const emptyRightCount = Math.max(2, 8 - (leftCols.length + 1 + rightCols.length));

  const nonbasicGroups = groupCards(
    [...nonbasicLands].sort((a, b) => a.name.localeCompare(b.name)),
  );
  // Unified land stack (nonbasics then basics) so the header/art peek logic
  // carries across both kinds.
  const landItems: Array<
    | { kind: 'nonbasic'; group: Group; qty: number }
    | { kind: 'basic'; color: string; qty: number }
  > = [
    ...nonbasicGroups.map((g) => ({ kind: 'nonbasic' as const, group: g, qty: g.copies.length })),
    ...BASIC_COLORS.filter((c) => basics[c] > 0).map((c) => ({
      kind: 'basic' as const,
      color: c,
      qty: basics[c],
    })),
  ];
  const deckEmpty = deck.length === 0 && totalBasics === 0;

  const toggleColor = (c: string) => {
    setColors((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });
  };

  return (
    <MotionConfig reducedMotion="user">
    <div className="db">
      <div className="db-toolbar">
        <span className="db-wordmark">DECK</span>
        <div className="db-toolbar-curve" title="Mana curve (nonland spells)">
          <MiniCurve cards={deck} />
        </div>
        <span className="db-stat">
          <i className="ms ms-creature" aria-hidden /> {creatures}
        </span>
        <span className="db-stat">
          <i className="ms ms-land" aria-hidden /> {totalLands}
        </span>
        <div style={{ flex: 1 }} />
        <span className={`db-count${canSubmit ? ' ok' : ''}`}>
          {deckSize}
          <span className="db-count-max">/40</span>
        </span>
        <button className="btn-ghost db-details-btn" onClick={() => setShowDetails(true)}>
          Deck Details
        </button>
        <button className="btn-primary" disabled={!canSubmit} onClick={submitDeck}>
          Done
        </button>
      </div>
      <DeckDetails open={showDetails} onClose={() => setShowDetails(false)} />

      <div
        className={`db-pool${draggingFromDeck ? ' drag-return' : ''}${
          over === 'pool' ? ' drag-over' : ''
        }${poolCollapsed ? ' collapsed' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setOver('pool');
        }}
        onDragLeave={(e) => {
          // Ignore leaves into child elements; only clear when truly exiting.
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(null);
        }}
        onDrop={onDropToPool}
      >
        <div className="db-filters">
          <div className="db-pips">
            {COLOR_FILTERS.map((c) => (
              <button
                key={c}
                className={`db-pip${colors.has(c) ? ' active' : ''}`}
                onClick={() => toggleColor(c)}
                aria-label={`Filter by ${COLOR_NAMES[c]}`}
                aria-pressed={colors.has(c)}
                title={COLOR_NAMES[c]}
              >
                <ManaPip sym={c} />
              </button>
            ))}
          </div>

          <div className="db-land-menu">
            <button
              className={`db-pip db-land-toggle${landMenuOpen ? ' active' : ''}`}
              onClick={() => setLandMenuOpen((v) => !v)}
              aria-label="Add basic lands"
              aria-expanded={landMenuOpen}
            >
              <i className="ms ms-land" aria-hidden />
            </button>
            {landMenuOpen && (
              <>
                <div className="db-land-backdrop" onClick={() => setLandMenuOpen(false)} />
                <div className="db-land-options">
                  <div className="db-land-options-head">Add lands</div>
                  <div className="db-land-adders">
                    {BASIC_COLORS.map((c) => (
                      <button
                        key={c}
                        className="db-land-add"
                        onClick={() => setBasics(c, basics[c] + 1)}
                        aria-label={`Add one ${COLOR_NAMES[c]} land`}
                        title={`Add ${COLOR_NAMES[c]}`}
                      >
                        <ManaPip sym={c} />
                      </button>
                    ))}
                  </div>
                  <button
                    className="btn-ghost db-land-auto"
                    onClick={() => {
                      autoLands();
                      setLandMenuOpen(false);
                    }}
                  >
                    Auto Lands
                  </button>
                </div>
              </>
            )}
          </div>
          <select
            className="db-input"
            name="type-filter"
            aria-label="Filter by card type"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="">Type</option>
            {CARD_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <select
            className="db-input"
            name="sort"
            aria-label="Sort pool"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
          >
            {Object.entries(SORTS).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
          <input
            className="db-input"
            name="card-search"
            aria-label="Search cards by name"
            placeholder="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {(colors.size > 0 || type || search) && (
            <button
              className="btn-ghost"
              style={{ padding: '0.4rem 0.9rem' }}
              onClick={() => {
                setColors(new Set());
                setType('');
                setSearch('');
              }}
            >
              Clear
            </button>
          )}
        </div>

        <div className="db-pool-grid">
          {poolGroups.map((group) => {
            const card = group[0];
            return (
              <div
                key={card.instanceId ?? card.id}
                className={`db-pool-card${
                  dragId === (card.instanceId ?? card.id) ? ' dragging' : ''
                }`}
                onClick={() => moveToDeck(card)}
                draggable
                onDragStart={startDrag(card)}
                {...hoverProps(card, 'full', { glow: false })}
              >
                <div className="db-pool-pips" aria-label={`${group.length} in pool`}>
                  {Array.from({ length: Math.min(group.length, 4) }).map((_, i) => (
                    <span key={i} className="db-pool-pip" />
                  ))}
                </div>
                <img src={card.imageNormal} alt={card.name} loading="lazy" draggable={false} />
              </div>
            );
          })}
        </div>
      </div>

      <div
        className={`db-deck${dragging ? ' dragging' : ''}`}
        onDragOver={allowDrop}
        onDrop={onDropToDeck}
      >
        <button
          className="db-deck-handle"
          onClick={() => setPoolCollapsed((v) => !v)}
          aria-label={poolCollapsed ? 'Show pool' : 'Collapse pool for more deck space'}
        >
          <svg
            className={`db-chev${poolCollapsed ? ' down' : ''}`}
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
          >
            <path d="M6 15l6-6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div
          className="db-curve"
          onClick={(e) => {
            // Clicking the curve background (not a card) opens Deck Details (PRE-37).
            if (e.target === e.currentTarget) setShowDetails(true);
          }}
          title="Open Deck Details"
        >
          {deckEmpty && <div className="db-empty">Add cards from your pool above.</div>}

          {/* Mana-curve columns — to the LEFT of Lands, keyed by mana value. */}
          <AnimatePresence initial={false}>
            {leftCols.map((col) => (
              <motion.div
                layout
                key={col.key}
                className={`db-col${over === `col:${col.key}` ? ' drag-target' : ''}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setOver(`col:${col.key}`);
                }}
                onDrop={dropToColumn(col.key)}
              >
                <div className="db-stack">
                  <AnimatePresence initial={false}>
                    {col.groups.map((g, idx) => (
                      <StackCard
                        key={g.card.id}
                        group={g}
                        onRemove={removeSpell}
                        startDrag={startDrag}
                        dragId={dragId}
                        revealPrevArt={idx > 0 && col.groups[idx - 1].copies.length > 1}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Lands: immediately to the right of the mana curve. */}
          <div
            className={`db-col db-col-lands${over === 'lands' ? ' drag-target' : ''}`}
            onDragOver={(e) => {
              e.preventDefault();
              setOver('lands');
            }}
            onDrop={onDropToDeck}
          >
            <div className="db-stack">
              {landItems.map((item, idx) => {
                const reveal = idx > 0 && landItems[idx - 1].qty > 1;
                if (item.kind === 'nonbasic') {
                  const id = item.group.card.id;
                  const sideCopy = humanPool.find(
                    (c) => c.id === id && !deckIds.has(c.instanceId ?? c.id),
                  );
                  const copies = item.group.copies;
                  return (
                    <LandCard
                      key={id}
                      img={item.group.card.imageNormal}
                      name={item.group.card.name}
                      qty={item.qty}
                      reveal={reveal}
                      onSub={() => moveToPool(copies[copies.length - 1])}
                      onAdd={() => sideCopy && moveToDeck(sideCopy)}
                      canAdd={!!sideCopy}
                    />
                  );
                }
                const c = item.color;
                return (
                  <LandCard
                    key={c}
                    img={basicLandArt[c]}
                    name={BASIC_LAND_NAMES[c]}
                    qty={item.qty}
                    reveal={reveal}
                    onSub={() => setBasics(c, basics[c] - 1)}
                    onAdd={() => setBasics(c, basics[c] + 1)}
                    canAdd
                  />
                );
              })}
            </div>
          </div>

          {/* Columns a card has been dragged PAST Lands into — sit to its right. */}
          <AnimatePresence initial={false}>
            {rightCols.map((col) => (
              <motion.div
                layout
                key={col.key}
                className={`db-col${over === `col:${col.key}` ? ' drag-target' : ''}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setOver(`col:${col.key}`);
                }}
                onDrop={dropToColumn(col.key)}
              >
                <div className="db-stack">
                  <AnimatePresence initial={false}>
                    {col.groups.map((g, idx) => (
                      <StackCard
                        key={g.card.id}
                        group={g}
                        onRemove={removeSpell}
                        startDrag={startDrag}
                        dragId={dragId}
                        revealPrevArt={idx > 0 && col.groups[idx - 1].copies.length > 1}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Empty columns to the RIGHT of Lands. They keep the grid at a minimum
              of 8 columns AND double as drop targets: dropping a card here pins it
              to a brand-new column past Lands. */}
          {Array.from({ length: emptyRightCount }).map((_, i) => (
            <div
              className={`db-col db-col-filler${
                over === `col:${rightNextKey + i}` ? ' drag-target' : ''
              }`}
              key={`fill-${i}`}
              onDragOver={(e) => {
                e.preventDefault();
                setOver(`col:${rightNextKey + i}`);
              }}
              onDrop={dropToColumn(rightNextKey + i)}
            >
              <div className="db-stack" />
            </div>
          ))}
        </div>
      </div>
    </div>
    </MotionConfig>
  );
}
