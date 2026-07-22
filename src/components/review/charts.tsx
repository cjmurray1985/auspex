import { useState } from 'react';
import type { CommitmentPoint, EquityPoint, PickTier } from '../../coach/types';
import { COLOR_NAMES } from '../../coach/context';

export const TIER_COLOR: Record<PickTier, string> = {
  best: '#6ad88a',
  strong: '#8ad0f0',
  acceptable: '#d4af6a',
  weak: '#e0a880',
  mistake: '#e05a5a',
};

export const TIER_LABEL: Record<PickTier, string> = {
  best: 'Best pick',
  strong: 'Strong',
  acceptable: 'Acceptable',
  weak: 'Weak',
  mistake: 'Misplay',
};

const WUBRG_COLOR: Record<string, string> = {
  W: '#efe9cf',
  U: '#4a90d9',
  B: '#8a6db8',
  R: '#d3202a',
  G: '#1f9f52',
};

/** Rating progression line (auto-scaled). Used on the Progress dashboard. */
export function RatingChart({ history }: { history: number[] }) {
  if (history.length < 2) return <div className="chart-hint">Draft again to start your rating curve.</div>;
  const W = 720;
  const H = 180;
  const padX = 10;
  const padY = 16;
  const n = history.length;
  const lo = Math.min(...history);
  const hi = Math.max(...history);
  const span = Math.max(60, hi - lo);
  const base = lo - span * 0.15;
  const top = hi + span * 0.15;
  const x = (i: number) => padX + (i / (n - 1)) * (W - padX * 2);
  const y = (v: number) => padY + (1 - (v - base) / (top - base)) * (H - padY * 2);
  const path = history.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const area = `${path} L${x(n - 1)},${H - padY} L${x(0)},${H - padY} Z`;
  const up = history[n - 1] >= history[0];
  const stroke = up ? '#6ad88a' : '#e0a880';
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="rating-svg" preserveAspectRatio="none">
      <defs>
        <linearGradient id="ratingfill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.28" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#ratingfill)" />
      <path d={path} fill="none" stroke={stroke} strokeWidth="2.4" strokeLinejoin="round" />
      {history.map((v, i) => (
        <circle key={i} cx={x(i)} cy={y(v)} r={i === n - 1 ? 4.5 : 2.4} fill={stroke} stroke="#0a0c14" strokeWidth="1" />
      ))}
    </svg>
  );
}

/** Compact grade sparkline for the trajectory card (PRE-51). Grayscale-safe:
 *  the trend is also stated in text; color only reinforces it. */
export function GradeSparkline({ values, up }: { values: number[]; up: boolean }) {
  if (values.length < 2) return null;
  const W = 160;
  const H = 40;
  const pad = 4;
  const n = values.length;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = Math.max(8, hi - lo);
  const x = (i: number) => pad + (i / (n - 1)) * (W - pad * 2);
  const y = (v: number) => pad + (1 - (v - lo) / span) * (H - pad * 2);
  const path = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const stroke = up ? '#6ad88a' : '#e0a880';
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="spark-svg" preserveAspectRatio="none" aria-hidden>
      <path d={path} fill="none" stroke={stroke} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(n - 1)} cy={y(values[n - 1])} r="3" fill={stroke} stroke="#0a0c14" strokeWidth="1" />
    </svg>
  );
}

function packBoundaries(points: { pickNumber: number }[]): number[] {
  const bounds: number[] = [];
  points.forEach((p, i) => {
    if (i > 0 && p.pickNumber === 1) bounds.push(i);
  });
  return bounds;
}

/**
 * Draft-equity timeline: your projected deck strength after each pick versus the
 * best-case line. The gap is the cost of your decisions; misplays show as dips.
 */
