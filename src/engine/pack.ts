import type { RatedCard, Rarity } from '../types';

export const PACK_SIZE = 14;
export const NUM_SEATS = 8;
export const NUM_PACKS = 3;

/**
 * Arena-style play booster approximation: 9 commons, 3 uncommons,
 * 1 rare (1-in-7 upgraded to mythic), 1 wildcard of any rarity.
 */
const WILDCARD_WEIGHTS: Array<[Rarity, number]> = [
  ['common', 0.42],
  ['uncommon', 0.42],
  ['rare', 0.13],
  ['mythic', 0.03],
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickWildcardRarity(): Rarity {
  let roll = Math.random();
  for (const [rarity, w] of WILDCARD_WEIGHTS) {
    roll -= w;
    if (roll <= 0) return rarity;
  }
  return 'common';
}

export function generatePack(cards: RatedCard[]): RatedCard[] {
  const byRarity: Record<Rarity, RatedCard[]> = {
    common: [],
    uncommon: [],
    rare: [],
    mythic: [],
  };
  for (const c of cards) byRarity[c.rarity].push(c);

  const used = new Set<string>();
  const take = (rarity: Rarity): RatedCard | null => {
    const pool = byRarity[rarity].filter((c) => !used.has(c.id));
    if (!pool.length) return null;
    const card = pool[Math.floor(Math.random() * pool.length)];
    used.add(card.id);
    return card;
  };

  const pack: RatedCard[] = [];
  const rareSlot = take(Math.random() < 1 / 7 ? 'mythic' : 'rare') ?? take('rare');
  if (rareSlot) pack.push(rareSlot);
  for (let i = 0; i < 3; i++) {
    const c = take('uncommon');
    if (c) pack.push(c);
  }
  for (let i = 0; i < 9; i++) {
    const c = take('common');
    if (c) pack.push(c);
  }
  const wc = take(pickWildcardRarity()) ?? take('common');
  if (wc) pack.push(wc);

  // Each dealt copy gets its own identity — the same card can exist in
  // several packs across the pod.
  return pack.map((c) => ({ ...c, instanceId: `${c.id}:${Math.random().toString(36).slice(2, 9)}` }));
}

export function generateAllPacks(cards: RatedCard[]): RatedCard[][][] {
  // packs[round][seat] = pack
  const rounds: RatedCard[][][] = [];
  for (let r = 0; r < NUM_PACKS; r++) {
    const seatPacks: RatedCard[][] = [];
    for (let s = 0; s < NUM_SEATS; s++) seatPacks.push(shuffle(generatePack(cards)));
    rounds.push(seatPacks);
  }
  return rounds;
}
