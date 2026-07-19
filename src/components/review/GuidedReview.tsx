import { useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { DRAFT_MODES } from '../../types';
import type { CoachProfile, DraftReview } from '../../coach/types';
import { gradeColor } from '../Card3D';
import { MomentsList } from './panels';
import { ConfidencePill, MeterBar, scoreColor } from './ui';

/**
 * Guided post-draft review (PRE-34 / PRE-35).
 * Sequences the coaching into a paced, narrative walkthrough — biggest lessons
 * first — instead of dropping the player into a wall of tabs. Every existing
 * detail stays reachable via "Explore full review".
 */
interface Step {
  key: string;
  title: string;
  render: () => ReactNode;
}

/** Rank/rating chip that shows a calibration state before the player is placed. */
function RatingChip({ profile }: { profile: CoachProfile }) {
  if (profile.calibrating) {
    return (
      <span className="rating-chip" style={{ borderColor: 'var(--text-dim)', color: 'var(--text-dim)' }}>
        Calibrating · {profile.calibrationRemaining} to rank
      </span>
    );
  }
  return (
    <span className="rating-chip" style={{ borderColor: profile.rank.color, color: profile.rank.color }}>
      {profile.rankLabel} · {profile.rating}
      {profile.ratingDelta !== 0 && (
        <b> {profile.ratingDelta > 0 ? '+' : ''}{profile.ratingDelta}</b>
      )}
    </span>
  );
}

export function GuidedReview({
  review,
  profile,
  isPB,
  best,
  recordCount,
  onJump,
  onExit,
  onDraftAgain,
  onMainMenu,
}: {
  review: DraftReview;
  profile: CoachProfile;
  isPB: boolean;
  best: number | null;
  recordCount: number;
  onJump: (decisionIndex: number) => void;
  onExit: () => void;
  onDraftAgain: () => void;
  onMainMenu: () => void;
}) {
  const moments = review.moments.slice(0, 3);
  const sorted = [...review.categories].sort((a, b) => b.score - a.score);
  const strongest = sorted[0];
  const weakest = sorted[sorted.length - 1];
  const topGoal = profile.goals?.[0];

  const steps: Step[] = [
    {
      key: 'verdict',
      title: 'The verdict',
      render: () => (
        <div className="gr-verdict">
          <div className="gr-verdict-grade">
            <div className="gr-letter" style={{ color: gradeColor(review.letter) }}>{review.letter}</div>
            <div className="gr-score">{review.overall}<span>/100</span></div>
          </div>
          <p className="gr-headline">{review.headline}</p>
          <div className="gr-verdict-badges">
            <span className="badge">vs {DRAFT_MODES[review.mode].label}</span>
            <ConfidencePill level={review.confidence} />
            {isPB && <span className="pb-badge">NEW PERSONAL BEST</span>}
            {best !== null && !isPB && <span className="badge">Best: {best}/100 · {recordCount} drafts</span>}
            <RatingChip profile={profile} />
          </div>
          <div className="tier-summary">
            {(['best', 'strong', 'acceptable', 'weak', 'mistake'] as const).map((t) => (
              <span key={t} className={`tier-count tier-${t}`}>
                <b>{review.tierCounts[t]}</b> {t}
              </span>
            ))}
          </div>
        </div>
      ),
    },
    ...moments.map((m, i) => ({
      key: `moment-${i}`,
      title: `Coaching moment ${i + 1} of ${moments.length}`,
      render: () => <MomentsList moments={[m]} onJump={onJump} />,
    })),
    {
      key: 'dimensions',
      title: 'Your dimensions',
      render: () => (
        <div className="gr-dims">
          <p className="tab-intro">
            Strongest: <b>{strongest.label}</b> ({Math.round(strongest.score)}). Biggest lever:{' '}
            <b>{weakest.label}</b> ({Math.round(weakest.score)}).
          </p>
          <div className="cat-mini">
            {review.categories.map((c) => (
              <div key={c.key} className="cat-mini-row">
                <span className="cat-mini-label">{c.label}</span>
                <MeterBar score={c.score} />
                <span className="cat-mini-score" style={{ color: scoreColor(c.score) }}>{Math.round(c.score)}</span>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      key: 'next',
      title: "Where you're headed",
      render: () => (
        <div className="gr-next">
          <RatingChip profile={profile} />
          {topGoal && (
            <div className="gr-goal">
              <div className="gr-goal-title">This week: {topGoal.title}</div>
              <div className="gr-goal-detail">{topGoal.detail}</div>
            </div>
          )}
        </div>
      ),
    },
  ];

  const [i, setI] = useState(0);
  const step = steps[i];
  const atEnd = i === steps.length - 1;

  return (
    <div className="guided-review">
      <div className="gr-progress">
        <div className="gr-dots">
          {steps.map((s, idx) => (
            <span key={s.key} className={`gr-dot${idx === i ? ' on' : ''}${idx < i ? ' done' : ''}`} />
          ))}
        </div>
        <button className="gr-skip" onClick={onExit}>Skip to full review →</button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step.key}
          className="gr-step"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          <div className="gr-step-eyebrow">Step {i + 1} of {steps.length}</div>
          <h3 className="gr-step-title">{step.title}</h3>
          {step.render()}
        </motion.div>
      </AnimatePresence>

      <div className="gr-nav">
        <button className="btn-ghost" disabled={i === 0} onClick={() => setI((v) => v - 1)}>Back</button>
        {atEnd ? (
          <div className="gr-nav-end">
            <button className="btn-ghost" onClick={onExit}>Explore full review</button>
            <button className="btn-ghost" onClick={onMainMenu}>Main Menu</button>
            <button className="btn-primary" onClick={onDraftAgain}>Draft Again</button>
          </div>
        ) : (
          <button className="btn-primary" onClick={() => setI((v) => v + 1)}>Next</button>
        )}
      </div>
    </div>
  );
}
