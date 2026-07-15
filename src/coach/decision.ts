import type { PickRecord, RatedCard } from '../types';
import type {
  Candidate,
  DecisionEval,
  DecisionFacts,
  DraftContext,
  FitReason,
  PickTier,
} from './types';
import type { EvaluationEngine } from './evaluation';
import { COLOR_NAMES } from './context';
import { getExplainer } from './narrate';

const colorText = (cols: string[]) => cols.map((c) => COLOR_NAMES[c] ?? c).join('/');

/**
 * In-context value of a card = raw power + strategic fit, computed strictly from
 * the information available at the pick. Fit adjustments scale with how
 * committed the drafter already is, so the same card is graded differently at
 * P1P1 (stay open, power rules) than at P3P8 (play your colors).
 */
function contextValue(
  card: RatedCard,
  ctx: DraftContext,
  engine: EvaluationEngine,
): { value: number; reasons: FitReason[] } {
  const evaluation = engine.evaluate(card);
  const reasons: FitReason[] = [];
  let value = evaluation.power;
  const commit = ctx.commitmentLevel;

  if (!card.colors.length) {
    const d = 0.35;
    value += d;
    reasons.push({ kind: 'flexible', delta: d, text: 'colorless and castable in any deck' });
  } else {
    const committed = new Set(ctx.committedColors);
    const onColor = ctx.committedColors.length > 0 && card.colors.every((c) => committed.has(c));
    const offColors = card.colors.filter((c) => !committed.has(c));

    if (onColor) {
      const d = 0.4 + commit * 2.2;
      value += d;
      reasons.push({ kind: 'on-color', delta: d, text: `on-color for your ${colorText(ctx.committedColors)}` });
    } else if (ctx.committedColors.length && offColors.length) {
      // Off-color hurts more the more committed you are; barely matters early.
      const single = card.colors.length === 1;
      const d = -(0.5 + commit * (single ? 2.4 : 3.2));
      value += d;
      reasons.push({
        kind: single ? 'splash' : 'off-color',
        delta: d,
        text: single ? `off your colors (splashable ${colorText(offColors)})` : `off-color (${colorText(offColors)})`,
      });
    }

    // Speculating on gold cards is cheap while you are still open.
    if (card.colors.length >= 2 && commit < 0.5) {
      const d = 0.5 * (1 - commit);
      value += d;
      reasons.push({ kind: 'speculative-gold', delta: d, text: 'a cheap gold speculation while open' });
    }

    // Moving into an open color is rewarded, most when still flexible.
    const alignsOpen = card.colors.filter((c) => ctx.openColors.includes(c));
    if (alignsOpen.length && !(ctx.committedColors.length && alignsOpen.every((c) => ctx.committedColors.includes(c)))) {
      const d = Math.min(1.2, alignsOpen.length * (0.3 + 0.5 * (1 - commit)));
      value += d;
      reasons.push({ kind: 'open-signal', delta: d, text: `${colorText(alignsOpen)} is reading as open` });
    }
  }

  // Synergy with the pool (shared tribe/keyword), lightly weighted.
  if (card.creatureTypes.length || card.keywords.length) {
    let matches = 0;
    for (const owned of ctx.poolBefore) {
      if (
        card.creatureTypes.some((t) => owned.creatureTypes.includes(t)) ||
        card.keywords.some((k) => owned.keywords.includes(k))
      )
        matches++;
      if (matches >= 4) break;
    }
    if (matches >= 2) {
      const d = Math.min(0.8, matches * 0.2);
      value += d;
      reasons.push({ kind: 'synergy', delta: d, text: `synergy with ${matches} cards you have` });
    }
  }

  // Filling a role your pool lacks (only meaningful once you have a deck shape).
  if (ctx.poolBefore.length >= 6) {
    const roles = evaluation.roles;
    if (roles.includes('removal')) {
      const have = ctx.poolBefore.filter((c) => engine.evaluate(c).roles.includes('removal')).length;
      if (have <= 2) {
        const d = 0.4;
        value += d;
        reasons.push({ kind: 'role-need', delta: d, text: 'answers your shortage of removal' });
      }
    }
  }

  return { value, reasons };
}

