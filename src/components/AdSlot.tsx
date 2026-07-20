import { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '../fx/reducedMotion';

/**
 * AdSlot — the single ad surface for Auspex.
 * =========================================
 * Auspex is offline-first (a mission non-negotiable): the app must fully draft
 * and grade with no network. Ads are therefore *subsidy, never dependency* —
 * this slot renders nothing when offline and must never block render, steal
 * focus, or touch the pick timer.
 *
 * IP hygiene: the unit is always labelled "Advertisement" and visually separated
 * from card imagery so it can't imply a sponsor is associated with the cards
 * (Scryfall image guideline) or with Wizards (WOTC Fan Content Policy). Video is
 * muted-autoplay only, honours prefers-reduced-motion, and unmute is always
 * user-initiated — so it stays within WOTC's "don't interfere with access" line.
 *
 * There is no ad-network SDK wired yet; a real tag (AdSense/GPT/etc.) drops into
 * the render branches below without changing callers.
 */

export type AdFormat = 'video' | 'leaderboard';

interface AdSlotProps {
  format: AdFormat;
  /** Muted-autoplay video creative (video format). Absent → image or placeholder. */
  videoSrc?: string;
  posterSrc?: string;
  /** Static image creative (either format). Used when there's no video. */
  imageSrc?: string;
  /** Optional click-through URL for image creatives. */
  href?: string;
  /** Slot identifier for a future ad-network mapping / analytics. */
  slotId?: string;
  className?: string;
}

/** Live online status, so the slot disappears cleanly when the network drops. */
function useOnline(): boolean {
  const [online, setOnline] = useState(
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

/** Muted-autoplay video. Holds the poster frame under reduced-motion; never
 *  autoplays with sound — unmute is always a user action. */
function AdVideo({ src, poster }: { src: string; poster?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const reduced = prefersReducedMotion();

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (reduced) {
      v.pause();
      return;
    }
    // Browsers permit muted autoplay; swallow the rejection if they don't.
    void v.play().catch(() => {});
  }, [reduced]);

  const toggleSound = () => {
    const v = ref.current;
    if (!v) return;
    const next = !muted;
    v.muted = next;
    setMuted(next);
    if (!next) void v.play().catch(() => {});
  };

  return (
    <>
      <video
        ref={ref}
        className="ad-video-el"
        src={src}
        poster={poster}
        muted
        autoPlay={!reduced}
        loop
        playsInline
        preload="metadata"
        tabIndex={-1}
      />
      <button type="button" className="ad-mute" onClick={toggleSound}>
        {muted ? 'Sound off' : 'Sound on'}
      </button>
    </>
  );
}

function AdImage({ src, href }: { src: string; href?: string }) {
  const img = <img className="ad-image" src={src} alt="Advertisement" draggable={false} />;
  if (!href) return img;
  return (
    <a className="ad-image-link" href={href} target="_blank" rel="noreferrer noopener sponsored">
      {img}
    </a>
  );
}

function AdPlaceholder() {
  return <div className="ad-placeholder" aria-hidden />;
}

export function AdSlot({
  format,
  videoSrc,
  posterSrc,
  imageSrc,
  href,
  slotId,
  className,
}: AdSlotProps) {
  const online = useOnline();
  // Offline-first: no network → no ad, and the surrounding layout reclaims the
  // space (the draft rail's deck panel simply grows to fill it).
  if (!online) return null;

  const cls = `ad-slot ad-${format}${className ? ` ${className}` : ''}`;

  const creative =
    format === 'video' && videoSrc ? (
      <AdVideo src={videoSrc} poster={posterSrc} />
    ) : imageSrc ? (
      <AdImage src={imageSrc} href={href} />
    ) : (
      <AdPlaceholder />
    );

  // Layout mirrors a real Google Publisher Tag unit: the disclosure label is a
  // sibling ABOVE the creative, in its own reserved space — never overlapping.
  // In production the creative renders inside a GPT-managed iframe (SafeFrame)
  // that exactly fills `.ad-creative`; the publisher can only label around that
  // iframe, not draw over it. `.ad-creative` is sized to the standard slot
  // dimensions so there's no layout shift when the creative loads.
  return (
    <aside className={cls} aria-label="Advertisement" data-slot-id={slotId}>
      <span className="ad-label">Advertisement</span>
      <div className="ad-creative">{creative}</div>
    </aside>
  );
}
