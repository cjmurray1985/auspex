import type { ColorPairRating, RatedCard } from '../types';
import type { CategoryScore, Confidence, DecisionEval } from './types';
import type { EvaluationEngine } from './evaluation';
import { canonicalPair, COLOR_NAMES } from './context';

const WEIGHTS: Record<string, number> = {
  'card-eval': 0.22,
  'staying-open': 0.13,
  'signal-reading': 0.15,
  'archetype-commitment': 0.15,
  'deck-cohesion': 0.15,
  'opportunity-cost': 0.08,
  'pick-efficiency': 0.12,
};

function pickWeight(pickNumber: number): number {
  if (pickNumber <= 3) return 1;
  if (pickNumber <= 5) return 0.85;
  if (pickNumber <= 8) return 0.6;
  if (pickNumber <= 11) return 0.35;
  return 0.2;
}

function bandFromEvidence(n: number, avgConf: number): Confidence {
  const s = Math.min(1, n / 12) * 0.5 + avgConf * 0.5;
  return s >= 0.68 ? 'high' : s >= 0.42 ? 'medium' : 'low';
}

const colorText = (cols: string[]) => cols.map((c) => COLOR_NAMES[c] ?? c).join('/');

// ---------- Card Evaluation ----------

function cardEval(decisions: DecisionEval[]): CategoryScore {
  let wsum = 0;
  let acc = 0;
  let confSum = 0;
  for (const d of decisions) {
    const bestPower = Math.max(...d.alternatives.map((a) => a.power), d.picked.power);
    if (bestPower < 3) continue; // dregs: raw power indistinguishable
    const ratio = bestPower > 0 ? d.picked.power / bestPower : 1;
    const w = pickWeight(d.context.pickNumber) * d.confidence;
    acc += Math.max(0, Math.min(100, 100 - (1 - ratio) * 220)) * w;
    wsum += w;
    confSum += d.confidence;
  }
  const score = wsum ? acc / wsum : 65;
  const missed = decisions.filter(
    (d) => Math.max(...d.alternatives.map((a) => a.power)) - d.picked.power > 1.2,
  ).length;
  return {
    key: 'card-eval',
    label: 'Card Evaluation',
    score,
    weight: WEIGHTS['card-eval'],
    confidence: bandFromEvidence(decisions.length, confSum / (decisions.length || 1)),
    summary:
      score >= 80
        ? 'You reliably spotted the most powerful cards on the table.'
        : score >= 62
        ? 'Mostly sound card evaluation, with a few power cards left behind.'
        : 'Raw card power slipped by too often — the single biggest skill in Limited.',
    detail: [
      `Took the highest-power card available on most picks.`,
      missed ? `${missed} pick${missed === 1 ? '' : 's'} left a clearly stronger card in the pack.` : 'No major power cards passed.',
    ],
    recommendation:
      score >= 80
        ? 'Keep trusting raw power early — first-pick the best card and let your colors form around it.'
        : 'Before each early pick, ask "what is the single most powerful card here?" and default to it unless fit is decisive.',
  };
}

// ---------- Staying Open ----------