function makeCandidate(card: RatedCard, ctx: DraftContext, engine: EvaluationEngine): Candidate {
  const { value, reasons } = contextValue(card, ctx, engine);
  return { card, power: engine.evaluate(card).power, contextValue: value, evaluation: engine.evaluate(card), fitReasons: reasons };
}

function tierFor(gap: number, bestValue: number): PickTier {
  // When the whole pack is dregs, be more forgiving about small gaps.
  const relax = bestValue < 3.5 ? 0.6 : 1;
  const g = gap * relax;
  if (g <= 0.25) return 'best';
  if (g <= 0.8) return 'strong';
  if (g <= 1.8) return 'acceptable';
  if (g <= 3.0) return 'weak';
  return 'mistake';
}

export function evaluateDecision(
  pick: PickRecord,
  ctx: DraftContext,
  engine: EvaluationEngine,
): DecisionEval {
  // De-duplicate the pack by oracle id for ranking/display.
  const seen = new Set<string>();
  const uniquePack = pick.pack.filter((c) => (seen.has(c.id) ? false : (seen.add(c.id), true)));

  const candidates = uniquePack
    .map((c) => makeCandidate(c, ctx, engine))
    .sort((a, b) => b.contextValue - a.contextValue);

  const best = candidates[0];
  const secondBest = candidates[1];
  const picked =
    candidates.find((c) => c.card.id === pick.picked.id) ?? makeCandidate(pick.picked, ctx, engine);

  const rawGap = Math.max(0, best.contextValue - picked.contextValue);

  // Contested: if the top options are within noise (incl. source disagreement),
  // reasonable drafters differ — reward taking any of them.
  const noiseBand = Math.max(0.4, best.evaluation.disagreement * 0.6);
  const contested = !!secondBest && best.contextValue - secondBest.contextValue < noiseBand;
  const pickedInTopCluster = best.contextValue - picked.contextValue <= noiseBand;

  let tier = tierFor(rawGap, best.contextValue);
  if (pickedInTopCluster && (tier === 'strong' || tier === 'acceptable')) tier = 'best';

  // Decision confidence: how sure are we this evaluation is right?
  let confidence = (picked.evaluation.confidenceScore + best.evaluation.confidenceScore) / 2;
  if (contested) confidence *= 0.8;
  confidence = Math.max(0.05, Math.min(1, confidence));
  const confidenceBand = confidence >= 0.72 ? 'high' : confidence >= 0.45 ? 'medium' : 'low';

  // Opportunity cost note when a materially better/more-flexible card was passed.
  let opportunityCost: string | undefined;
  if (rawGap > 1 && best.card.id !== picked.card.id) {
    if (!best.card.colors.length) {
      opportunityCost = `Passing ${best.card.name} gave up a colorless card that fits any direction.`;
    } else if (ctx.commitmentLevel < 0.35 && best.card.colors.length <= picked.card.colors.length) {
      opportunityCost = `You closed the door on ${colorText(best.card.colors)} by taking ${picked.card.name} instead of ${best.card.name}.`;
    } else {
      opportunityCost = `${best.card.name} would have added more raw power to the pool.`;
    }
  }

  const alternatives = candidates.slice(0, 4);

  const facts: DecisionFacts = {
    pickedName: picked.card.name,
    bestName: best.card.name,
    tier,
    valueGap: rawGap,
    openColors: ctx.openColors,
    committedColors: ctx.committedColors,
    commitmentLevel: ctx.commitmentLevel,
    reasons: picked.fitReasons,
    opportunityCost,
  };

  const narrative = getExplainer().decision(facts);

  return {
    context: ctx,
    picked,
    best,
    alternatives,
    tier,
    valueGap: rawGap,
    confidence,
    confidenceBand,
    contested,
    facts,
    narrative,
  };
}
