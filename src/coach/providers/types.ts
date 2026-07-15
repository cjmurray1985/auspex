import type { RatedCard } from '../../types';
import type { SourceOpinion } from '../types';

/**
 * A data provider turns a card (plus set-wide calibration) into a single
 * opinion about its power, with a confidence. New sources — professional pick
 * orders, set-review grades, an internal simulation, a future API — implement
 * this interface and get combined by the evaluation registry. No provider ever
 * decides the "correct" pick; each just contributes evidence.
 */
export interface EvalProvider {
  id: string;
  /** Called once per set with the full pool so the provider can calibrate. */
  calibrate(pool: RatedCard[]): void;
  /** Opinion for one card, or null value inside the opinion if it has nothing. */
  evaluate(card: RatedCard): SourceOpinion;
}

/** Set-wide GIH win-rate distribution, shared by providers. */
export interface SetStats {
  gihMean: number;
  gihSd: number;
  /** Linear fit of power-on-ALSA for the pick-order provider. */
  alsaSlope: number;
  alsaIntercept: number;
}

export function computeSetStats(pool: RatedCard[]): SetStats {
  const gihs: number[] = [];
  for (const c of pool) if (c.rating.gihwr != null) gihs.push(c.rating.gihwr);
  const gihMean = gihs.length ? gihs.reduce((a, b) => a + b, 0) / gihs.length : 0.55;
  const gihSd =
    gihs.length > 5
      ? Math.sqrt(gihs.reduce((a, b) => a + (b - gihMean) ** 2, 0) / gihs.length)
      : 0.04;

  // Fit score ~ ALSA using cards that have both a win-rate score and an ALSA.
  const zToScore = (z: number) => Math.max(0, Math.min(10, 5 + z * 1.9));
  const pairs: Array<[number, number]> = [];
  for (const c of pool) {
    if (c.rating.gihwr != null && c.rating.alsa != null) {
      pairs.push([c.rating.alsa, zToScore((c.rating.gihwr - gihMean) / gihSd)]);
    }
  }
  let alsaSlope = -0.55;
  let alsaIntercept = 8.0;
  if (pairs.length >= 10) {
    const mx = pairs.reduce((a, [x]) => a + x, 0) / pairs.length;
    const my = pairs.reduce((a, [, y]) => a + y, 0) / pairs.length;
    const num = pairs.reduce((a, [x, y]) => a + (x - mx) * (y - my), 0);
    const den = pairs.reduce((a, [x]) => a + (x - mx) ** 2, 0);
    if (den > 0) {
      alsaSlope = num / den;
      alsaIntercept = my - alsaSlope * mx;
    }
  }
  return { gihMean, gihSd, alsaSlope, alsaIntercept };
}
