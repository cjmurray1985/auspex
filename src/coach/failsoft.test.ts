import { describe, it, expect } from 'vitest';
import type { DraftCard, RatedCard } from '../types';
import { buildRatings } from '../data/ratings';
import { EvaluationEngine } from './evaluation';
import { WinRateProvider, PickOrderProvider } from './providers/seventeenlands';
import { HeuristicProvider } from './providers/heuristic';

/**
 * DA-103 · Fail-soft cache audit
 * Proves the engine still yields a full grade when 17lands / Scryfall data is
 * unavailable (offline / blocked): sources degrade WinRate → PickOrder →
 * Heuristic, and nothing throws.
 */

function card(over: Partial<DraftCard> = {}): DraftCard {
  return {
    id: 'c1',
    collectorNumber: '1',
    name: 'Test Bear',
    manaCost: '{1}{G}',
    cmc: 2,
    colors: ['G'],
    colorIdentity: ['G'],
    rarity: 'common',
    typeLine: 'Creature — Bear',
    oracleText: '',
    imageNormal: '',
    imageLarge: '',
    keywords: [],
    creatureTypes: ['Bear'],
    power: '2',
    toughness: '2',
    ...over,
  };
}

describe('fail-soft ratings (DA-103)', () => {
  it('degrades every card to a heuristic rating when 17lands data is unavailable', () => {
    const cards = [card({ id: 'a', name: 'A' }), card({ id: 'b', name: 'B', rarity: 'mythic' })];
    const rated = buildRatings(cards, new Map()); // empty map = fetch failed / offline

    expect(rated).toHaveLength(2);
    for (const c of rated) {
      expect(c.rating.source).toBe('heuristic');
      expect(Number.isFinite(c.rating.score)).toBe(true);
      expect(c.rating.score).toBeGreaterThanOrEqual(0);
      expect(c.rating.score).toBeLessThanOrEqual(10);
      expect(c.rating.grade.length).toBeGreaterThan(0);
    }
  });

  it('still produces a consensus power + confidence band with a heuristic-only pool', () => {
    const rated = buildRatings([card()], new Map());
    const engine = new EvaluationEngine();
    engine.calibrate(rated);

    const evaluation = engine.evaluate(rated[0]);
    expect(Number.isFinite(evaluation.power)).toBe(true);
    expect(['low', 'medium', 'high']).toContain(evaluation.confidence);
    // At least the heuristic floor must contribute, so grading never crashes.
    expect(evaluation.opinions.some((o) => o.value != null)).toBe(true);
  });
});

describe('provider fallback chain (DA-103)', () => {
  const wr = new WinRateProvider();
  const po = new PickOrderProvider();
  const heur = new HeuristicProvider();

  it('WinRate speaks only with a real win rate', () => {
    const withWinRate: RatedCard = {
      ...card(),
      rating: { gihwr: 0.58, gihSamples: 5000, alsa: 3.2, score: 6, grade: 'B', source: 'winrate' },
    };
    expect(wr.evaluate(withWinRate).value).not.toBeNull();
  });

  it('falls through to PickOrder when only ALSA exists', () => {
    const alsaOnly: RatedCard = {
      ...card(),
      rating: { alsa: 4.1, score: 5, grade: 'C', source: 'alsa' },
    };
    expect(wr.evaluate(alsaOnly).value).toBeNull();
    expect(po.evaluate(alsaOnly).value).not.toBeNull();
  });

  it('falls through to Heuristic when nothing else has data', () => {
    const heuristicOnly: RatedCard = {
      ...card(),
      rating: { score: 4.2, grade: 'C', source: 'heuristic' },
    };
    expect(wr.evaluate(heuristicOnly).value).toBeNull();
    expect(po.evaluate(heuristicOnly).value).toBeNull();
    expect(heur.evaluate(heuristicOnly).value).not.toBeNull();
  });
});
