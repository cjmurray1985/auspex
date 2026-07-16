import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { CoachProfile } from '../../coach/types';
import { activeNudge, dismissNudge } from '../../coach/nudge';

/**
 * A single, dismissible, fact-grounded nudge (DA-123). Renders nothing when
 * there is no real fact to surface, and never blocks the rest of the UI.
 */
export function NudgeBanner({ profile }: { profile: CoachProfile }) {
  const nudge = activeNudge(profile);
  const [dismissed, setDismissed] = useState(false);
  if (!nudge || dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="nudge-banner"
        role="note"
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
      >
        <div className="nudge-body">
          <div className="nudge-title">{nudge.title}</div>
          <div className="nudge-action">→ {nudge.action}</div>
        </div>
        <button
          type="button"
          className="nudge-dismiss"
          aria-label="Dismiss this tip"
          onClick={() => {
            dismissNudge(nudge.id);
            setDismissed(true);
          }}
        >
          ×
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