export function EquityChart({ points }: { points: EquityPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);
  if (points.length < 2) return null;
  const W = 720;
  const H = 240;
  const padX = 34;
  const padY = 22;
  const n = points.length;
  const x = (i: number) => padX + (i / (n - 1)) * (W - padX * 2);
  const y = (v: number) => padY + (1 - v / 100) * (H - padY * 2);

  const line = (key: 'yours' | 'ideal') =>
    points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p[key]).toFixed(1)}`).join(' ');
  const areaYours = `${line('yours')} L${x(n - 1)},${H - padY} L${x(0)},${H - padY} Z`;

  const h = hover != null ? points[hover] : null;

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="equity-svg" preserveAspectRatio="none">
        <defs>
          <linearGradient id="eqfill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5a7bd8" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#5a7bd8" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[25, 50, 75].map((g) => (
          <line key={g} x1={padX} x2={W - padX} y1={y(g)} y2={y(g)} className="chart-grid" />
        ))}
        {packBoundaries(points).map((b) => (
          <line key={b} x1={x(b)} x2={x(b)} y1={padY} y2={H - padY} className="chart-pack-sep" />
        ))}
        <path d={areaYours} fill="url(#eqfill)" />
        <path d={line('ideal')} className="equity-ideal" />
        <path d={line('yours')} className="equity-yours" />
        {points.map((p, i) => (
          <circle
            key={i}
            cx={x(i)}
            cy={y(p.yours)}
            r={hover === i ? 5.5 : 3}
            fill={TIER_COLOR[p.tier]}
            stroke="#0a0c14"
            strokeWidth="1"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            style={{ cursor: 'pointer' }}
          />
        ))}
        {h && (
          <line x1={x(hover!)} x2={x(hover!)} y1={padY} y2={H - padY} className="chart-cursor" />
        )}
      </svg>
      <div className="chart-legend">
        <span><i className="lg-swatch" style={{ background: '#5a7bd8' }} /> Your trajectory</span>
        <span><i className="lg-swatch lg-dash" /> Best-case line</span>
        {h && (
          <span className="chart-tip">
            P{h.packNumber}P{h.pickNumber} · {h.pickedName} · {TIER_LABEL[h.tier]} · {Math.round(h.yours)}/100
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Commitment meter: color share of the weighted pool after each pick (stacked),
 * with a marker where the leading pair first became justified.
 */
export function CommitmentChart({ points }: { points: CommitmentPoint[] }) {
  if (points.length < 2) return null;
  const W = 720;
  const H = 210;
  const padX = 34;
  const padY = 14;
  const n = points.length;
  const x = (i: number) => padX + (i / (n - 1)) * (W - padX * 2);
  const order = ['W', 'U', 'B', 'R', 'G'];

  // Build stacked bands.
  const bands = order.map((color) => {
    let lowerAcc = order.slice(0, order.indexOf(color));
    const top = points.map((p, i) => {
      const below = lowerAcc.reduce((a, c) => a + p.colorShare[c], 0);
      const val = below + p.colorShare[color];
      return { x: x(i), y: padY + (1 - val) * (H - padY * 2) };
    });
    const bottom = points.map((p, i) => {
      const below = lowerAcc.reduce((a, c) => a + p.colorShare[c], 0);
      return { x: x(i), y: padY + (1 - below) * (H - padY * 2) };
    });
    const d =
      `M${top.map((pt) => `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(' L')} ` +
      `L${[...bottom].reverse().map((pt) => `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(' L')} Z`;
    return { color, d };
  });

  const firstJustified = points.findIndex((p) => p.justified && p.commitment > 0.35);

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="commit-svg" preserveAspectRatio="none">
        {packBoundaries(points).map((b) => (
          <line key={b} x1={x(b)} x2={x(b)} y1={padY} y2={H - padY} className="chart-pack-sep" />
        ))}
        {bands.map((b) => (
          <path key={b.color} d={b.d} fill={WUBRG_COLOR[b.color]} fillOpacity="0.82" />
        ))}
        {firstJustified > 0 && (
          <line x1={x(firstJustified)} x2={x(firstJustified)} y1={padY} y2={H - padY} className="commit-justified" />
        )}
      </svg>
      <div className="chart-legend">
        {order.map((c) => (
          <span key={c}><i className="lg-swatch" style={{ background: WUBRG_COLOR[c] }} /> {COLOR_NAMES[c]}</span>
        ))}
        {firstJustified > 0 && <span className="chart-tip">Commitment justified at pick {firstJustified + 1}</span>}
      </div>
    </div>
  );
}
