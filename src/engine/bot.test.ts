import { describe, it, expect } from 'vitest';
import type { RatedCard, Rarity } from '../types';
import { botPick, createBot, type Persona } from './bot';

/** Minimal RatedCard factory for pick tests. */
function card(
  name: string,
  opts: Partial<RatedCard> & { score?: number; rarity?: Rarity } = {},
): RatedCard {
  const { score = 5, rarity = 'common', ...rest } = opts;
  return {
    id: name,
    instanceId: name,
    collectorNumber: '1',
    name,
    manaCost: '{1}',
    cmc: 2,
    colors: [],
    colorIdentity: [],
    rarity,
    typeLine: 'Creature',
    oracleText: '',
    imageNormal: '',
    imageLarge: '',
    keywords: [],
    creatureTypes: [],
    rating: { score, grade: 'C', source: 'winrate' },
    ...rest,
  };
}

/** A maximally skilled power drafter (seat 0 → seeded W/U) with no noise. Under
 *  the OLD model this seat ignored rarity and would pass an off-color rare. It
 *  is intentionally NOT `forced`, so commitment ramps with picks (low early). */
function skilledPower(): Persona {
  return {
    rank: 'Mythic',
    skill: 0.95,
    style: 'power',
    styleLabel: 'Power Drafter',
    noise: 0,
    blunderProb: 0,
    signalWeight: 0,
    synergyWeight: 0,
    raredraftBias: 1.0,
    onColorMag: 4,
  };
}

describe('bot alignment with MTGA rare-drafting', () => {
  it('takes an off-color rare over on-color commons early (packs 1-2)', () => {
    const persona = skilledPower();
    // Run many trials; the off-color rare should be the dominant early pick.
    let rarePicks = 0;
    const trials = 200;
    for (let i = 0; i < trials; i++) {
      const bot = createBot(persona, 0);
      const pack = [
        card('Off-color Rare', { rarity: 'rare', score: 5, colors: ['R'] }),
        card('On-color Common A', { rarity: 'common', score: 6, colors: ['W'] }),
        card('On-color Common B', { rarity: 'common', score: 6, colors: ['U'] }),
      ];
      // picksMade = 1 → early, low commitment
      const pick = botPick(bot, pack, 1);
      if (pick.name === 'Off-color Rare') rarePicks++;
    }
    // Under the fixed alignment this should be the overwhelming majority.
    expect(rarePicks / trials).toBeGreaterThan(0.9);
  });

  it('does not let a nonbasic dual land wheel behind vanilla commons', () => {
    const persona = skilledPower();
    let landPicks = 0;
    const trials = 200;
    for (let i = 0; i < trials; i++) {
      const bot = createBot(persona, 0);
      const pack = [
        card('WU Dual Land', {
          rarity: 'common',
          score: 4,
          typeLine: 'Land',
          producedMana: ['W', 'U'],
        }),
        card('Filler Common', { rarity: 'common', score: 4.2, colors: ['W'] }),
      ];
      const pick = botPick(bot, pack, 5);
      if (pick.name === 'WU Dual Land') landPicks++;
    }
    // On-color fixing should be competitive with equally-rated filler.
    expect(landPicks / trials).toBeGreaterThan(0.5);
  });
});
