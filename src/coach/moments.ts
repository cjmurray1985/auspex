import type { CoachingMoment, DecisionEval } from './types';
import { getExplainer } from './narrate';

/**
 * Coaching moments are the 3–5 decisions that most shaped the draft — the ones
 * worth teaching from. Impact combines how much value moved, how early (early
 * picks echo further), and how confident we are it was really a mistake.
 */
function classify(d: DecisionEval): CoachingMoment['kind'] | null {
  const ctx = d.context;
  const pickedReasons = d.picked.fitReasons;
  const offColor = pickedReasons.some((r) => r.kind === 'off-color' || r.kind === 'splash');
  const synergyLean = pickedReasons.some((r) => r.kind === 'synergy' || r.kind === 'on-color');

  // Positive highlight: a genuinely great, strategically correct pick.
  if (d.tier === 'best' && d.picked.power >= 6.5 && ctx.pickNumber <= 5) return 'great-pick';

  if (d.tier === 'best' || d.tier === 'strong') return null;

  // Missed an open color for a materially worse card.
  if (
    ctx.openColors.length &&
    !d.picked.card.colors.some((c) => ctx.openColors.includes(c)) &&
    d.alternatives.some((a) => a.card.colors.some((c) => ctx.openColors.includes(c)) && a.contextValue - d.picked.contextValue > 0.8)
  )
    return 'missed-signal';

  // Committed hard, early, at a cost.
  const expected = Math.min(0.5, ctx.pickNumber * 0.08);
  if (ctx.packNumber === 1 && ctx.pickNumber <= 6 && ctx.commitmentLevel > expected + 0.22 && d.valueGap > 0.8)
    return 'over-commit';

  // Pivoted into a color that was not open, for a weaker card.
  const introducedColor = d.picked.card.colors.some(
    (c) => !ctx.committedColors.includes(c) && !ctx.openColors.includes(c),
  );
  if (introducedColor && ctx.commitmentLevel > 0.4 && d.valueGap > 1.1) return 'over-read-signal';

  if (offColor && ctx.commitmentLevel > 0.5 && d.valueGap > 1) return 'power-over-fit';
  if (synergyLean && d.valueGap > 1.4 && d.picked.power < d.best.power - 1) return 'fit-over-power';

  return null;
}

export function buildMoments(decisions: DecisionEval[]): CoachingMoment[] {
  const scored = decisions
    .map((d) => {
      const kind = classify(d);
      if (!kind) return null;
      const earliness = 1 - Math.min(1, d.context.index / 28);
      const impact =
        kind === 'great-pick'
          ? 0.5 + earliness * 0.3
          : Math.min(1, (d.valueGap / 3) * 0.6 + earliness * 0.3 + d.confidence * 0.1);
      return { d, kind, impact };
    })
    .filter((x): x is { d: DecisionEval; kind: CoachingMoment['kind']; impact: number } => !!x)
    .sort((a, b) => b.impact - a.impact);

  // Prefer at most one positive highlight, and keep variety of kinds (max two
  // of any one lesson type) so the coaching doesn't repeat itself.
  const chosen: typeof scored = [];
  let positives = 0;
  const kindCount: Record<string, number> = {};
  for (const s of scored) {
    if (s.kind === 'great-pick') {
      if (positives >= 1) continue;
      positives++;
    } else if ((kindCount[s.kind] ?? 0) >= 2) {
      continue;
    }
    kindCount[s.kind] = (kindCount[s.kind] ?? 0) + 1;
    chosen.push(s);
    if (chosen.length >= 5) break;
  }

  return chosen.map((s, i) => ({
    id: `moment-${i}`,
    title: titleFor(s.kind),
    packNumber: s.d.context.packNumber,
    pickNumber: s.d.context.pickNumber,
    impact: s.impact,
    kind: s.kind,
    lesson: getExplainer().moment(
      {
        id: `moment-${i}`,
        title: titleFor(s.kind),
        packNumber: s.d.context.packNumber,
        pickNumber: s.d.context.pickNumber,
        impact: s.impact,
        kind: s.kind,
        lesson: '',
        decisionIndex: s.d.context.index,
      },
      s.d.facts,
    ),
    decisionIndex: s.d.context.index,
  }));
}

function titleFor(kind: CoachingMoment['kind']): string {
  return {
    'card-eval': 'Card evaluation slip',
    'over-commit': 'Committed too early',
    'missed-signal': 'Missed an open color',
    'over-read-signal': 'Over-read a weak signal',
    'abandoned-lane': 'Abandoned a lane',
    'power-over-fit': 'Power over fit',
    'fit-over-power': 'Fit over power',
    'great-pick': 'Excellent pick',
  }[kind];
}