function stayingOpen(decisions: DecisionEval[]): CategoryScore {
  const early = decisions.filter((d) => d.context.packNumber === 1 && d.context.pickNumber <= 6);
  let score = 100;
  const notes: string[] = [];
  let premature = 0;
  for (const d of early) {
    const expected = Math.min(0.5, d.context.pickNumber * 0.08); // healthy ramp
    const over = d.context.commitmentLevel - (expected + 0.2);
    if (over > 0) {
      // Only a fault if it cost value (took a narrower card over a stronger one).
      const cost = d.valueGap > 0.8 ? 1.6 : 0.7;
      score -= over * 40 * cost;
      premature++;
    }
  }
  if (premature) notes.push(`Committed harder than the picks warranted on ${premature} early pick${premature === 1 ? '' : 's'}.`);
  else notes.push('Stayed flexible through the early picks — exactly right.');

  // Reward genuine flexibility: still open (<0.5) at pick 5.
  const p5 = early.find((d) => d.context.pickNumber === 5);
  if (p5 && p5.context.commitmentLevel < 0.45) {
    score = Math.min(100, score + 4);
    notes.push('Kept two-plus lanes live deep into pack one.');
  }
  score = Math.max(0, Math.min(100, score));
  return {
    key: 'staying-open',
    label: 'Staying Open',
    score,
    weight: WEIGHTS['staying-open'],
    confidence: bandFromEvidence(early.length, 0.6),
    summary:
      score >= 80
        ? 'Excellent discipline staying open before committing.'
        : score >= 60
        ? 'Reasonably flexible early, but you locked in a little soon.'
        : 'You committed too early and too hard — keep more lanes open through pick 4–5.',
    detail: notes,
    recommendation:
      score >= 80
        ? 'Maintain this discipline: take the best card and avoid a second color until a signal or a bomb pulls you.'
        : 'Through pick 5 of pack 1, prefer the highest-power card regardless of color and resist locking a pair early.',
  };
}

// ---------- Signal Reading ----------

function signalReading(decisions: DecisionEval[]): CategoryScore {
  let aligned = 0;
  let missed = 0;
  const notes: string[] = [];
  let events = 0;
  for (const d of decisions) {
    const open = d.context.openColors;
    if (!open.length) continue;
    if (d.context.pickNumber < 3) continue;
    events++;
    const w = pickWeight(d.context.pickNumber);
    const pickedAligns = d.picked.card.colors.some((c) => open.includes(c));
    const bestOpen = d.alternatives.find((a) => a.card.colors.some((c) => open.includes(c)));
    if (pickedAligns) {
      aligned += w;
    } else if (bestOpen && bestOpen.contextValue - d.picked.contextValue > 0.8) {
      missed += w * Math.min(2, bestOpen.contextValue - d.picked.contextValue);
    }
  }
  const denom = aligned + missed;
  const score = denom > 0 ? Math.max(0, Math.min(100, 55 + (aligned / denom) * 45 - (missed / denom) * 40 + 20)) : 66;
  if (missed > aligned) notes.push('Passed open colors more than once — the table was inviting you in.');
  else if (events) notes.push('Moved into open colors when the signals appeared.');
  else notes.push('Few clear signals arose this draft.');
  return {
    key: 'signal-reading',
    label: 'Signal Reading',
    score,
    weight: WEIGHTS['signal-reading'],
    confidence: bandFromEvidence(events, 0.55),
    summary:
      score >= 80
        ? 'You read the table well and drafted the open colors.'
        : score >= 60
        ? 'Some signals read, some missed.'
        : 'Open colors went unrecognized — late strong cards are the table telling you what is free.',
    detail: notes,
    recommendation:
      score >= 80
        ? 'Keep watching pick 5–8: when a strong color keeps flowing, lean into it harder.'
        : 'When a powerful card wheels or shows up late, treat it as a green light to move into that color.',
  };
}

// ---------- Archetype Commitment ----------

