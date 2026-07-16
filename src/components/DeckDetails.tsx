import { AnimatePresence, motion } from 'framer-motion';
import { useDraft } from '../store';
import type { RatedCard } from '../types';

/**
 * Deck Details (PRE-36) — Arena-parity composition view: creatures vs
 * non-creatures, average mana value, mana/color composition, and a full type
 * breakdown including creature (and artifact/enchantment) subtype counts.
 */
const isLand = (c: RatedCard) => c.typeLine.includes('Land');
const COLORS = ['W', 'U', 'B', 'R', 'G'] as const;
const COLOR_NAME: Record<string, string> = { W: 'White', U: 'Blue', B: 'Black', R: 'Red', G: 'Green' };
const MAJOR = ['Creature', 'Instant', 'Sorcery', 'Artifact', 'Enchantment', 'Planeswalker', 'Land'] as const;
const LABEL: Record<string, string> = {
  Creature: 'Creatures',
  Instant: 'Instants',
  Sorcery: 'Sorceries',
  Artifact: 'Artifacts',
  Enchantment: 'Enchantments',
  Planeswalker: 'Planeswalkers',
  Land: 'Lands',
};
const HAS_SUBTYPES = new Set(['Creature', 'Artifact', 'Enchantment']);

function subtypesOf(c: RatedCard): string[] {
  const parts = c.typeLine.split('—');
  if (parts.length < 2) return [];
  return parts[1].trim().split(/\s+/).filter(Boolean);
}

export function DeckDetails({ open, onClose }: { open: boolean; onClose: () => void }) {
  const deck = useDraft((s) => s.deck);
  const basics = useDraft((s) => s.basics) as Record<string, number>;

  if (!open) return null;

  const spells = deck.filter((c) => !isLand(c));
  const nonbasicLands = deck.filter(isLand).length;
  const basicsTotal = COLORS.reduce((n, c) => n + (basics[c] ?? 0), 0);
  const totalLands = nonbasicLands + basicsTotal;
  const total = deck.length + basicsTotal;

  const creatures = spells.filter((c) => c.typeLine.includes('Creature')).length;
  const avgMv = spells.length ? spells.reduce((a, c) => a + c.cmc, 0) / spells.length : 0;

  const curve = [0, 1, 2, 3, 4, 5, 6].map(
    (mv) => spells.filter((c) => (mv === 6 ? c.cmc >= 6 : Math.round(c.cmc) === mv)).length,
  );
  const curveMax = Math.max(1, ...curve);

  const pips: Record<string, number> = { W: 0, U: 0, B: 0, R: 0, G: 0 };
  for (const c of spells)
    for (const tok of c.manaCost.match(/\{([^}]+)\}/g) ?? [])
      for (const ch of tok.slice(1, -1).split('/')) if (ch in pips) pips[ch] += 1;
  const pipTotal = COLORS.reduce((n, c) => n + pips[c], 0);

  const typeCount = (t: string) => (t === 'Land' ? totalLands : spells.filter((c) => c.typeLine.includes(t)).length);
  const subtypeTally = (major: string) => {
    const tally: Record<string, number> = {};
    for (const c of spells)
      if (c.typeLine.includes(major)) for (const s of subtypesOf(c)) tally[s] = (tally[s] ?? 0) + 1;
    return Object.entries(tally).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  };

  return (
    <AnimatePresence>
      <motion.div
        className="dd-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="dd-modal"
          role="dialog"
          aria-label="Deck details"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="dd-head">
            <h3>Deck Details</h3>
            <button className="dd-close" onClick={onClose} aria-label="Close deck details">×</button>
          </div>

          <div className="dd-summary">
            <div className="dd-stat"><b>{creatures}</b><span>Creatures</span></div>
            <div className="dd-stat"><b>{spells.length - creatures}</b><span>Non-creatures</span></div>
            <div className="dd-stat"><b>{totalLands}</b><span>Lands</span></div>
            <div className="dd-stat"><b>{avgMv.toFixed(1)}</b><span>Avg. MV</span></div>
            <div className="dd-stat"><b>{total}</b><span>Total</span></div>
          </div>

          <div className="dd-section">
            <div className="dd-section-title">Mana curve</div>
            <div className="dd-curve">
              {curve.map((n, i) => (
                <div key={i} className="dd-curve-col">
                  <span className="dd-curve-n">{n}</span>
                  <div className="dd-curve-track">
                    <div className="dd-curve-bar" style={{ height: `${(n / curveMax) * 100}%` }} />
                  </div>
                  <span className="dd-curve-k">{i === 6 ? '6+' : i}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="dd-section">
            <div className="dd-section-title">Mana composition</div>
            <div className="dd-colors">
              {COLORS.map((c) => (
                <div key={c} className="dd-color-row">
                  <i className={`ms ms-${c.toLowerCase()} ms-cost`} aria-hidden />
                  <span className="dd-color-name">{COLOR_NAME[c]}</span>
                  <div className="dd-color-bar">
                    <i style={{ width: pipTotal ? `${(pips[c] / pipTotal) * 100}%` : '0' }} />
                  </div>
                  <span className="dd-color-n">
                    {pips[c]}{pipTotal ? ` · ${Math.round((pips[c] / pipTotal) * 100)}%` : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="dd-section">
            <div className="dd-section-title">Composition</div>
            <div className="dd-types">
              {MAJOR.filter((t) => typeCount(t) > 0).map((t) => (
                <div key={t} className="dd-type-group">
                  <div className="dd-type-head"><span>{LABEL[t]}</span><b>{typeCount(t)}</b></div>
                  {HAS_SUBTYPES.has(t) && (
                    <div className="dd-subtypes">
                      {subtypeTally(t).map(([s, n]) => (
                        <div key={s} className="dd-subtype"><span>{s}</span><span>{n}</span></div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
