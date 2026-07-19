import { lazy, Suspense, useEffect, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { useDraft } from './store';
import { MenuScreen, LoadingScreen } from './components/MenuScreen';
import { DraftScreen } from './components/DraftScreen';
import { DeckBuilder } from './components/DeckBuilder';
import { CardPreviewLayer, useHover } from './components/CardPreview';

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

  // Clear any hover preview whenever the screen changes, so a card being hovered
  // at the end of the draft can't stay locked over the coach review.
  useEffect(() => {
    useHover.getState().reset();
  }, [phase]);

  // Guard accidental abandonment mid-draft. While drafting or deck-building,
  // closing/reloading/leaving the tab triggers the browser's native confirm.
  useEffect(() => {
    const active = phase === 'draft' || phase === 'build';
    if (!active) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [phase]);

  // Entering an active draft pushes one history entry so the browser Back button
  // has a target we can intercept — Back mid-draft asks to confirm abandonment.
  useEffect(() => {
    const active = phase === 'draft' || phase === 'build';
    const flagged = window.history.state?.draft === true;
    if (active && !flagged) window.history.pushState({ draft: true }, '');
    else if (!active && flagged) window.history.replaceState(null, '');
  }, [phase]);

  useEffect(() => {
    const onPop = () => {
      const s = useDraft.getState();
      const active = s.phase === 'draft' || s.phase === 'build';
      if (!active) return;
      if (window.confirm('Abandon your draft? Your progress will be lost.')) {
        s.reset();
      } else {
        // Stay in the draft — restore the history entry we just popped.
        window.history.pushState({ draft: true }, '');
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
        <p>
          Wizards of the Coast, Magic: The Gathering, and their logos are trademarks of Wizards of
          the Coast LLC. &copy; 2026 Wizards. All rights reserved. Auspex is unofficial Fan
          Content permitted under the Fan Content Policy. Not approved/endorsed by Wizards.
        </p>
        <p className="attribution">
          Card data &amp; images from{' '}
          <a href="https://scryfall.com" target="_blank" rel="noreferrer noopener">Scryfall</a>; draft
          win-rate data from{' '}
          <a href="https://www.17lands.com" target="_blank" rel="noreferrer noopener">17Lands</a>;
          background art from{' '}
          <a href="https://www.mtgpics.com" target="_blank" rel="noreferrer noopener">mtgpics</a>.
          Not affiliated with any of these.
        </p>
      </footer>
    </MotionConfig>
  );
}
