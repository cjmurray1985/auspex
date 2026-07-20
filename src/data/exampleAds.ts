/**
 * Demo ad creatives — PREVIEW ONLY.
 * =================================
 * These are fictional placeholder brands ("AEGIS Sleeves", "Vantage Playmats")
 * used purely to visualise the ad slots during development. They are not real
 * advertisers and imply no affiliation. Set `DEMO_ADS = false` (or remove the
 * spreads at the call sites) before wiring a real ad network / shipping.
 */
export const DEMO_ADS = true;

const BASE = import.meta.env.BASE_URL;

export const EXAMPLE_ADS = {
  /** Lower-right unit during a draft — 300x250 medium rectangle (muted video). */
  draftVideo: {
    videoSrc: `${BASE}ads/ad.mp4`,
  },
  /** Banner below the four-up set grid. Responsive: up to a 970x250 billboard on
   *  wide viewports, stepping down to a 728x90 leaderboard, then 320x100. */
  academyLeaderboard: {
    href: 'https://example.com',
    sizes: [
      { minViewport: 1000, w: 970, h: 250, imageSrc: `${BASE}ads/example-ad-billboard.png` },
      { minViewport: 760, w: 728, h: 90, imageSrc: `${BASE}ads/example-ad-leaderboard.png` },
      { minViewport: 0, w: 320, h: 100, imageSrc: `${BASE}ads/example-ad-leaderboard.png` },
    ],
  },
} as const;
