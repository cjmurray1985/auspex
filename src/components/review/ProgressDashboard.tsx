import { motion } from 'framer-motion';
import type { CoachProfile, MasteryLevel } from '../../coach/types';
import { RatingChart } from './charts';
import { NudgeBanner } from './NudgeBanner';
import { MeterBar, scoreColor } from './ui';

const LEVEL_COLOR: Record<MasteryLevel, string> = {
  unplayed: '#3a4166',
  learning: '#8ad0f0',
  proficient: '#6ad8b0',
  mastered: '#6ad88a',
  struggling: '#e0a880',
};
const LEVEL_LABEL: Record<MasteryLevel, string> = {
  unplayed: 'Unplayed',
  learning: 'Learning',
  proficient: 'Proficient',
  mastered: 'Mastered',
  struggling: 'Struggling',
};

function Delta({ value }: { value: number }) {
  const v = Math.round(value);
  if (v === 0) return <span className="delta flat">±0</span>;
  return (
    <span className={`delta ${v > 0 ? 'up' : 'down'}`}>
      {v > 0 ? '▲' : '▼'} {Math.abs(v)}
    </span>
  );
}

export function ProgressDashboard({ profile }: { profile: CoachProfile }) {
  if (!profile.drafts) {
    return (
      <div className="empty-note">
        Complete a draft and submit your deck to start building your coaching profile.
      </div>
    );
  }
  const toNext = profile.nextRank
    ? Math.max(0, Math.min(100, ((profile.rating - profile.rank.min) / (profile.nextRank.min - profile.rank.min)) * 100))
    : 100;

  return (
    <div className="progress-dash">
      {/* A single, dismissible, fact-grounded nudge (renders nothing if none) */}
      <NudgeBanner profile={profile} />

      {/* Rating header */}
      <div className="rating-header">
        <div
          className="rating-badge"
          style={{ borderColor: profile.calibrating ? 'var(--text-dim)' : profile.rank.color }}
        >
          <div
            className="rating-rank"
            style={{ color: profile.calibrating ? 'var(--text-dim)' : profile.rank.color }}
          >
            {profile.rankLabel}
          </div>
          <div className="rating-number">
            {profile.rating}
            <span className="rating-delta"><Delta value={profile.ratingDelta} /></span>
          </div>
          <div className="rating-next">
            {profile.calibrating ? (
              <span>
                {profile.calibrationRemaining} more draft{profile.calibrationRemaining === 1 ? '' : 's'} to earn your rank
              </span>
            ) : profile.nextRank ? (
              <>
                <div className="rating-track"><i style={{ width: `${toNext}%`, background: profile.rank.color }} /></div>
                <span>{profile.nextRank.min - profile.rating} to {profile.nextRank.name}</span>
              </>
            ) : (
              <span>Apex reached — peak {profile.peakRating}</span>
            )}
          </div>
        </div>
        <div className="rating-stats">
          <div className="rstat"><b>{profile.drafts}</b><span>drafts</span></div>
          <div className="rstat"><b>{profile.personalBest}</b><span>best grade</span></div>
          <div className="rstat"><b>{profile.streak}🔥</b><span>improve streak</span></div>
          <div className="rstat"><b>{profile.peakRating}</b><span>peak rating</span></div>
        </div>
      </div>

      {/* Coach insights */}
      {profile.insights.length > 0 && (
        <div className="coach-says">
          <div className="coach-says-head">Your coach says</div>
          {profile.insights.map((t, i) => (
            <motion.p key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}>
              {t}
            </motion.p>
          ))}
        </div>
      )}

      {/* Rating progression */}
      <section>
        <h3 className="section-head">Rating progression</h3>
        <div className="chart-wrap"><RatingChart history={profile.ratingHistory} /></div>
      </section>

      {/* Dimension trends */}
      {profile.dimensions.length > 0 && (
        <section>
          <h3 className="section-head">Skill trends</h3>
          <div className="trend-grid">
            {profile.dimensions.map((d) => (
              <div key={d.key} className="trend-row">
                <span className="trend-label">{d.label}</span>
                <MeterBar score={d.current} />
                <span className="trend-score" style={{ color: scoreColor(d.current) }}>{Math.round(d.current)}</span>
                <Delta value={d.delta} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recurring habits */}
      {profile.recurring.length > 0 && (
        <section>
          <h3 className="section-head">Recurring habits</h3>
          <div className="habit-list">
            {profile.recurring.map((p) => (
              <div key={p.id} className={`habit-card sev-${p.severity}`}>
                <div className="habit-top">
                  <span className="habit-title">{p.title}</span>
                  <span className="habit-freq">{Math.round(p.frequency * 100)}% of recent drafts</span>
                </div>
                <div className="habit-desc">{p.description}</div>
                <div className="habit-rec">→ {p.recommendation}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Weekly goals */}
      {profile.goals.length > 0 && (
        <section>
          <h3 className="section-head">This week's goals</h3>
          <div className="goal-list">
            {profile.goals.map((g) => (
              <div key={g.id} className={`goal-card${g.met ? ' met' : ''}`}>
                <div className="goal-top">
                  <span className="goal-title">{g.met ? '✓ ' : ''}{g.title}</span>
                  <span className="goal-prog">{g.currentScore} / {g.targetScore}</span>
                </div>
                <div className="goal-track"><i style={{ width: `${Math.min(100, (g.currentScore / g.targetScore) * 100)}%` }} /></div>
                <div className="goal-detail">{g.detail}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Color-pair mastery */}
      <section>
        <h3 className="section-head">Color-pair mastery</h3>
        <div className="mastery-grid">
          {profile.colorPairs.map((p) => (
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

      {/* Achievements */}
      <section>
        <h3 className="section-head">Achievements</h3>
        <div className="ach-grid">
          {profile.achievements.map((a) => (
            <div key={a.id} className={`ach-card${a.earned ? ' earned' : ''}`}>
              <div className="ach-medal">{a.earned ? '★' : '☆'}</div>
              <div className="ach-body">
                <div className="ach-name">{a.name}</div>
                <div className="ach-desc">{a.description}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
