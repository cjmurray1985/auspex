import type { RatedCard } from '../types';

/**
 * Auspex's own colour language: a colour letter inside a coloured disc.
 * Deliberately NOT WOTC's mana glyphs — colour is used functionally, and the
 * letter doubles as a grayscale-safe signal (colourblind friendly).
 */
const PIP_HEX: Record<string, { bg: string; fg: string }> = {
  W: { bg: '#f4edd2', fg: '#3a3320' },
  U: { bg: '#2a76c9', fg: '#ffffff' },
  B: { bg: '#4a474f', fg: '#efeaf0' },
  R: { bg: '#d43b30', fg: '#ffffff' },
  G: { bg: '#2f8f57', fg: '#ffffff' },
  C: { bg: '#b6afa4', fg: '#2a2520' },
};
const GENERIC = { bg: '#c8c2b8', fg: '#2a2520' };

/** Resolve a single (non-hybrid) symbol to its disc colours + label. */
function pipVisual(sym: string): { text: string; bg: string; fg: string } {
  if (sym in PIP_HEX) return { text: sym, ...PIP_HEX[sym] };
  // Generic mana, X/Y/Z, tap, snow, etc. → neutral disc with the raw label.
  return { text: sym, bg: GENERIC.bg, fg: GENERIC.fg };
}

/** A single colour/mana pip. Pass a WUBRG letter, a number, or a symbol like "X". */
export function ManaPip({ sym, dim = false }: { sym: string; dim?: boolean }) {
  const v = pipVisual(sym.toUpperCase());
  return (
    <span
      className={`pip${dim ? ' pip-off' : ''}`}
      style={{ background: v.bg, color: v.fg }}
      aria-hidden="true"
    >
      <span>{v.text}</span>
    </span>
  );
}

/** Two-colour hybrid / Phyrexian pip: split disc showing the colour letters. */
function HybridPip({ parts }: { parts: string[] }) {
  const colors = parts.filter((p) => p in PIP_HEX);
  const bg =
    colors.length === 2
      ? `linear-gradient(135deg, ${PIP_HEX[colors[0]].bg} 0 50%, ${PIP_HEX[colors[1]].bg} 50% 100%)`
      : colors[0]
        ? PIP_HEX[colors[0]].bg
        : GENERIC.bg;
  return (
    <span className="pip pip-hybrid" style={{ background: bg, color: '#1b1917' }} aria-hidden="true">
      <span>{parts.join('')}</span>
    </span>
  );
}

/**
 * Render a Scryfall mana-cost string like "{2}{W}{U}" as Auspex colour discs.
 * Handles single colours, generic/variable mana, and hybrid/Phyrexian symbols.
 */
export function ManaCost({ cost }: { cost: string }) {
  const tokens = cost.match(/\{([^}]+)\}/g) ?? [];
  if (!tokens.length) return null;
  return (
    <span className="mana-cost">
      {tokens.map((tok, i) => {
        const raw = tok.slice(1, -1).toUpperCase();
        if (raw.includes('/')) return <HybridPip key={i} parts={raw.split('/')} />;
        return <ManaPip key={i} sym={raw} />;
      })}
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