function archetypeCommitment(decisions: DecisionEval[], finalColors: string[]): CategoryScore {
  const finalSet = new Set(finalColors.slice(0, 2));
  // First pick where the drafter was on the final pair with real commitment.
  let commitIdx = -1;
  for (const d of decisions) {
    if (
      d.context.commitmentLevel >= 0.42 &&
      d.context.committedColors.length >= 2 &&
      d.context.committedColors.slice(0, 2).every((c) => finalSet.has(c))
    ) {
      commitIdx = d.context.index;
      break;
    }
  }
  const notes: string[] = [];
  let score = 78;
  if (commitIdx === -1) {
    score = 58;
    notes.push('Never settled firmly into a two-color plan — a scattered pool is hard to build.');
  } else {
    const commitPick = commitIdx + 1; // overall pick, 1-based-ish
    if (commitPick <= 3) {
      score = 66;
      notes.push('Locked your colors on the first few picks — earlier than the signals could justify.');
    } else if (commitPick <= 10) {
      score = 88;
      notes.push(`Committed to ${colorText(finalColors.slice(0, 2))} in the healthy window (around pick ${commitPick}).`);
    } else if (commitPick <= 18) {
      score = 76;
      notes.push('Settled a touch late, but recovered into a defined deck.');
    } else {
      score = 60;
      notes.push('Committed very late — much of pack one was drafted without a plan.');
    }
  }

  // Abandoned-lane detection: a color that led affinity mid-draft but is not final.
  const mid = decisions[Math.min(decisions.length - 1, 13)];
  if (mid) {
    const midLead = Object.entries(mid.context.colorAffinity).sort((a, b) => b[1] - a[1])[0];
    if (midLead && midLead[1] > 6 && !finalSet.has(midLead[0])) {
      score -= 10;
      notes.push(`Invested in ${COLOR_NAMES[midLead[0]]} early, then abandoned it — those picks were wasted.`);
    }
  }
  score = Math.max(0, Math.min(100, score));
  return {
    key: 'archetype-commitment',
    label: 'Archetype Commitment',
    score,
    weight: WEIGHTS['archetype-commitment'],
    confidence: bandFromEvidence(decisions.length, 0.6),
    summary:
      score >= 82
        ? 'You committed at the right time and stuck with it.'
        : score >= 62
        ? 'Commitment timing was okay but not optimal.'
        : 'Commitment timing hurt you — either too early, too late, or you jumped ship.',
    detail: notes,
    recommendation:
      score >= 82
        ? 'Keep committing around picks 4–8 once two colors clearly separate, then stay the course.'
        : commitIdx === -1
        ? 'Aim to settle into two colors by the end of pack 1 so pack 2 sharpens a real deck.'
        : 'Let signals and your pool — not your first pick — decide your colors, and only abandon a lane when it is clearly dead.',
  };
}

// ---------- Deck Cohesion ----------

function deckCohesion(deckSpells: RatedCard[], finalColors: string[]): CategoryScore {
  const creatures = deckSpells.filter((c) => c.typeLine.includes('Creature')).length;
  const removal = deckSpells.filter((c) =>
    /destroy target|exile target|deals? \d+ damage to (any target|target creature)|fight/i.test(c.oracleText),
  ).length;
  const mainSet = new Set(finalColors.slice(0, 2));
  const offColor = deckSpells.filter((c) => c.colors.length && !c.colors.every((col) => mainSet.has(col))).length;
  const avgMv = deckSpells.length ? deckSpells.reduce((a, c) => a + c.cmc, 0) / deckSpells.length : 0;

  let score = 100;
  const notes: string[] = [];
  if (creatures < 13) {
    score -= (13 - creatures) * 4;
    notes.push(`Only ${creatures} creatures — Limited is a creature format.`);
  } else notes.push(`${creatures} creatures.`);
  if (removal < 2) {
    score -= (2 - removal) * 8;
    notes.push(`${removal} removal spell${removal === 1 ? '' : 's'} — you want interaction to answer bombs.`);
  } else notes.push(`${removal} pieces of interaction.`);
  if (offColor > 0) {
    score -= offColor * 5;
    notes.push(`${offColor} off-color card${offColor === 1 ? '' : 's'} strain the mana.`);
  }
  if (avgMv > 3.4) {
    score -= (avgMv - 3.4) * 12;
    notes.push(`Average mana value ${avgMv.toFixed(1)} runs a little heavy.`);
  }
  score = Math.max(0, Math.min(100, score));
  return {
    key: 'deck-cohesion',
    label: 'Deck Cohesion',
    score,
    weight: WEIGHTS['deck-cohesion'],
    confidence: 'high',
    summary:
      score >= 80
        ? 'The picks fit together into a coherent deck.'
        : score >= 60
        ? 'A workable deck with a couple of structural gaps.'
        : 'The pieces do not fully cohere — mind creatures, removal and curve as you draft.',
    detail: notes,
    recommendation:
      removal < 2
        ? 'Prioritize interaction: aim for at least 3 removal spells, taking them over marginal creatures.'
        : creatures < 13
        ? 'Draft more playable creatures (target 15+) — you need bodies to contest the board.'
        : 'Keep drafting to a curve: value cheap-to-mid creatures and trim the top end.',
  };
}

