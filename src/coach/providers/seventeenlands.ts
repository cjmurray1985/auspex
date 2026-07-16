import type { RatedCard } from '../../types';
import type { SourceOpinion } from '../types';
import { computeSetStats, type EvalProvider, type SetStats } from './types';

const zToScore = (z: number) => Math.max(0, Math.min(10, 5 + z * 1.9));

// Data-maturity band for win-rate confidence. A card that just cleared 17lands'
// 500-game floor has a much noisier win rate than one with thousands of games
// (typical early in a set's life). We ramp confidence with sample count so thin,
// early-set data speaks more tentatively — which flows through the consensus
// into decision.ts's contested / not-penalized logic.
const GIH_FLOOR = 500;
const GIH_SETTLED = 2000;
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/**
 * Games-in-hand win rate — the community-standard measure of raw card quality.
 * Only speaks for cards that cleared 17lands' sample floor, and speaks with high
 * confidence when it does.
 */
export class WinRateProvider implements EvalProvider {
  id = 'winrate';
  private stats: SetStats = { gihMean: 0.55, gihSd: 0.04, alsaSlope: -0.55, alsaIntercept: 8 };

  calibrate(pool: RatedCard[]): void {
    this.stats = computeSetStats(pool);
  }

  evaluate(card: RatedCard): SourceOpinion {
    const gih = card.rating.gihwr;
    if (gih == null || card.rating.source !== 'winrate') {
      return { source: 'winrate', label: '17lands win rate', value: null, confidence: 0, note: 'Below sample floor' };
    }
    const z = (gih - this.stats.gihMean) / this.stats.gihSd;
    // Ramp confidence 0.55 (just cleared the floor) → 0.9 (settled sample).
    const samples = card.rating.gihSamples ?? GIH_FLOOR;
    const maturity = clamp01((samples - GIH_FLOOR) / (GIH_SETTLED - GIH_FLOOR));
    const confidence = 0.55 + 0.35 * maturity;
    const thin = maturity < 1 ? ` · ${samples.toLocaleString()} games (early-set)` : '';
    return {
      source: 'winrate',
      label: '17lands win rate',
      value: zToScore(z),
      confidence,
      note: `${(gih * 100).toFixed(1)}% games-in-hand win rate${thin}`,
    };
  }
}

/**
 * ALSA (average last seen at) — a proxy for the community/professional consensus
 * pick order. Where a live win rate is missing, how early the field takes a card
 * is a real, if noisier, signal. Medium confidence.
 */
export class PickOrderProvider implements EvalProvider {
  id = 'pickorder';
  private stats: SetStats = { gihMean: 0.55, gihSd: 0.04, alsaSlope: -0.55, alsaIntercept: 8 };

  calibrate(pool: RatedCard[]): void {
    this.stats = computeSetStats(pool);
  }

  evaluate(card: RatedCard): SourceOpinion {
    const alsa = card.rating.alsa;
    if (alsa == null) {
      return { source: 'pickorder', label: 'Community pick order', value: null, confidence: 0, note: 'No pick data' };
    }
    const value = Math.max(0, Math.min(10, this.stats.alsaSlope * alsa + this.stats.alsaIntercept));
    // Cards seen very early (low ALSA) are a stronger signal than late ones.
    const confidence = card.rating.source === 'winrate' ? 0.45 : 0.58;
    return {
      source: 'pickorder',
      label: 'Community pick order',
      value,
      confidence,
      note: `Last seen around pick ${alsa.toFixed(1)} on average`,
    };
  }
}
