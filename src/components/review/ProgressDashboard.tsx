import { motion } from 'framer-motion';
import type { CoachProfile, ImprovementTrend } from '../../coach/types';
import { GradeSparkline, RatingChart } from './charts';
import { NudgeBanner } from './NudgeBanner';
import { MeterBar, scoreColor } from './ui';

const TRAJECTORY_META: Record<
  ImprovementTrend['direction'],
  { label: string; glyph: string; cls: string }
> = {
  improving: { label: 'Improving', glyph: '▲', cls: 'up' },
  steady: { label: 'Holding steady', glyph: '▬', cls: 'flat' },
  slipping: { label: 'Slipping', glyph: '▼', cls: 'down' },
  calibrating: { label: 'Calibrating', glyph: '◇', cls: 'flat' },
};

function TrajectoryCard({ trend }: { trend: ImprovementTrend }) {
  const meta = TRAJECTORY_META[trend.direction];
  const calibrating = trend.direction === 'calibrating';
  return (
    <div className={`trajectory-card traj-${meta.cls}`}>
      <div className="traj-head">
        <span className="traj-verdict">
          <span className="traj-glyph" aria-hidden>{meta.glyph}</span> {meta.label}
        </span>
        {!calibrating && (
          <span className="traj-deltas">
            <span className="traj-delta">
              {trend.gradeDelta >= 0 ? '+' : ''}{trend.gradeDelta.toFixed(1)} <em>grade</em>
            </span>
            <span className="traj-delta">
              {trend.ratingDelta >= 0 ? '+' : ''}{Math.round(trend.ratingDelta)} <em>rating</em>
            </span>
            <span className="traj-window">last {trend.window} drafts</span>
          </span>
        )}
      </div>
      <div className="traj-body">
        <p className="traj-summary">{trend.summary}</p>
        {!calibrating && <GradeSparkline values={trend.gradeSeries} up={trend.direction !== 'slipping'} />}
      </div>
    </div>
  );
}

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

      {/* Improvement trajectory — the North Star, made visible (PRE-51) */}
      <section>
        <h3 className="section-head">Your trajectory</h3>
        <TrajectoryCard trend={profile.improvement} />
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

      {/* Color-pair mastery and achievements now live per set (see the mastery
          ring on each Draft Academy set tile). */}
    </div>
  );
}