// ---------- Opportunity Cost ----------

function opportunityCost(decisions: DecisionEval[]): CategoryScore {
  let loss = 0;
  let count = 0;
  for (const d of decisions) {
    if (d.valueGap <= 0.8) continue;
    const b = d.best.card;
    const p = d.picked.card;
    const closedDoor =
      !b.colors.length ||
      b.colors.length < p.colors.length ||
      d.context.openColors.some((c) => b.colors.includes(c));
    if (closedDoor) {
      loss += d.valueGap * pickWeight(d.context.pickNumber);
      count++;
    }
  }
  const score = Math.max(0, Math.min(100, 100 - loss * 9));
  return {
    key: 'opportunity-cost',
    label: 'Opportunity Cost',
    score,
    weight: WEIGHTS['opportunity-cost'],
    confidence: bandFromEvidence(decisions.length, 0.55),
    summary:
      score >= 80
        ? 'You rarely closed doors on stronger or more flexible options.'
        : score >= 60
        ? 'A few picks gave up meaningful future options.'
        : 'You repeatedly forfeited flexibility or power for lesser cards.',
    detail: [
      count
        ? `${count} pick${count === 1 ? '' : 's'} surrendered a more flexible or more powerful option.`
        : 'No costly door-closing picks detected.',
    ],
    recommendation:
      score >= 80
        ? 'Keep weighing what each pick closes off — you are already thinking a pick ahead.'
        : 'When two cards are close, favor the one that keeps more colors and archetypes open.',
  };
}

// ---------- Pick Efficiency ----------

const TIER_POINTS: Record<string, number> = {
  best: 1.0,
  strong: 0.85,
  acceptable: 0.65,
  weak: 0.35,
  mistake: 0.0,
};

function pickEfficiency(decisions: DecisionEval[]): CategoryScore {
  let acc = 0;
  let wsum = 0;
  const counts: Record<string, number> = { best: 0, strong: 0, acceptable: 0, weak: 0, mistake: 0 };
  for (const d of decisions) {
    counts[d.tier]++;
    const w = pickWeight(d.context.pickNumber);
    acc += TIER_POINTS[d.tier] * w;
    wsum += w;
  }
  const score = wsum ? (acc / wsum) * 100 : 65;
  return {
    key: 'pick-efficiency',
    label: 'Pick Efficiency',
    score,
    weight: WEIGHTS['pick-efficiency'],
    confidence: bandFromEvidence(decisions.length, 0.6),
    summary: `${counts.best} best · ${counts.strong} strong · ${counts.acceptable} fine · ${counts.weak} weak · ${counts.mistake} misplays.`,
    detail: [
      `${counts.best + counts.strong} of ${decisions.length} picks were strong or better.`,
      counts.mistake ? `${counts.mistake} outright misplay${counts.mistake === 1 ? '' : 's'}.` : 'No outright misplays.',
    ],
    recommendation:
      counts.mistake + counts.weak > 4
        ? 'Slow down on early picks — most value is won or lost in the first five picks of each pack.'
        : 'Solid consistency; now hunt the few acceptable picks that could have been best picks.',
  };
}

export function buildCategories(
  decisions: DecisionEval[],
  deckSpells: RatedCard[],
  finalColors: string[],
  _colorRatings: ColorPairRating[],
  _engine: EvaluationEngine,
): CategoryScore[] {
  return [
    cardEval(decisions),
    stayingOpen(decisions),
    signalReading(decisions),
    archetypeCommitment(decisions, finalColors),
    deckCohesion(deckSpells, finalColors),
    opportunityCost(decisions),
    pickEfficiency(decisions),
  ];
}

export { canonicalPair };
