import { useState } from 'react';
import { motion } from 'framer-motion';
import { useDraft } from '../store';
import { ProgressDashboard } from './review/ProgressDashboard';

export function MenuScreen() {
  const startDraft = useDraft((s) => s.startDraft);
  const resumeDraft = useDraft((s) => s.resumeDraft);
  const pausedPhase = useDraft((s) => s.pausedPhase);
  const setName = useDraft((s) => s.setName);
  const profile = useDraft((s) => s.profile);
  const error = useDraft((s) => s.error);
  const [view, setView] = useState<'menu' | 'progress'>('menu');

  const hasHistory = profile.drafts > 0;
  const topInsight = profile.insights[0];
  const topGoal = profile.goals[0];

  if (view === 'progress') {
    return (
      <div className="grade-screen" style={{ paddingTop: '2rem' }}>
        <div className="progress-page">
          <div className="progress-page-head">
            <button className="btn-ghost" onClick={() => setView('menu')}>← Back</button>
            <h2 className="progress-page-title">Your Coach</h2>
            <button className="btn-primary" style={{ padding: '0.6rem 1.6rem' }} onClick={startDraft}>New Draft</button>
          </div>
          <ProgressDashboard profile={profile} />
        </div>
      </div>
    );
  }

  return (
    <div className="grade-screen" style={{ justifyContent: 'center' }}>
      <motion.h1
        className="title-shimmer"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: 'easeOut' }}
        style={{ fontSize: '3.4rem', letterSpacing: '0.14em', textAlign: 'center' }}
      >
        DRAFT ACADEMY
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        style={{ color: 'var(--text-dim)', marginTop: '0.6rem', textAlign: 'center', maxWidth: 540 }}
      >
        Draft {setName} against seven bots exactly like Arena — then get coached like a pro. Every pick is
        reviewed for decision quality, and your rating tracks how you improve over time.
      </motion.p>

      {error && <div style={{ color: 'var(--danger)', marginTop: '1rem', fontSize: '0.9rem' }}>{error}</div>}

      {hasHistory && (
        <motion.button
          className="coach-card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          onClick={() => setView('progress')}
        >
          <div className="coach-card-rating" style={{ borderColor: profile.rank.color }}>
            <span className="ccr-rank" style={{ color: profile.rank.color }}>{profile.rank.name}</span>
            <span className="ccr-num">{profile.rating}</span>
            {profile.ratingDelta !== 0 && (
              <span className="ccr-delta" style={{ color: profile.ratingDelta > 0 ? '#6ad88a' : '#e0a880' }}>
                {profile.ratingDelta > 0 ? '▲' : '▼'} {Math.abs(profile.ratingDelta)}
              </span>
            )}
          </div>
          <div className="coach-card-body">
            {topInsight && <div className="coach-card-insight">{topInsight}</div>}
            <div className="coach-card-meta">
              <span>{profile.drafts} drafts</span>
              <span>·</span>
              <span>{profile.streak}🔥 streak</span>
              <span>·</span>
              <span>best {profile.personalBest}</span>
              {topGoal && (
                <>
                  <span>·</span>
                  <span className="coach-card-goal">Goal: {topGoal.title}</span>
                </>
              )}
            </div>
          </div>
          <span className="coach-card-cta">View your coach →</span>
        </motion.button>
      )}

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.45 }}
        style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.9rem' }}
      >
        {pausedPhase ? (
          <>
            <button className="btn-primary" style={{ fontSize: '1.15rem', padding: '1.1rem 3.4rem' }} onClick={resumeDraft}>
              Resume Draft
            </button>
            <button className="btn-ghost" onClick={startDraft}>New Draft</button>
          </>
        ) : (
          <button className="btn-primary" style={{ fontSize: '1.15rem', padding: '1.1rem 3.4rem' }} onClick={startDraft}>
            Enter Draft
          </button>
        )}
      </motion.div>
    </div>
  );
}

export function LoadingScreen() {
  const loadingMessage = useDraft((s) => s.loadingMessage);
  return (
    <div className="grade-screen" style={{ justifyContent: 'center' }}>
      <div className="spinner" />
      <p style={{ marginTop: '1.4rem', color: 'var(--text-dim)' }}>{loadingMessage}</p>
    </div>
  );
}
