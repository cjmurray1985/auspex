import { useState } from 'react';
import { motion } from 'framer-motion';
import { useDraft } from '../store';
import { SETS, getSet, setArtUrl, setSymbolUrl, type DraftableSet } from '../data/sets';
import { useAccount } from '../data/account';
import { DRAFT_MODES, type DraftMode } from '../types';
import { setMastery, type SetMastery } from '../coach/mastery';
import { SetMasteryRing, SetMasteryModal, SetMasteryPanel } from './SetMastery';
import { ProgressDashboard } from './review/ProgressDashboard';
import { AdSlot } from './AdSlot';
import { navigate, useSubPath } from '../router';

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
  const profile = useDraft((s) => s.profile);
  const initial = account?.name.trim().charAt(0).toUpperCase() || '?';
  const sectionLabel = active === 'profile' ? 'Profile' : 'Draft Academy';
  return (
    <nav className="app-nav" aria-label="Auspex">
      <div className="app-nav-brand">
        <button className="app-nav-logo-btn" onClick={onDraft} aria-label="Auspex home">
          <img className="app-nav-logo" src={LOGO_SRC} alt="" width={30} height={30} />
        </button>
        <span className="app-nav-section">{sectionLabel}</span>
      </div>

      <div className="app-nav-links">
        <span className="app-nav-link is-soon">Puzzles<em>soon</em></span>
        <span className="app-nav-link is-soon">Lessons<em>soon</em></span>
        <button
          className={`app-nav-profile${active === 'profile' ? ' is-active' : ''}`}
          onClick={onProfile}
          title={
            account
              ? profile.calibrating
                ? `${account.name} · Calibrating (${profile.calibrationRemaining} to rank)`
                : `${account.name} · ${profile.rankLabel}`
              : 'Sign in'
          }
        >
          {account ? (
            <>
              <span
                className="app-nav-avatar"
                aria-hidden
                style={{ background: profile.calibrating ? undefined : profile.rank.color }}
              >
                {initial}
              </span>
              <span
                className="app-nav-elo"
                style={{ color: profile.calibrating ? 'var(--text-dim)' : profile.rank.color }}
              >
                {profile.calibrating ? 'Calibrating' : profile.rating}
              </span>
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
  ringDelay,
  onOpen,
  onOpenMastery,
}: {
  set: DraftableSet;
  mastery: SetMastery;
  ringDelay: number;
  onOpen: (code: string) => void;
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
      onClick={() => live && onOpen(set.code)}
      onKeyDown={(e) => {
        if (live && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onOpen(set.code);
        }
      }}
      whileHover={live ? { y: -4 } : undefined}
      aria-label={live ? `Open ${set.name}` : `${set.name} — coming soon`}
    >
      {art && (
        <img className="set-tile-art" src={art} alt="" loading="lazy" draggable={false} />
      )}
      <div className="set-tile-scrim" />

      <button
        className="set-tile-ring-btn"
        onClick={(e) => {
          e.stopPropagation();
          onOpenMastery(set);
        }}
          aria-label={`${set.name} set mastery`}
          title="Set mastery"
        >
          <SetMasteryRing pct={mastery.pct} delay={ringDelay} />
        </button>

      <div className="set-tile-content">
        <div className="set-tile-meta">
          <img
            className="set-tile-symbol"
            src={setSymbolUrl(set)}
            alt={set.code}
            loading="lazy"
            draggable={false}
          />
          <span className={`set-tile-badge${live ? '' : ' set-tile-badge-soon'}`}>
            {live ? set.format : 'Coming soon'}
          </span>
        </div>
        <div className="set-tile-name">{set.name}</div>
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

/** A set's own page: leads with the draft CTA, then the player's mastery for
 *  that set. Reached via a set tile or a direct link (…/draft-academy/msh/). */
function SetLandingPage({
  set,
  onHome,
  onProfile,
}: {
  set: DraftableSet;
  onHome: () => void;
  onProfile: () => void;
}) {
  const startDraft = useDraft((s) => s.startDraft);
  const records = useDraft((s) => s.records);
  const error = useDraft((s) => s.error);
  const mastery = setMastery(records, set.code);
  const live = set.status === 'live';
  const art = setArtUrl(set);

  return (
    <div className="menu-shell">
      <AppNav active="draft" onDraft={onHome} onProfile={onProfile} />

      <main className="set-page">
        <button className="set-page-back" onClick={onHome}>
          <span aria-hidden>←</span> Draft Academy
        </button>

        <motion.header
          className={`set-page-hero${art ? ' has-art' : ''}`}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          {art && <img className="set-page-hero-art" src={art} alt="" draggable={false} />}
          <div className="set-page-hero-scrim" />
          <div className="set-page-hero-body">
            <img className="set-page-symbol" src={setSymbolUrl(set)} alt="" draggable={false} />
            <div className="experience-lockup">{live ? set.format : 'Coming soon'}</div>
            <h1 className="set-page-title">{set.name}</h1>
            {error && <div className="da-error">{error}</div>}
            <button
              className="btn-primary set-page-cta"
              disabled={!live}
              onClick={() => live && startDraft(set.code)}
            >
              {live ? 'Start draft' : 'Coming soon'}
            </button>
          </div>
        </motion.header>

        <motion.section
          className="set-page-progress"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.5, ease: 'easeOut' }}
        >
          <header className="set-page-progress-head">
            <div>
              <div className="mastery-modal-eyebrow">Your progress</div>
              <h2 className="set-page-progress-title">Set Mastery</h2>
            </div>
            <div className="mastery-modal-pct">
              <SetMasteryRing pct={mastery.pct} size={64} delay={0.15} />
            </div>
          </header>
          <SetMasteryPanel mastery={mastery} />
        </motion.section>
      </main>
    </div>
  );
}

export function MenuScreen() {
  const records = useDraft((s) => s.records);
  const error = useDraft((s) => s.error);
  const subPath = useSubPath();
  const [view, setView] = useState<'menu' | 'profile'>('menu');
  const [masterySet, setMasterySet] = useState<DraftableSet | null>(null);

  if (view === 'profile') {
    return <ProfileScreen onBackToDraft={() => setView('menu')} />;
  }

  // A set sub-path (…/msh/) renders that set's own page.
  const routedSet = getSet(subPath);
  if (routedSet) {
    return (
      <SetLandingPage
        set={routedSet}
        onHome={() => navigate('')}
        onProfile={() => setView('profile')}
      />
    );
  }

  return (
    <div className="menu-shell">
      <AppNav active="draft" onDraft={() => setView('menu')} onProfile={() => setView('profile')} />

      <main className="da-landing">
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

        {error && <div className="da-error">{error}</div>}

        <motion.div
          className="set-grid"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          {SETS.map((s, i) => (
            <SetTile
              key={s.code}
              set={s}
              mastery={setMastery(records, s.code)}
              ringDelay={0.7 + i * 0.15}
              onOpen={(code) => navigate(code.toLowerCase())}
              onOpenMastery={setMasterySet}
            />
          ))}
        </motion.div>

        <AdSlot format="leaderboard" slotId="academy-leaderboard" className="da-ad" />

        {masterySet && (
          <SetMasteryModal
            setName={masterySet.name}
            mastery={setMastery(records, masterySet.code)}
            onClose={() => setMasterySet(null)}
          />
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
