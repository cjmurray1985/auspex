import { motion } from 'framer-motion';
import type { MasteryLevel } from '../coach/types';
import type { SetMastery } from '../coach/mastery';

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

/** Compact circular set-mastery progress ring (used on set tiles). */
export function SetMasteryRing({ pct, size = 48 }: { pct: number; size?: number }) {
  const stroke = 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const filled = Math.max(0, Math.min(1, pct));
  return (
    <span className="mastery-ring" title={`Set mastery ${Math.round(filled * 100)}%`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* opaque disc so the ring reads on any art */}
        <circle cx={size / 2} cy={size / 2} r={size / 2} fill="rgba(6,8,16,0.72)" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--gold-bright)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - filled)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span className="mastery-ring-pct">{Math.round(filled * 100)}%</span>
    </span>
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
  const played = mastery.colorPairs.filter((p) => p.games > 0);
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
            <SetMasteryRing pct={mastery.pct} size={64} />
            <span>
              {mastery.achievementsEarned}/{mastery.achievementsTotal} achievements ·{' '}
              {mastery.pairsMastered}/10 pairs
            </span>
          </div>
          <button className="mastery-modal-close" onClick={onClose} aria-label="Close">×</button>
        </header>

        <section className="mastery-modal-section">
          <h3>Achievements</h3>
          <div className="ach-grid">
            {mastery.achievements.map((a) => (
              <div
                key={a.id}
                className={`ach-card${a.earned ? ' earned' : ''}${a.unique ? ' unique' : ''}`}
              >
                <div className="ach-medal">{a.earned ? (a.unique ? '✦' : '★') : '☆'}</div>
                <div className="ach-body">
                  <div className="ach-name">
                    {a.name}
                    {a.unique && <span className="ach-tag">signature</span>}
                  </div>
                  <div className="ach-desc">{a.description}</div>
                </div>
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
      </motion.div>
    </div>
  );
}
