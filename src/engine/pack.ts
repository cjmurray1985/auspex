import type { RatedCard, Rarity } from '../types';

export const PACK_SIZE = 14;
export const NUM_SEATS = 8;
export const NUM_PACKS = 3;

/**
 * MTG Arena Play Booster (post–Murders at Karlov Manor) limited pack — the
 * 14 playable cards an Arena drafter actually sees:
 *
 *   slots 1–7   : 7 commons     (non-land)
 *   slots 8–10  : 3 uncommons   (non-land)
 *   slot 11     : 1 rare/mythic (12.5% mythic)
 *   slot 12     : 1 land slot   (one non-basic land, weighted toward commons)
 *   slots 13–14 : 2 wildcards   (any rarity — Arena has no foils, so paper's
 *                                foil slot becomes a second non-foil wildcard)
 *
 * Basic lands are excluded upstream (`scryfall.ts`), so every land in the pool
 * is a non-basic. Lands reach a pack ONLY through the land slot, the rare slot,
 * or a wildcard — never the fixed common/uncommon slots — which is why a player
 * no longer opens a fistful of dual lands in one pack.
 */
const NUM_COMMON = 7;
const NUM_UNCOMMON = 3;
const NUM_WILDCARD = 2;

/** The rare slot upgrades to mythic 12.5% of the time (WOTC Play Booster spec). */
const MYTHIC_IN_RARE_SLOT = 0.125;

/**
 * Per-wildcard rarity weights, tuned so a pack averages ~1.4 rares+mythics
 * (1 guaranteed from the rare slot + ~0.2 from each of the two wildcards),
 * matching WOTC's stated Play Booster rate.
 */
const WILDCARD_WEIGHTS: Array<[Rarity, number]> = [
  ['common', 0.6],
  ['uncommon', 0.2],
  ['rare', 0.17],
  ['mythic', 0.03],
];

/** Land slot: usually a common land, occasionally an upgraded one. */
const LAND_SLOT_WEIGHTS: Array<[Rarity, number]> = [
  ['common', 0.7],
  ['uncommon', 0.22],
  ['rare', 0.07],
  ['mythic', 0.01],
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const isLand = (c: RatedCard): boolean => c.typeLine.includes('Land');

function groupByRarity(cards: RatedCard[]): Record<Rarity, RatedCard[]> {
  const g: Record<Rarity, RatedCard[]> = { common: [], uncommon: [], rare: [], mythic: [] };
  for (const c of cards) g[c.rarity].push(c);
  return g;
}

function pickRarity(weights: Array<[Rarity, number]>): Rarity {
  const total = weights.reduce((s, [, w]) => s + w, 0);
  let roll = Math.random() * total;
  for (const [rarity, w] of weights) {
    roll -= w;
    if (roll <= 0) return rarity;
  }
  return weights[0][0];
}

export function generatePack(cards: RatedCard[]): RatedCard[] {
  const nonlandByRarity = groupByRarity(cards.filter((c) => !isLand(c)));
  const landByRarity = groupByRarity(cards.filter(isLand));
  const allByRarity = groupByRarity(cards);

  const used = new Set<string>();
  const take = (buckets: Record<Rarity, RatedCard[]>, rarity: Rarity): RatedCard | null => {
    const pool = buckets[rarity].filter((c) => !used.has(c.id));
    if (!pool.length) return null;
    const card = pool[Math.floor(Math.random() * pool.length)];
    used.add(card.id);
    return card;
  };

  // Weighted pick that degrades to other rarities if the chosen bucket is empty.
  const takeWeighted = (
    buckets: Record<Rarity, RatedCard[]>,
    weights: Array<[Rarity, number]>,
  ): RatedCard | null => {
    const primary = pickRarity(weights);
    const first = take(buckets, primary);
    if (first) return first;
    for (const [rarity] of weights) {
      if (rarity === primary) continue;
      const alt = take(buckets, rarity);
      if (alt) return alt;
    }
    return null;
  };

  const pack: RatedCard[] = [];

  for (let i = 0; i < NUM_COMMON; i++) {
    const c = take(nonlandByRarity, 'common');
    if (c) pack.push(c);
  }
  for (let i = 0; i < NUM_UNCOMMON; i++) {
    const c = take(nonlandByRarity, 'uncommon');
    if (c) pack.push(c);
  }

  // Rare slot draws from the full pool, so a set's rare lands (shocks, etc.)
  // can legitimately be your rare.
  const rareSlot =
    take(allByRarity, Math.random() < MYTHIC_IN_RARE_SLOT ? 'mythic' : 'rare') ??
    take(allByRarity, 'rare') ??
    take(allByRarity, 'mythic');
  if (rareSlot) pack.push(rareSlot);

  // Land slot: one non-basic land. Sets with no non-basic lands backfill with an
  // extra common (Arena would show a basic here, which is a dead pick to grade).
  const landSlot = takeWeighted(landByRarity, LAND_SLOT_WEIGHTS) ?? take(nonlandByRarity, 'common');
  if (landSlot) pack.push(landSlot);

  for (let i = 0; i < NUM_WILDCARD; i++) {
    const wc = takeWeighted(allByRarity, WILDCARD_WEIGHTS) ?? take(allByRarity, 'common');
    if (wc) pack.push(wc);
  }

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
