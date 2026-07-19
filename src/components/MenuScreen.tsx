import { useState } from 'react';
import { motion } from 'framer-motion';
import { useDraft } from '../store';
import { SETS, type DraftableSet } from '../data/sets';
import { DRAFT_MODES, type DraftMode } from '../types';
import { ProgressDashboard } from './review/ProgressDashboard';

const MODES: DraftMode[] = ['quick', 'human'];

function ModeToggle() {
  const mode = useDraft((s) => s.mode);
  const setMode = useDraft((s) => s.setMode);
  return (
    <div className="mode-toggle" role="radiogroup" aria-label="Draft opponents">
      <span className="mode-toggle-label">Opponents</span>
      <div className="mode-opts">
        {MODES.map((m) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={mode === m}
            className={`mode-opt${mode === m ? ' on' : ''}`}
            onClick={() => setMode(m)}
          >
            <span className="mode-opt-title">{DRAFT_MODES[m].label}</span>
            <span className="mode-opt-blurb">{DRAFT_MODES[m].blurb}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

const LOGO_SRC = `${import.meta.env.BASE_URL}auspex-logo.png`;

/** Platform nav. Auspex (the brand) is deliberately minimized to the corner
 *  mark; the experiences it houses are the foreground. */
function AppNav({
  active,
  onDraft,
  onCoach,
  hasHistory,
}: {
  active: 'draft' | 'coach';
  onDraft: () => void;
  onCoach: () => void;
  hasHistory: boolean;
}) {
  return (
    <nav className="app-nav" aria-label="Auspex">
      <button className="app-nav-brand" onClick={onDraft} aria-label="Auspex home">
        <img className="app-nav-logo" src={LOGO_SRC} alt="" width={28} height={28} />
        <span className="app-nav-wordmark">Auspex</span>
      </button>

      <div className="app-nav-links">
        <button
          className={`app-nav-link${active === 'draft' ? ' is-active' : ''}`}
          onClick={onDraft}
        >
          Draft Academy
        </button>
        <button
          className={`app-nav-link${active === 'coach' ? ' is-active' : ''}`}
          onClick={onCoach}
          disabled={!hasHistory}
          title={hasHistory ? undefined : 'Draft once to unlock your coach'}
        >
          Coach
        </button>
        <span className="app-nav-link is-soon">Puzzles<em>soon</em></span>
        <span className="app-nav-link is-soon">Lessons<em>soon</em></span>
      </div>
    </nav>
  );
}

function SetTile({ set, onDraft }: { set: DraftableSet; onDraft: (code: string) => void }) {
  const live = set.status === 'live';
  return (
    <motion.button
      className={`set-tile${set.featured ? ' set-tile-featured' : ''}${live ? '' : ' set-tile-soon'}`}
      onClick={() => live && onDraft(set.code)}
      disabled={!live}
      whileHover={live ? { y: -4 } : undefined}
      aria-label={live ? `Draft ${set.name}` : `${set.name} — coming soon`}
    >
      <div className="set-tile-top">
        <span className="set-tile-code">{set.code}</span>
        <span className={`set-tile-badge${live ? '' : ' set-tile-badge-soon'}`}>
          {live ? set.format : 'Coming soon'}
        </span>
      </div>
      <div className="set-tile-name">{set.name}</div>
      <div className="set-tile-blurb">{set.blurb}</div>
      {live && (
        <span className="set-tile-cta">{set.featured ? 'Enter Draft' : 'Draft'} →</span>
      )}
    </motion.button>
  );
}

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
      <div className="menu-shell">
        <AppNav
          active="coach"
          hasHistory={hasHistory}
          onDraft={() => setView('menu')}
          onCoach={() => setView('progress')}
        />
        <div className="progress-page">
          <div className="progress-page-head">
            <button className="btn-ghost" onClick={() => setView('menu')}>← Draft Academy</button>
            <h2 className="progress-page-title">Your Coach</h2>
            <button className="btn-primary" style={{ padding: '0.6rem 1.6rem' }} onClick={() => startDraft()}>New Draft</button>
          </div>
          <ProgressDashboard profile={profile} />
        </div>
      </div>
    );
  }

  return (
    <div className="menu-shell">
      <AppNav
        active="draft"
        hasHistory={hasHistory}
        onDraft={() => setView('menu')}
        onCoach={() => setView('progress')}
      />

      <main className="da-landing">
        {pausedPhase && (
          <motion.div
            className="resume-banner"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <span>You have a draft in progress{setName ? ` — ${setName}` : ''}.</span>
            <button className="btn-primary" style={{ padding: '0.5rem 1.4rem' }} onClick={resumeDraft}>
              Resume Draft
            </button>
          </motion.div>
        )}

        <motion.div
          className="experience-lockup"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.05 }}
        >
          Draft Academy
        </motion.div>
        <motion.h1
          className="da-hero-title"
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          Draft like a pro. Get coached like one.
        </motion.h1>
        <motion.p
          className="da-hero-sub"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
        >
          Pick a set from the current Arena limited menu, draft it against seven bots, then get every
          pick reviewed for decision quality. Your rating tracks how you improve.
        </motion.p>

        {error && <div className="da-error">{error}</div>}

        <ModeToggle />

        <div className="da-set-head">
          <h2>Available to draft now</h2>
          <span>Mirrors MTG Arena&apos;s limited queues</span>
        </div>

        <motion.div
          className="set-grid"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          {SETS.map((s) => (
            <SetTile key={s.code} set={s} onDraft={startDraft} />
          ))}
        </motion.div>

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
      </main>
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
