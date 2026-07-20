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
  /** Lower-right unit during a draft. */
  draftVideo: {
    imageSrc: `${BASE}ads/example-ad-video.png`,
    href: 'https://example.com',
  },
  /** Banner below the four-up set grid on the Academy landing. */
  academyLeaderboard: {
    imageSrc: `${BASE}ads/example-ad-leaderboard.png`,
    href: 'https://example.com',
  },
} as const;
