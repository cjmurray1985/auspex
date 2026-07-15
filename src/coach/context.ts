import type { PickRecord, RatedCard } from '../types';
import { PACK_SIZE } from '../engine/pack';
import type { DraftContext } from './types';
import type { EvaluationEngine } from './evaluation';

export const COLORS = ['W', 'U', 'B', 'R', 'G'] as const;
export const COLOR_NAMES: Record<string, string> = {
  W: 'White',
  U: 'Blue',
  B: 'Black',
  R: 'Red',
  G: 'Green',
};
const WUBRG = ['W', 'U', 'B', 'R', 'G'];

/** Power-weighted color affinity of a pool (colorless cards contribute nothing). */
export function poolAffinity(pool: RatedCard[], engine: EvaluationEngine): Record<string, number> {
  const aff: Record<string, number> = { W: 0, U: 0, B: 0, R: 0, G: 0 };
  for (const c of pool) {
    if (!c.colors.length) continue;
    const power = engine.evaluate(c).power;
    for (const col of c.colors) if (col in aff) aff[col] += power / c.colors.length;
  }
  return aff;
}

/** Two-color archetype label from a color list, in WUBRG order. */
export function archetypeName(colors: string[]): string {
  const ordered = WUBRG.filter((c) => colors.includes(c));
  if (!ordered.length) return 'Colorless';
  return ordered.map((c) => COLOR_NAMES[c]).join('-');
}

export function canonicalPair(colors: string[]): string {
  return WUBRG.filter((c) => colors.includes(c)).join('');
}

function leadingColors(aff: Record<string, number>): string[] {
  return [...COLORS].filter((c) => aff[c] > 0).sort((a, b) => aff[b] - aff[a]);
}

/**
 * Reconstruct the drafter's situation at each pick — the information they
 * actually had. This is the backbone of decision-quality grading: every pick is
 * judged against this snapshot, never against hindsight about the final deck.
 */
export function reconstructContexts(
  picks: PickRecord[],
  engine: EvaluationEngine,
): DraftContext[] {
  const contexts: DraftContext[] = [];
  const openness: Record<string, number> = { W: 0, U: 0, B: 0, R: 0, G: 0 };
  const pool: RatedCard[] = [];

  picks.forEach((p, index) => {
    const pickInPack = (p.pickNumber - 1) % PACK_SIZE;

    // Read the pack in front of us for open colors: strong cards surviving late
    // is evidence that color is under-drafted upstream (the same logic our bots
    // use, applied to the human's seen packs).
    const lateness = (pickInPack + 1) / PACK_SIZE;
    for (const card of p.pack) {
      if (!card.colors.length) continue;
      const surprise = Math.max(0, engine.evaluate(card).power - 5.2) * lateness;
      if (surprise <= 0) continue;
      for (const c of card.colors) if (c in openness) openness[c] += surprise / card.colors.length;
    }

    const aff = poolAffinity(pool, engine);
    const ordered = leadingColors(aff);
    const pairMass = (aff[ordered[0]] ?? 0) + (aff[ordered[1]] ?? 0);
    const offMass = ordered.slice(2).reduce((a, c) => a + aff[c], 0);
    const commitmentLevel = pairMass > 0 ? pairMass / (pairMass + offMass + 9) : 0;

    const committedColors =
      commitmentLevel > 0.3 ? ordered.slice(0, 2) : commitmentLevel > 0.16 ? ordered.slice(0, 1) : [];

    // Openness normalised: a color is "open" if it stands out from the field.
    const opVals = COLORS.map((c) => openness[c]);
    const opMean = opVals.reduce((a, b) => a + b, 0) / 5;
    const opSd =
      Math.sqrt(opVals.reduce((a, b) => a + (b - opMean) ** 2, 0) / 5) || 0.001;
    const openRanked = [...COLORS].sort((a, b) => openness[b] - openness[a]);
    const openColors = openRanked
      .slice(0, 2)
      .filter((c) => openness[c] > opMean + 0.6 * opSd && openness[c] > 1.5);

    contexts.push({
      index,
      packNumber: p.packNumber,
      pickNumber: p.pickNumber,
      poolBefore: [...pool],
      colorAffinity: { ...aff },
      committedColors,
      commitmentLevel,
      openness: { ...openness },
      openColors,
      wheeled: pickInPack >= 8,
    });

    pool.push(p.picked);
  });

  return contexts;
}
