import type { ColorPairRating, RatedCard } from '../types';
import type { BranchPoint, BranchProjection, DecisionEval } from './types';
import type { EvaluationEngine } from './evaluation';
import { archetypeName, canonicalPair, COLORS, poolAffinity } from './context';
import { playablesIn, projectQuality } from './deck';
import { getExplainer } from './narrate';

const REMOVAL_RE = /destroy target|exile target|deals? \d+ damage to (any target|target creature)|fight/i;

/** Seed a two-color lane from a card, filling the second color from pool support. */
function laneColors(card: RatedCard, poolAff: Record<string, number>): string[] {
  const cols = card.colors.filter((c) => COLORS.includes(c as (typeof COLORS)[number]));
  if (cols.length >= 2) return cols.slice(0, 2);
  if (cols.length === 1) {
    const partner = [...COLORS].filter((c) => c !== cols[0]).sort((a, b) => poolAff[b] - poolAff[a])[0];
    return [cols[0], partner];
  }
  return [...COLORS].sort((a, b) => poolAff[b] - poolAff[a]).slice(0, 2);
}

function differentLane(a: RatedCard, b: RatedCard): boolean {
  const sa = new Set(a.colors);
  const sb = new Set(b.colors);
  if (!a.colors.length || !b.colors.length) return false;
  return a.colors.some((c) => !sb.has(c)) || b.colors.some((c) => !sa.has(c));
}

function projectionFor(
  colors: string[],
  pool: RatedCard[],
  engine: EvaluationEngine,
  colorRatings: ColorPairRating[],
  label: string,
): BranchProjection {
  const spells = playablesIn(pool, colors, engine);
  const removal = spells.filter((c) => REMOVAL_RE.test(c.oracleText)).length;
  const creatures = spells.filter((c) => c.typeLine.includes('Creature')).length;
  const quality = projectQuality(pool, colors, engine, colorRatings);
  const pair = canonicalPair(colors.slice(0, 2));
  const winRate = colorRatings.find((r) => canonicalPair(r.colors.split('')) === pair)?.winRate;

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  if (spells.length >= 23) strengths.push(`${spells.length} playables — plenty deep`);
  else weaknesses.push(`only ${spells.length} playables in the pool`);
  if (removal >= 3) strengths.push(`${removal} removal spells`);
  else weaknesses.push(`thin on removal (${removal})`);
  if (creatures >= 15) strengths.push(`${creatures} creatures`);

  return { label, colors, archetype: archetypeName(colors), quality, winRate, strengths, weaknesses };
}

/**
 * Branch analysis. Rather than a brute-force decision tree, we surface only the
 * genuine forks: picks where a real alternative pointed at a different archetype.
 * Each fork projects both lanes against the pool you ultimately saw, so you can
 * see where the draft could have gone.
 */
export function buildBranches(
  decisions: DecisionEval[],
  finalPool: RatedCard[],
  colorRatings: ColorPairRating[],
  engine: EvaluationEngine,
): BranchPoint[] {
  const poolAff = poolAffinity(finalPool, engine);
  const forks = decisions
    .filter((d) => d.context.index < 22)
    .map((d) => {
      const picked = d.picked;
      const alt = d.alternatives.find(
        (a) => a.card.id !== picked.card.id && differentLane(a.card, picked.card) && a.contextValue >= 4,
      );
      if (!alt) return null;
      if (d.best.contextValue - alt.contextValue > 2) return null; // alt not credible
      const earliness = 1 - Math.min(1, d.context.index / 24);
      const divergence = Math.abs(alt.contextValue - picked.contextValue) < 1.5 ? 1 : 0.6;
      const forkScore = alt.contextValue * (0.4 + earliness * 0.6) * divergence;
      return { d, alt, forkScore };
    })
    .filter((x): x is { d: DecisionEval; alt: DecisionEval['alternatives'][number]; forkScore: number } => !!x)
    .sort((a, b) => b.forkScore - a.forkScore);

  // Keep the strongest, well-separated forks.
  const kept: typeof forks = [];
  for (const f of forks) {
    if (kept.some((k) => Math.abs(k.d.context.index - f.d.context.index) < 3)) continue;
    kept.push(f);
    if (kept.length >= 3) break;
  }
  kept.sort((a, b) => a.d.context.index - b.d.context.index);

  return kept.map((f) => {
    const chosenColors = laneColors(f.d.picked.card, poolAff);
    const altColors = laneColors(f.alt.card, poolAff);
    const chosen = {
      ...projectionFor(chosenColors, finalPool, engine, colorRatings, 'Your pick'),
      card: f.d.picked.card,
    };
    const alternative = {
      ...projectionFor(altColors, finalPool, engine, colorRatings, 'The other line'),
      card: f.alt.card,
    };
    const branch: BranchPoint = {
      packNumber: f.d.context.packNumber,
      pickNumber: f.d.context.pickNumber,
      decisionIndex: f.d.context.index,
      chosen,
      alternative,
      narrative: '',
    };
    branch.narrative = getExplainer().branch(branch);
    return branch;
  });
}
