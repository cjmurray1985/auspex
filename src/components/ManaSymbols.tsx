import type { RatedCard } from '../types';

/** Map a Scryfall mana token (e.g. "W/U", "2", "X", "T") to a mana-font class. */
function manaClass(sym: string): string {
  let code = sym.toLowerCase().replace(/\//g, '');
  if (code === 't') code = 'tap';
  else if (code === 'q') code = 'untap';
  return `ms ms-${code} ms-cost ms-shadow`;
}

/**
 * Render a Scryfall mana-cost string like "{2}{W}{U}" using Andrew Gioia's
 * Mana font, so pips look identical to the printed cards (hybrid, Phyrexian,
 * generic, snow and tap symbols all supported).
 */
export function ManaCost({ cost }: { cost: string }) {
  const tokens = cost.match(/\{([^}]+)\}/g) ?? [];
  if (!tokens.length) return null;
  return (
    <span className="mana-cost">
      {tokens.map((tok, i) => (
        <i key={i} className={manaClass(tok.slice(1, -1))} aria-hidden="true" />
      ))}
    </span>
  );
}

const MV_BUCKETS = [0, 1, 2, 3, 4, 5, 6];

/** Tiny mana-curve histogram (nonland spells bucketed by mana value). */
export function MiniCurve({ cards }: { cards: RatedCard[] }) {
  const spells = cards.filter((c) => !c.typeLine.includes('Land'));
  const counts = MV_BUCKETS.map(
    (mv) => spells.filter((c) => (mv === 6 ? c.cmc >= 6 : Math.round(c.cmc) === mv)).length,
  );
  const max = Math.max(...counts, 1);
  return (
    <div className="mini-curve">
      {counts.map((n, i) => (
        <div key={i} className="mini-curve-col">
          <div className="mini-curve-bar" style={{ height: `${(n / max) * 100}%` }} />
          <span className="mini-curve-label">{i === 6 ? '6+' : i}</span>
        </div>
      ))}
    </div>
  );
}
