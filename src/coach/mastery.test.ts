import { describe, it, expect } from 'vitest';
import type { CategoryKey, DraftRecord, PickTier } from './types';
import type { RatedCard } from '../types';
import { evaluateSetAchievements } from '../data/achievements';
import { setMastery } from './mastery';

function card(name: string, over: Partial<RatedCard> = {}): RatedCard {
  return {
    id: name,
    collectorNumber: '1',
    name,
    manaCost: '{1}',
    cmc: 2,
    colors: [],
    colorIdentity: [],
    rarity: 'common',
    typeLine: 'Creature',
    oracleText: '',
    imageNormal: '',
    imageLarge: '',
    keywords: [],
    creatureTypes: [],
    rating: { score: 5, grade: 'C', source: 'heuristic' },
    ...over,
  };
}

function rec(over: Partial<DraftRecord>): DraftRecord {
  return {
    id: Math.random().toString(36).slice(2),
    date: new Date().toISOString(),
    set: 'MSH',
    overall: 70,
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

describe('set achievements (deck predicates)', () => {
  it('awards Fantastic Four when all four are drafted', () => {
    const pool = [
      card('Mister Fantastic, Reed Richards'),
      card('Invisible Woman, Sue Storm'),
      card('Human Torch, Johnny Storm'),
      card('The Thing, Ben Grimm'),
    ];
    expect(evaluateSetAchievements('MSH', pool, 70)).toContain('msh-ff');
  });

  it('does not award Fantastic Four with only some members', () => {
    const pool = [card('Mister Fantastic, Reed Richards'), card('The Thing, Ben Grimm')];
    expect(evaluateSetAchievements('MSH', pool, 70)).not.toContain('msh-ff');
  });

  it('awards the ace grade goal at 85+ only', () => {
    expect(evaluateSetAchievements('MSH', [], 85)).toContain('msh-ace');
    expect(evaluateSetAchievements('MSH', [], 84)).not.toContain('msh-ace');
  });

  it('awards OTJ Most Wanted for one outlaw of each type', () => {
    const pool = [
      card('a', { creatureTypes: ['Assassin'] }),
      card('b', { creatureTypes: ['Mercenary'] }),
      card('c', { creatureTypes: ['Pirate'] }),
      card('d', { creatureTypes: ['Rogue'] }),
      card('e', { creatureTypes: ['Warlock'] }),
    ];
    expect(evaluateSetAchievements('OTJ', pool, 60)).toContain('otj-mostwanted');
  });
});

describe('setMastery aggregation', () => {
  const records = [
    rec({ set: 'MSH', earnedAchievements: ['msh-ff', 'msh-ace'] }),
    rec({ set: 'ECL', earnedAchievements: ['ecl-faeries'] }),
  ];

  it('unions per-draft achievements and evaluates history ones, scoped to the set', () => {
    const m = setMastery(records, 'MSH');
    expect(m.achievements.find((a) => a.id === 'msh-ff')?.earned).toBe(true);
    // debut is a history achievement → earned because there is >=1 MSH draft
    expect(m.achievements.find((a) => a.id === 'msh-debut')?.earned).toBe(true);
    // another set's achievement never appears under MSH
    expect(m.achievements.some((a) => a.id === 'ecl-faeries')).toBe(false);
    expect(m.achievementsEarned).toBeGreaterThanOrEqual(3); // ff + ace + debut
    expect(m.pct).toBeGreaterThan(0);
  });

  it('keeps sets independent', () => {
    const ecl = setMastery(records, 'ECL');
    expect(ecl.achievements.find((a) => a.id === 'ecl-faeries')?.earned).toBe(true);
    expect(ecl.achievements.find((a) => a.id === 'msh-ff')).toBeUndefined();
  });
});
