import { useState } from 'react';
import { motion } from 'framer-motion';
import { useDraft } from '../store';
import { SETS, setArtUrl, type DraftableSet } from '../data/sets';
import { useAccount } from '../data/account';
import { DRAFT_MODES, type DraftMode } from '../types';
import { setMastery, type SetMastery } from '../coach/mastery';
import { SetMasteryRing, SetMasteryModal } from './SetMastery';
import { ProgressDashboard } from './review/ProgressDashboard';

const LOGO_SRC = `${import.meta.env.BASE_URL}auspex-logo.png`;
const MODES: DraftMode[] = ['quick', 'human'];

/** Opponents (draft environment) selector — a profile setting. */
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

/** Platform nav. Auspex (the brand) is minimized to the corner mark; the
 *  experiences it houses lead, with the player's Profile on the right. */
function AppNav({
  active,
  onDraft,
  onProfile,
}: {
  active: 'draft' | 'profile';
  onDraft: () => void;
  onProfile: () => void;
}) {
  const account = useAccount((s) => s.profile);
  const initial = account?.name.trim().charAt(0).toUpperCase() || '?';
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
        <span className="app-nav-link is-soon">Puzzles<em>soon</em></span>
        <span className="app-nav-link is-soon">Lessons<em>soon</em></span>
        <button
          className={`app-nav-profile${active === 'profile' ? ' is-active' : ''}`}
          onClick={onProfile}
        >
          {account ? (
            <>
              <span className="app-nav-avatar" aria-hidden>{initial}</span>
              <span className="app-nav-profile-name">{account.name}</span>
            </>
          ) : (
            <span className="app-nav-signin">Sign in</span>
          )}
        </button>
      </div>
    </nav>
  );
}

