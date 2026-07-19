import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { MasteryLevel } from '../coach/types';
import type { SetMastery } from '../coach/mastery';
import { prefersReducedMotion } from '../fx/reducedMotion';

export const LEVEL_COLOR: Record<MasteryLevel, string> = {
  unplayed: '#3a4166',
  learning: '#8ad0f0',
  proficient: '#6ad8b0',
  mastered: '#6ad88a',
  struggling: '#e0a880',
};
export const LEVEL_LABEL: Record<MasteryLevel, string> = {
  unplayed: 'Unplayed',
  learning: 'Learning',
  proficient: 'Proficient',
  mastered: 'Mastered',
  struggling: 'Struggling',
};

/**
 * Set-mastery ring — a delicate celestial dial (concept-inspired): a dark disc,
 * a thin outer progress arc that reads teal when empty and gold as it fills, a
 * faint inner rune-dot ring, and four subtle cardinal marks. Kept low-contrast
 * so it decorates the card rather than shouting over the art.
 */
const RING_TEAL = '#8fd8cf';

export function SetMasteryRing({
  pct,
  size = 50,
  delay = 0.6,
}: {
  pct: number;
  size?: number;
  /** Seconds to wait before the ring reveals — used to stagger tiles on load. */
  delay?: number;
}) {
  const filled = Math.max(0, Math.min(1, pct));
  const reduced = prefersReducedMotion();

  // Count the % up from 0 in step with the arc sweep (skipped for reduced motion).
  const [shown, setShown] = useState(reduced ? filled : 0);
  const rafRef = useRef<number>(0);
  useEffect(() => {
    if (reduced) {
      setShown(filled);
      return;
    }
    const startAt = performance.now() + delay * 1000;
    const dur = 1000;
    const tick = (now: number) => {
      const t = Math.max(0, Math.min(1, (now - startAt) / dur));
      setShown(filled * (1 - Math.pow(1 - t, 3)));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [filled, delay, reduced]);

  const stroke = size >= 64 ? 3 : 2.25;
  const pad = stroke + 3; // headroom for the cardinal marks
  const cx = size / 2;
  const cy = size / 2;
  const rOuter = (size - pad * 2) / 2;
  const rInner = rOuter - 4.5;
  const cOuter = 2 * Math.PI * rOuter;
  const arcColor = filled >= 0.5 ? 'var(--gold-bright)' : RING_TEAL;
  const cardinals = [
    [cx, pad - 1],
    [size - pad + 1, cy],
    [cx, size - pad + 1],
    [pad - 1, cy],
  ];
  return (
    <motion.span
      className="mastery-ring"
      title={`Set mastery ${Math.round(filled * 100)}%`}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.45, ease: 'easeOut' }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={rInner + 1.5} fill="rgba(6,8,16,0.55)" />
        {/* faint full track */}
        <circle cx={cx} cy={cy} r={rOuter} fill="none" stroke="rgba(180,214,222,0.16)" strokeWidth={stroke} />
        {/* progress arc: teal when low, gold as it fills — sweeps in on load */}
        <motion.circle
          cx={cx}
          cy={cy}
          r={rOuter}
          fill="none"
          stroke={arcColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={cOuter}
          initial={{ strokeDashoffset: cOuter }}
          animate={{ strokeDashoffset: cOuter * (1 - filled) }}
          transition={{ delay, duration: 1, ease: 'easeOut' }}
          transform={`rotate(-90 ${cx} ${cy})`}
          opacity={0.85}
        />
        {/* inner rune-dot ring */}
        <circle
          cx={cx}
          cy={cy}
          r={rInner}
          fill="none"
          stroke={RING_TEAL}
          strokeWidth={1}
          strokeDasharray="0.5 3"
          strokeLinecap="round"
          opacity={0.3}
        />
        {/* cardinal marks */}
        {cardinals.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={0.9} fill={RING_TEAL} opacity={0.5} />
        ))}
      </svg>
      <span className="mastery-ring-pct" style={{ color: arcColor }}>
        {Math.round(shown * 100)}%
      </span>
    </motion.span>
  );
}

/** Achievements + color-pair mastery sections for one set. Shared by the tile
 *  quick-peek modal and the full set landing page. */
export function SetMasteryPanel({ mastery }: { mastery: SetMastery }) {
  const played = mastery.colorPairs.filter((p) => p.games > 0);
  return (
    <>
      <section className="mastery-modal-section">
        <h3>Achievements</h3>
        <div className="ach-grid">
          {mastery.achievements.map((a) => (
            <div
              key={a.id}
              className={`ach-card${a.earned ? ' earned' : ' locked'}${a.unique ? ' unique' : ''}`}
            >
              {a.art && <div className="ach-art" style={{ backgroundImage: `url(${a.art})` }} />}
              <div className="ach-scrim" />
              <div className="ach-name">{a.name}</div>
              <span
                className={`ach-badge${a.earned ? ' earned' : ' locked'}`}
                aria-label={a.earned ? 'Earned' : 'Locked'}
              >
                {a.earned ? (
                  '✓'
                ) : (
                  <svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor" aria-hidden>
                    <path d="M12 1a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2h-1V6a5 5 0 0 0-5-5zm-3 8V6a3 3 0 1 1 6 0v3H9z" />
                  </svg>
                )}
              </span>
              <div className="ach-desc-hover">{a.description}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mastery-modal-section">
        <h3>Color-pair mastery</h3>
        {played.length === 0 && (
          <p className="mastery-empty">Draft this set to start growing color-pair mastery.</p>
        )}
        <div className="mastery-grid">
          {mastery.colorPairs.map((p) => (
            <div key={p.pair} className="mastery-cell" style={{ borderColor: LEVEL_COLOR[p.level] }}>
              <div className="mastery-name">{p.label}</div>
              <div className="mastery-level" style={{ color: LEVEL_COLOR[p.level] }}>{LEVEL_LABEL[p.level]}</div>
              <div className="mastery-stat">
                {p.games ? `${p.games} draft${p.games === 1 ? '' : 's'} · ${Math.round(p.avg)} avg` : '—'}
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

/** Full set-mastery detail: color-pair mastery + achievements for one set. */
export function SetMasteryModal({
  setName,
  mastery,
  onClose,
}: {
  setName: string;
  mastery: SetMastery;
  onClose: () => void;
}) {
  return (
    <div className="mastery-modal-backdrop" onClick={onClose}>
      <motion.div
        className="mastery-modal"
        role="dialog"
        aria-label={`${setName} mastery`}
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mastery-modal-head">
          <div>
            <div className="mastery-modal-eyebrow">Set Mastery</div>
            <h2 className="mastery-modal-title">{setName}</h2>
          </div>
          <div className="mastery-modal-pct">
            <SetMasteryRing pct={mastery.pct} size={64} delay={0.15} />
            <span>
              {mastery.achievementsEarned}/{mastery.achievementsTotal} achievements ·{' '}
              {mastery.pairsMastered}/10 pairs
            </span>
          </div>
          <button className="mastery-modal-close" onClick={onClose} aria-label="Close">×</button>
        </header>

        <SetMasteryPanel mastery={mastery} />
      </motion.div>
    </div>
  );
}
