import { describe, it, expect } from 'vitest';
import type { CategoryKey, DraftRecord, PickTier } from './types';
import { computeProfile } from './profile';

/**
 * DA-121 · Rating curve guard
 * Enforces the progression invariant: the Draft Rating tracks decision quality
 * (`overall`) with recency weighting, and can never be moved by deck outcome.
 */

function rec(overall: number, over: Partial<DraftRecord> = {}): DraftRecord {
  return {
    id: Math.random().toString(36).slice(2),
    date: new Date().toISOString(),
    set: 'MSH',
    overall,
    letter: 'C',
    confidence: 'medium',
    archetype: 'UR',
    colors: 'UR',
    categories: {} as Record<CategoryKey, number>,
    tierCounts: { best: 0, strong: 0, acceptable: 0, weak: 0, mistake: 0 } as Record<PickTier, number>,
    momentKinds: [],
    flags: [],
    bestRecovery: 0,
    ...over,
  };
}

describe('Draft Rating recency weighting (DA-121)', () => {
  it('applies the documented EWMA (alpha=0.3, scale=25)', () => {
    // Steady 50s then a strong 90: rating = 0.3*(90*25) + 0.7*(50*25).
    const { rating } = computeProfile([rec(50), rec(50), rec(50), rec(90)]);
    const expected = Math.round(0.3 * (90 * 25) + 0.7 * 1250);
    expect(rating).toBe(expected);
  });

  it('weights the most recent draft by alpha', () => {
    const base = [rec(50), rec(50), rec(50)];
    const up = computeProfile([...base, rec(90)]).rating;
    const down = computeProfile([...base, rec(30)]).rating;
    expect(up).toBeGreaterThan(down);
    // The latest draft alone shifts the rating by exactly alpha * delta * scale.
    expect(up - down).toBe(Math.round(0.3 * (90 - 30) * 25));
  });
});

describe('improvement over outcome (DA-121)', () => {
  it('RISES on a cold deck drafted with great decisions', () => {
    // "Cold deck": whatever the deck did, the decisions were strong & improving.
    const cold = computeProfile([rec(60), rec(72), rec(84), rec(92)]);
    expect(cold.rating).toBeGreaterThan(computeProfile([rec(60)]).rating);
    expect(cold.ratingDelta).toBeGreaterThan(0);
  });

  it('STALLS on a hot deck drafted with poor decisions', () => {
    // "Hot deck": imagine it won every game — decision quality is still low,
    // so the rating stays low and does not climb.
    const hot = computeProfile([rec(42), rec(41), rec(43), rec(42)]);
    expect(hot.rating).toBeLessThan(1200); // ~42*25 neighborhood, never near a high rank
    expect(Math.abs(hot.ratingDelta)).toBeLessThan(60); // essentially flat
  });

  it('is a pure function of decision quality — outcome-adjacent fields are ignored', () => {
    // Identical `overall`, wildly different everything-else → identical rating.
    const a = [rec(70, { colors: 'WU', archetype: 'Fliers', archetypeWinRate: 0.61, bestRecovery: 40, tierCounts: { best: 9, strong: 3, acceptable: 1, weak: 0, mistake: 0 } as Record<PickTier, number> })];
    const b = [rec(70, { colors: 'BR', archetype: 'Sacrifice', archetypeWinRate: 0.39, bestRecovery: 0, tierCounts: { best: 0, strong: 1, acceptable: 4, weak: 6, mistake: 3 } as Record<PickTier, number> })];
    expect(computeProfile(a).rating).toBe(computeProfile(b).rating);
  });
});