function SetTile({
  set,
  mastery,
  onDraft,
  onOpenMastery,
}: {
  set: DraftableSet;
  mastery: SetMastery;
  onDraft: (code: string) => void;
  onOpenMastery: (set: DraftableSet) => void;
}) {
  const live = set.status === 'live';
  const art = setArtUrl(set);
  return (
    <motion.div
      className={`set-tile${set.featured ? ' set-tile-featured' : ''}${live ? '' : ' set-tile-soon'}${art ? ' has-art' : ''}`}
      role="button"
      tabIndex={live ? 0 : -1}
      aria-disabled={!live}
      onClick={() => live && onDraft(set.code)}
      onKeyDown={(e) => {
        if (live && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onDraft(set.code);
        }
      }}
      whileHover={live ? { y: -4 } : undefined}
      aria-label={live ? `Draft ${set.name}` : `${set.name} — coming soon`}
    >
      {art && (
        <img className="set-tile-art" src={art} alt="" loading="lazy" draggable={false} />
      )}
      <div className="set-tile-scrim" />
      <div className="set-tile-content">
        <div className="set-tile-top">
          <span className="set-tile-code">{set.code}</span>
          <span className={`set-tile-badge${live ? '' : ' set-tile-badge-soon'}`}>
            {live ? set.format : 'Coming soon'}
          </span>
        </div>
        <div className="set-tile-name">{set.name}</div>
        <div className="set-tile-blurb">{set.blurb}</div>
        <div className="set-tile-foot">
          {live ? (
            <span className="set-tile-cta">{set.featured ? 'Enter Draft' : 'Draft'} →</span>
          ) : (
            <span />
          )}
          <button
            className="set-tile-ring-btn"
            onClick={(e) => {
              e.stopPropagation();
              onOpenMastery(set);
            }}
            aria-label={`${set.name} set mastery`}
            title="Set mastery"
          >
            <SetMasteryRing pct={mastery.pct} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/** Sign-in / performance / settings — everything tied to the player's account. */
function ProfileScreen({ onBackToDraft }: { onBackToDraft: () => void }) {
  const account = useAccount((s) => s.profile);
  const signIn = useAccount((s) => s.signIn);
  const signOut = useAccount((s) => s.signOut);
  const reloadForAccount = useDraft((s) => s.reloadForAccount);
  const startDraft = useDraft((s) => s.startDraft);
  const profile = useDraft((s) => s.profile);
  const [name, setName] = useState('');

  const doSignIn = () => {
    if (!name.trim()) return;
    signIn(name);
    reloadForAccount();
  };
  const doSignOut = () => {
    signOut();
    reloadForAccount();
  };

  if (!account) {
    return (
      <div className="menu-shell">
        <AppNav active="profile" onDraft={onBackToDraft} onProfile={() => {}} />
        <main className="profile-page">
          <motion.div
            className="signin-card"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <img className="signin-logo" src={LOGO_SRC} alt="" width={52} height={52} />
            <h1 className="signin-title">Sign in to Auspex</h1>
            <p className="signin-sub">
              Your profile keeps your draft rating, coaching history, and settings. Pick a handle to
              start — enter the same one later to pick up where you left off.
            </p>
            <form
              className="signin-form"
              onSubmit={(e) => {
                e.preventDefault();
                doSignIn();
              }}
            >
              <input
                className="signin-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your handle"
                aria-label="Handle"
                maxLength={40}
                autoFocus
              />
              <button className="btn-primary" type="submit" disabled={!name.trim()}>
                Sign in
              </button>
            </form>
            <p className="signin-note">
              Saved on this device for now — cloud sync is coming. No password required.
            </p>
          </motion.div>
        </main>
      </div>
    );
  }

  const hasHistory = profile.drafts > 0;
  const since = new Date(account.createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="menu-shell">
      <AppNav active="profile" onDraft={onBackToDraft} onProfile={() => {}} />
      <main className="profile-page">
        <header className="profile-head">
          <div className="profile-id">
            <span className="profile-avatar" aria-hidden>{account.name.charAt(0).toUpperCase()}</span>
            <div>
              <h1 className="profile-name">{account.name}</h1>
              <span className="profile-since">
                {`${account.name}'s Academy · member since ${since}`}
              </span>
            </div>
          </div>
          <button className="btn-ghost" onClick={doSignOut}>Sign out</button>
        </header>

        <section className="profile-section">
          <h2 className="profile-section-title">Settings</h2>
          <ModeToggle />
        </section>

        <section className="profile-section">
          <h2 className="profile-section-title">Performance</h2>
          {hasHistory ? (
            <ProgressDashboard profile={profile} />
          ) : (
            <div className="profile-empty">
              <p>No drafts yet. Your rating, coaching history, and mastery show up here once you draft.</p>
              <button className="btn-primary" onClick={() => startDraft()}>Start a draft</button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export function MenuScreen() {
  const startDraft = useDraft((s) => s.startDraft);
  const resumeDraft = useDraft((s) => s.resumeDraft);
  const pausedPhase = useDraft((s) => s.pausedPhase);
  const setName = useDraft((s) => s.setName);
  const profile = useDraft((s) => s.profile);
  const records = useDraft((s) => s.records);
  const error = useDraft((s) => s.error);
  const account = useAccount((s) => s.profile);
  const [view, setView] = useState<'menu' | 'profile'>('menu');
  const [masterySet, setMasterySet] = useState<DraftableSet | null>(null);

  const signedIn = !!account;
  const hasHistory = signedIn && profile.drafts > 0;
  const topInsight = profile.insights[0];
  const topGoal = profile.goals[0];

  if (view === 'profile') {
    return <ProfileScreen onBackToDraft={() => setView('menu')} />;
  }

  return (
    <div className="menu-shell">
      <AppNav active="draft" onDraft={() => setView('menu')} onProfile={() => setView('profile')} />

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
          Draft. Review. Improve. Repeat.
        </motion.h1>
        <motion.p
          className="da-hero-sub"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
        >
          Pick a set from Arena&apos;s limited menu, draft it against seven bots, and get every pick
          reviewed for decision quality — so you get a little better every draft.
        </motion.p>

        {error && <div className="da-error">{error}</div>}

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
            <SetTile
              key={s.code}
              set={s}
              mastery={setMastery(records, s.code)}
              onDraft={startDraft}
              onOpenMastery={setMasterySet}
            />
          ))}
        </motion.div>

        {masterySet && (
          <SetMasteryModal
            setName={masterySet.name}
            mastery={setMastery(records, masterySet.code)}
            onClose={() => setMasterySet(null)}
          />
        )}

        {hasHistory ? (
          <motion.button
            className="coach-card"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            onClick={() => setView('profile')}
          >
            <div
              className="coach-card-rating"
              style={{ borderColor: profile.calibrating ? 'var(--text-dim)' : profile.rank.color }}
            >
              <span
                className="ccr-rank"
                style={{ color: profile.calibrating ? 'var(--text-dim)' : profile.rank.color }}
              >
                {profile.rankLabel}
              </span>
              <span className="ccr-num">{profile.calibrating ? `${profile.calibrationRemaining} to rank` : profile.rating}</span>
              {!profile.calibrating && profile.ratingDelta !== 0 && (
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
        ) : (
          <motion.button
            className="coach-card coach-card-signin"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            onClick={() => setView('profile')}
          >
            <div className="coach-card-body">
              <div className="coach-card-insight">
                {signedIn ? 'Draft to start building your coaching profile.' : 'Sign in to track your rating and coaching history.'}
              </div>
              <div className="coach-card-meta">
                <span>{signedIn ? 'View your profile' : 'Your performance data lives in your profile'}</span>
              </div>
            </div>
            <span className="coach-card-cta">{signedIn ? 'Open profile →' : 'Sign in →'}</span>
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
