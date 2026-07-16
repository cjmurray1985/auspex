import { useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { CoachProfile, DraftReview } from '../../coach/types';
import { gradeColor } from '../Card3D';
import { MomentsList } from './panels';
import { MeterBar, scoreColor } from './ui';

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

export function GuidedReview({
  review,
  profile,
  onJump,
  onExit,
}: {
  review: DraftReview;
  profile: CoachProfile;
  onJump: (decisionIndex: number) => void;
  onExit: () => void;
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
          <div className="gr-letter" style={{ color: gradeColor(review.letter) }}>{review.letter}</div>
          <p className="gr-headline">{review.headline}</p>
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
          <span className="rating-chip" style={{ borderColor: profile.rank.color, color: profile.rank.color }}>
            {profile.rank.name} · {profile.rating}
            {profile.ratingDelta !== 0 && (
              <b> {profile.ratingDelta > 0 ? '+' : ''}{profile.ratingDelta}</b>
            )}
          </span>
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
          <button className="btn-primary" onClick={onExit}>Explore full review</button>
        ) : (
          <button className="btn-primary" onClick={() => setI((v) => v + 1)}>Next</button>
        )}
      </div>
    </div>
  );
}
