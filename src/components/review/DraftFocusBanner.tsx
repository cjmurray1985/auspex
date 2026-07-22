import { useState } from 'react';
import type { CoachProfile } from '../../coach/types';
import { dismissFocus, isFocusDismissed, nextDraftFocus } from '../../coach/focus';

/**
 * Pre-draft focus (PRE-52). Surfaces the player's strongest recurring habit as
 * a single, dismissible focus before they draft again — so the lesson from last
 * time carries into this one. Renders nothing when there's no recurring fact.
 */
export function DraftFocusBanner({ profile }: { profile: CoachProfile }) {
  const focus = nextDraftFocus(profile);
  const [hidden, setHidden] = useState(() => (focus ? isFocusDismissed(focus.id) : true));
  if (!focus || hidden) return null;
  return (
    <div className="draft-focus" role="note">
      <div className="draft-focus-body">
        <span className="draft-focus-eyebrow">Focus for this draft</span>
        <p className="draft-focus-title">{focus.title}</p>
        <p className="draft-focus-action">→ {focus.action}</p>
      </div>
      <button
        className="draft-focus-dismiss"
        aria-label="Dismiss focus"
        onClick={() => {
          dismissFocus(focus.id);
          setHidden(true);
        }}
      >
        ×
      </button>
    </div>
  );
}
