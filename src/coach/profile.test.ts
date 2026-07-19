import { describe, it, expect } from 'vitest';
import type { CategoryKey, DraftRecord, HabitFlag, PickTier } from './types';
import { computeProfile, FLAG_DIM, rankAtRating } from './profile';

function cats(v: number): Record<CategoryKey, number> {
  return {
    'card-eval': v,
    'staying-open': v,
    'signal-reading': v,
    'archetype-commitment': v,
    'deck-cohesion': v,
    'opportunity-cost': v,
    'pick-efficiency': v,
  };
}

function dimOf(goalId: string): string {
  const key = goalId.replace(/^goal-/, '');
  return (FLAG_DIM as Record<string, string>)[key] ?? key;
}

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

describe('rankAtRating (DA-141)', () => {
  it('maps ratings to the right rank thresholds', () => {
    expect(rankAtRating(0).name).toBe('Novice');
    expect(rankAtRating(999).name).toBe('Novice');
    expect(rankAtRating(1000).name).toBe('Apprentice');
    expect(rankAtRating(2300).name).toBe('Master Drafter');
    expect(rankAtRating(2449).name).toBe('Master Drafter');
    expect(rankAtRating(2450).name).toBe('Oracle');
    expect(rankAtRating(9999).name).toBe('Oracle');
  });

  it('detects a rank-up as a threshold crossing', () => {
    // 975 -> 1050 crosses the Apprentice threshold (1000): a real rank-up.
    expect(rankAtRating(1050).min).toBeGreaterThan(rankAtRating(975).min);
    // 1050 -> 1100 stays in the same rank: not a rank-up.
    expect(rankAtRating(1100).min).toBe(rankAtRating(1050).min);
  });
});

describe('habit → weekly goal mapping (DA-122)', () => {
  it('maps every HabitFlag to a dimension (no orphan habits)', () => {
    const flags = Object.keys(FLAG_DIM) as HabitFlag[];
    expect(flags).toHaveLength(10);
    for (const flag of flags) expect(FLAG_DIM[flag]).toBeTruthy();
  });

  it('gives each goal a clear completion condition', () => {
    const records = Array.from({ length: 4 }, () =>
      rec(55, { flags: ['missed-signals'], categories: cats(50) }),
    );
    const { goals } = computeProfile(records);
    expect(goals.length).toBeGreaterThan(0);
    for (const g of goals) {
      expect(typeof g.targetScore).toBe('number');
      expect(typeof g.currentScore).toBe('number');
      expect(g.met).toBe(g.currentScore >= g.targetScore);
    }
  });

  it('does not double-count two habits that target the same dimension', () => {
    // power-over-fit and card-eval-slips both target 'card-eval'.
    const records = Array.from({ length: 4 }, () =>
      rec(50, { flags: ['power-over-fit', 'card-eval-slips'], categories: cats(45) }),
    );
    const { goals } = computeProfile(records);
    const ids = goals.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length); // ids unique

    const dims = goals.map((g) => dimOf(g.id));
    expect(new Set(dims).size).toBe(dims.length); // no dimension targeted twice
    expect(dims.filter((d) => d === 'card-eval').length).toBeLessThanOrEqual(1);
  });
});

describe('calibration + divisions (PRE-49 follow-up)', () => {
  it('withholds a rank until three drafts are complete', () => {
    const p1 = computeProfile([rec(80)]);
    expect(p1.calibrating).toBe(true);
    expect(p1.calibrationRemaining).toBe(2);
    expect(p1.rankLabel).toBe('Calibrating');

    const p2 = computeProfile([rec(80), rec(80)]);
    expect(p2.calibrating).toBe(true);
    expect(p2.calibrationRemaining).toBe(1);

    const p3 = computeProfile([rec(80), rec(80), rec(80)]);
    expect(p3.calibrating).toBe(false);
    expect(p3.calibrationRemaining).toBe(0);
    expect(p3.rankLabel).not.toBe('Calibrating');
  });

  it('places on the average of the first three, not a single hot draft', () => {
    // A 95 then two mediocre drafts → placement on the average, not the spike.
    const p = computeProfile([rec(95), rec(60), rec(55)]);
    expect(p.rating).toBe(1750); // (95+60+55)/3 * 25
    expect(p.rank.name).toBe('Sharpshooter'); // not Expert off the lone 95
  });

  it('assigns within-rank divisions so there is always a next step', () => {
    const p = computeProfile([rec(80), rec(80), rec(80)]); // 2000 → Expert, band floor
    expect(p.rating).toBe(2000);
    expect(p.rankDivision).toBe(4);
    expect(p.rankLabel).toBe('Expert IV');
  });

  it('has an apex rank above Master Drafter', () => {
    expect(rankAtRating(2450).name).toBe('Oracle');
    expect(rankAtRating(2450).min).toBeGreaterThan(rankAtRating(2300).min);
  });
});
