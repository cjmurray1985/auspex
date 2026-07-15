import type { ColorPairRating, RatedCard } from '../types';
import type { CommitmentPoint, DecisionEval, EquityPoint } from './types';
import type { EvaluationEngine } from './evaluation';
import { COLORS, poolAffinity } from './context';
import { projectQuality } from './deck';

function leadTwo(aff: Record<string, number>): string[] {
  return [...COLORS].filter((c) => aff[c] > 0).sort((a, b) => aff[b] - aff[a]).slice(0, 2);
}

/**
 * Draft-equity timeline. "yours" is the projected strength of your pool if the
 * draft ended after each pick; "ideal" is the same had you taken the best
 * in-context card every time. The gap between the lines is the cumulative cost
 * of your decisions — misplays show as the two lines separating, good pivots as
 * yours climbing back toward ideal.
 */
export function buildEquity(
  decisions: DecisionEval[],
  colorRatings: ColorPairRating[],
  engine: EvaluationEngine,
): EquityPoint[] {
  const yoursPool: RatedCard[] = [];
  const idealPool: RatedCard[] = [];
  const points: EquityPoint[] = [];

  for (const d of decisions) {
    yoursPool.push(d.picked.card);
    idealPool.push(d.best.card);
    const yoursColors = leadTwo(poolAffinity(yoursPool, engine));
    const idealColors = leadTwo(poolAffinity(idealPool, engine));
    points.push({
      index: d.context.index,
      packNumber: d.context.packNumber,
      pickNumber: d.context.pickNumber,
      yours: projectQuality(yoursPool, yoursColors, engine, colorRatings),
      ideal: projectQuality(idealPool, idealColors, engine, colorRatings),
      tier: d.tier,
      pickedName: d.picked.card.name,
    });
  }
  return points;
}

/**
 * Commitment meter: color share of the weighted pool after each pick, plus a
 * 0..1 commitment level and whether the leading pair was justified yet.
 */
export function buildCommitment(decisions: DecisionEval[], engine: EvaluationEngine): CommitmentPoint[] {
  const points: CommitmentPoint[] = [];
  for (const d of decisions) {
    const pool = [...d.context.poolBefore, d.picked.card];
    const aff = poolAffinity(pool, engine);
    const total = COLORS.reduce((a, c) => a + aff[c], 0) || 1;
    const colorShare: Record<string, number> = {};
    for (const c of COLORS) colorShare[c] = aff[c] / total;

    const ordered = [...COLORS].filter((c) => aff[c] > 0).sort((a, b) => aff[b] - aff[a]);
    const pairMass = (aff[ordered[0]] ?? 0) + (aff[ordered[1]] ?? 0);
    const offMass = ordered.slice(2).reduce((a, c) => a + aff[c], 0);
    const commitment = pairMass > 0 ? pairMass / (pairMass + offMass + 9) : 0;

    const lead = ordered.slice(0, 2);
    const justified =
      commitment < 0.3 ||
      (lead.length === 2 && lead.every((c) => aff[c] >= 3)) ||
      lead.some((c) => d.context.openColors.includes(c));

    points.push({
      index: d.context.index,
      packNumber: d.context.packNumber,
      pickNumber: d.context.pickNumber,
      colorShare,
      commitment,
      justified,
    });
  }
  return points;
}
