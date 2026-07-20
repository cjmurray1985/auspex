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

/** One eligible size in a responsive slot, mirroring a GPT `sizeMapping` entry.
 *  List largest-first; the first whose `minViewport` fits the viewport wins. */
export interface AdSize {
  w: number;
  h: number;
  /** Minimum viewport width (px) for this size to be eligible. Default 0. */
  minViewport?: number;
  imageSrc?: string;
  videoSrc?: string;
}

interface AdSlotProps {
  format: AdFormat;
  /** Muted-autoplay video creative (video format). Absent → image or placeholder. */
  videoSrc?: string;
  posterSrc?: string;
  /** Static image creative (either format). Used when there's no video. */
  imageSrc?: string;
  /** Optional click-through URL for image creatives. */
  href?: string;
  /** Responsive size map (largest-first). When set, the largest size whose
   *  `minViewport` fits the current viewport is rendered — like GPT picking the
   *  biggest eligible creative (e.g. 970x250 billboard → 728x90 → 320x100). */
  sizes?: readonly AdSize[];
  /** Slot identifier for a future ad-network mapping / analytics. */
  slotId?: string;
  className?: string;
}

/** Current viewport width, updated on resize — drives responsive size choice. */
function useViewportWidth(): number {
  const [w, setW] = useState(() =>
    typeof window === 'undefined' ? 1280 : window.innerWidth,
  );
  useEffect(() => {
    const on = () => setW(window.innerWidth);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return w;
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
  sizes,
  slotId,
  className,
}: AdSlotProps) {
  const online = useOnline();
  const vw = useViewportWidth();
  // Offline-first: no network → no ad, and the surrounding layout reclaims the
  // space (the draft rail's deck panel simply grows to fill it).
  if (!online) return null;

  const cls = `ad-slot ad-${format}${className ? ` ${className}` : ''}`;

  // Responsive slot: pick the largest eligible size for this viewport.
  const chosen = sizes?.find((s) => vw >= (s.minViewport ?? 0)) ?? sizes?.at(-1);
  const effVideo = chosen?.videoSrc ?? videoSrc;
  const effImage = chosen?.imageSrc ?? imageSrc;
  const creativeStyle = chosen
    ? { width: chosen.w, height: chosen.h, maxWidth: '100%' }
    : undefined;

  const creative =
    format === 'video' && effVideo ? (
      <AdVideo src={effVideo} poster={posterSrc} />
    ) : effImage ? (
      <AdImage src={effImage} href={href} />
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
      <div className="ad-creative" style={creativeStyle}>
        {creative}
      </div>
    </aside>
  );
}
