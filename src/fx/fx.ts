import { atmosphere, type Mood } from './atmosphere';

/**
 * Thin facade over the atmosphere particle layer, so call sites don't depend on
 * the implementation. (The heavy 3D engine has been replaced with a light
 * canvas system, so this no longer needs lazy loading.)
 */
export const fx = {
  init: (canvas: HTMLCanvasElement) => atmosphere.init(canvas),
  setMood: (mood: Mood) => atmosphere.setMood(mood),
  burst: (opts?: { count?: number; gold?: boolean }) => atmosphere.burst(opts),
  packFlare: () => atmosphere.packFlare(),
};

export type { Mood };
