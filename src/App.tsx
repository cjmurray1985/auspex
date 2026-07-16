import { lazy, Suspense, useEffect, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { useDraft } from './store';
import { MenuScreen, LoadingScreen } from './components/MenuScreen';
import { DraftScreen } from './components/DraftScreen';
import { DeckBuilder } from './components/DeckBuilder';
import { CardPreviewLayer } from './components/CardPreview';

// Heavy, end-of-flow / background views are code-split so they stay out of the
// initial shell. The review UI (charts + panels) is only needed after a draft,
// the atmosphere layer is decorative, and the art gallery is a dev-only tool.
const ReviewScreen = lazy(() =>
  import('./components/review/ReviewScreen').then((m) => ({ default: m.ReviewScreen })),
);
const GradingInterstitial = lazy(() =>
  import('./components/review/ReviewScreen').then((m) => ({ default: m.GradingInterstitial })),
);
const AtmosphereCanvas = lazy(() =>
  import('./components/AtmosphereCanvas').then((m) => ({ default: m.AtmosphereCanvas })),
);
const BgGallery = lazy(() =>
  import('./components/BgGallery').then((m) => ({ default: m.BgGallery })),
);

type Phase = 'loading' | 'draft' | 'build' | 'grading' | 'grade' | 'menu';

// Phases that make up the "draft experience" — Back exits these to the menu.
const SESSION_PHASES = new Set<Phase>(['draft', 'build', 'grading', 'grade']);

// Return the concrete screen element for a phase. This must NOT be a
// phase-reactive wrapper component: AnimatePresence (mode="wait") keeps the
// outgoing wrapper mounted while it animates out, and a live-phase wrapper
// would immediately render the *incoming* screen inside that outgoing wrapper —
// mounting it, then remounting it once the swap completes (a doubled entrance
// animation). Concrete elements keyed by phase avoid that.
function screenFor(phase: Phase) {
  switch (phase) {
    case 'loading':
      return <LoadingScreen />;
    case 'draft':
      return <DraftScreen />;
    case 'build':
      return <DeckBuilder />;
    case 'grading':
      return <GradingInterstitial />;
    case 'grade':
      return <ReviewScreen />;
    default:
      return <MenuScreen />;
  }
}

export default function App() {
  const init = useDraft((s) => s.init);
  const phase = useDraft((s) => s.phase);

  // Temporary background-art curation gallery, opened via #bg-gallery.
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const onHash = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    init();
  }, [init]);

  // Wire the browser Back button to exit the draft experience to the menu (the
  // draft stays resumable). Entering a session pushes one history entry so Back
  // has a target; Back (or Forward) toggles between the menu and the session.
  useEffect(() => {
    const inSession = SESSION_PHASES.has(phase);
    const stateIsDraft = window.history.state?.draft === true;
    if (inSession && !stateIsDraft) {
      window.history.pushState({ draft: true }, '');
    } else if (!inSession && stateIsDraft) {
      // Reached the menu while the current entry is still flagged as a draft
      // (e.g. finished grading and chose "Back to menu") — clear the flag so
      // Back/Forward can't resurrect a finished session.
      window.history.replaceState(null, '');
    }
  }, [phase]);

  useEffect(() => {
    const onPop = () => {
      const s = useDraft.getState();
      const stateIsDraft = window.history.state?.draft === true;
      if (stateIsDraft && s.pausedPhase) {
        s.resumeDraft(); // Forward pressed back into a paused session
      } else if (SESSION_PHASES.has(s.phase)) {
        s.pauseToMenu(); // Back pressed out of the draft experience
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  if (hash === '#bg-gallery') {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <BgGallery />
      </Suspense>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <Suspense fallback={null}>
        <AtmosphereCanvas />
      </Suspense>
      <AnimatePresence mode="wait">
        <motion.div
          key={phase}
          className="app-content"
          initial={{ opacity: 0, scale: 0.985 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.01 }}
          transition={{ duration: 0.32, ease: 'easeOut' }}
        >
          <Suspense fallback={<LoadingScreen />}>{screenFor(phase as Phase)}</Suspense>
        </motion.div>
      </AnimatePresence>
      <CardPreviewLayer />
      <footer className="legal-disclosure">
        Wizards of the Coast, Magic: The Gathering, and their logos are trademarks of Wizards of
        the Coast LLC. &copy; 2026 Wizards. All rights reserved. Draft Academy is unofficial Fan
        Content permitted under the Fan Content Policy. Not approved/endorsed by Wizards.
      </footer>
    </MotionConfig>
  );
}
