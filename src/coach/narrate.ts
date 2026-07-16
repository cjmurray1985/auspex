import type {
  BranchPoint,
  CategoryScore,
  CoachingMoment,
  DecisionFacts,
  DraftReview,
  HabitFlag,
} from './types';
import { COLOR_NAMES } from './context';

export interface HabitFact {
  flag: HabitFlag;
  frequency: number; // 0..1 over the recent window
}
export interface HabitCopy {
  title: string;
  description: string;
  recommendation: string;
}
export interface TrendFact {
  label: string;
  delta: number; // recent avg - prior avg
}

/**
 * Explanation layer
 * =================
 * The engines decide everything; this layer only turns their structured FACTS
 * into natural language. That boundary is deliberate and matches the design
 * brief: an LLM must never choose the optimal pick. It may only narrate.
 *
 * The default TemplateExplainer is fully deterministic and offline. To use a
 * real model, implement `Explainer` with a network adapter and register it via
 * `setExplainer` — no engine or UI code changes. The prompt it would receive is
 * exactly the same fact objects passed here.
 */
export interface Explainer {
  decision(facts: DecisionFacts): string;
  moment(moment: CoachingMoment, facts: DecisionFacts): string;
  category(cat: CategoryScore): string;
  branch(branch: BranchPoint): string;
  headline(review: Pick<DraftReview, 'overall' | 'letter' | 'archetype' | 'categories' | 'tierCounts'>): string;
  habit(fact: HabitFact): HabitCopy;
  progress(fact: TrendFact): string;
}

function colorText(colors: string[]): string {
  if (!colors.length) return 'no colors yet';
  return colors.map((c) => COLOR_NAMES[c] ?? c).join('/');
}

function reasonPhrases(facts: DecisionFacts): string[] {
  const out: string[] = [];
  for (const r of facts.reasons) {
    if (Math.abs(r.delta) < 0.15) continue;
    out.push(r.text);
  }
  return out;
}

export class TemplateExplainer implements Explainer {
  decision(facts: DecisionFacts): string {
    const reasons = reasonPhrases(facts);
    const reasonClause = reasons.length ? ` ${reasons.join('; ')}.` : '';

    if (facts.tier === 'best') {
      const base = `${facts.pickedName} was the strongest choice here.`;
      const openNote =
        facts.openColors.length && facts.commitmentLevel < 0.4
          ? ` You also kept your options open while ${colorText(facts.openColors)} looks under-drafted.`
          : '';
      return base + reasonClause + openNote;
    }

    if (facts.tier === 'strong') {
      return (
        `${facts.pickedName} is a fine pick — within a hair of the best option ` +
        `(${facts.bestName}).${reasonClause}`
      );
    }

    if (facts.tier === 'acceptable') {
      return (
        `${facts.pickedName} is playable, but ${facts.bestName} rated a touch higher here ` +
        `(about ${facts.valueGap.toFixed(1)} points).${reasonClause}` +
        (facts.opportunityCost ? ` ${facts.opportunityCost}` : '')
      );
    }

    // weak / mistake
    const severity = facts.tier === 'mistake' ? 'clearly stronger' : 'the better pick';
    return (
      `${facts.bestName} was ${severity} here — a ${facts.valueGap.toFixed(1)}-point edge over ` +
      `${facts.pickedName}.${reasonClause}` +
      (facts.opportunityCost ? ` ${facts.opportunityCost}` : '')
    );
  }

  moment(moment: CoachingMoment, facts: DecisionFacts): string {
    switch (moment.kind) {
      case 'over-commit':
        return (
          `At P${moment.packNumber}P${moment.pickNumber} you were already committing to ` +
          `${colorText(facts.committedColors)} before the signals justified it. Staying open one or two ` +
          `more picks costs almost nothing and protects you when a lane dries up.`
        );
      case 'missed-signal':
        return (
          `${colorText(facts.openColors)} was flowing openly at P${moment.packNumber}P${moment.pickNumber}, ` +
          `but you passed it for ${facts.pickedName}. Reading and moving into an open color is where drafts ` +
          `are won — that lane was inviting you in.`
        );
      case 'over-read-signal':
        return (
          `You pivoted for ${facts.pickedName} at P${moment.packNumber}P${moment.pickNumber} on a thin signal, ` +
          `passing ${facts.bestName}. One or two cards is noise, not an open color — don't abandon a stronger ` +
          `card for a speculative pivot.`
        );
      case 'abandoned-lane':
        return (
          `You had real investment in ${colorText(facts.committedColors)} and drifted away around ` +
          `P${moment.packNumber}P${moment.pickNumber}. Abandoning a lane wastes your early picks unless it is ` +
          `clearly dead.`
        );
      case 'power-over-fit':
        return (
          `At P${moment.packNumber}P${moment.pickNumber} you took raw power (${facts.pickedName}) over the ` +
          `card that fit your deck. Sometimes correct — but late in a defined deck, playables beat off-color power.`
        );
      case 'fit-over-power':
        return (
          `At P${moment.packNumber}P${moment.pickNumber} you leaned on synergy and passed a much stronger card ` +
          `(${facts.bestName}). Power usually wins in Limited; make sure the synergy is real before paying that much.`
        );
      case 'great-pick':
        return (
          `Textbook pick at P${moment.packNumber}P${moment.pickNumber}: ${facts.pickedName} was both the ` +
          `strongest card and the right strategic call.`
        );
      default:
        return this.decision(facts);
    }
  }

  category(cat: CategoryScore): string {
    return cat.summary;
  }

  branch(branch: BranchPoint): string {
    const c = branch.chosen;
    const a = branch.alternative;
    const wr = (p?: number) => (p != null ? ` (~${(p * 100).toFixed(1)}% format win rate)` : '');
    return (
      `At P${branch.packNumber}P${branch.pickNumber} you took ${c.card.name} and steered toward ` +
      `${c.archetype}${wr(c.winRate)}. Taking ${a.card.name} instead pointed at ${a.archetype}` +
      `${wr(a.winRate)}. ` +
      (c.quality >= a.quality
        ? `Your line projected a bit stronger from this seat.`
        : `The alternative line projected slightly stronger — worth recognizing next time.`)
    );
  }

  headline(
    review: Pick<DraftReview, 'overall' | 'letter' | 'archetype' | 'categories' | 'tierCounts'>,
  ): string {
    const weakest = [...review.categories].sort((a, b) => a.score - b.score)[0];
    const strongest = [...review.categories].sort((a, b) => b.score - a.score)[0];
    const mistakes = review.tierCounts.mistake + review.tierCounts.weak;
    if (review.overall >= 82) {
      return `A sharp ${review.archetype} draft. Your ${strongest.label.toLowerCase()} carried it; tighten ${weakest.label.toLowerCase()} to reach the top tier.`;
    }
    if (review.overall >= 66) {
      return `A solid ${review.archetype} draft with room to grow. ${strongest.label} was a strength; ${weakest.label.toLowerCase()} is your biggest lever${mistakes ? `, and ${mistakes} pick${mistakes === 1 ? '' : 's'} cost real value` : ''}.`;
    }
    return `This ${review.archetype} draft got away from you in places. Focus on ${weakest.label.toLowerCase()} first — that is where the most equity leaked.`;
  }

  habit(fact: HabitFact): HabitCopy {
    const pct = Math.round(fact.frequency * 100);
    const map: Record<HabitFlag, HabitCopy> = {
      'early-commit': {
        title: 'You commit to colors too early',
        description: `In ${pct}% of your recent drafts you locked into two colors before the signals justified it.`,
        recommendation: 'Take the best card for the first 4–5 picks and let your second color be pulled by a signal or a bomb, not your P1P1.',
      },
      'late-commit': {
        title: 'You commit too late',
        description: `In ${pct}% of recent drafts you were still uncommitted deep into pack one.`,
        recommendation: 'Once two colors clearly out-rank the rest by pick 6–8, commit — a defined deck drafts pack two far better.',
      },
      'missed-signals': {
        title: 'You miss open colors',
        description: `Signal reading lagged in ${pct}% of your recent drafts.`,
        recommendation: 'Watch picks 5–9: a strong card that wheels or shows up late is the table telling you that color is open — move in.',
      },
      'over-read-signals': {
        title: 'You over-read thin signals',
        description: `You pivoted on weak evidence in ${pct}% of recent drafts.`,
        recommendation: 'Require two or more signals before abandoning a stronger card; one late card is noise, not an open lane.',
      },
      'undervalue-interaction': {
        title: 'You undervalue interaction',
        description: `You finished with fewer than three removal spells in ${pct}% of recent drafts.`,
        recommendation: 'Bump removal up your pick order — take efficient removal over a replaceable creature, targeting 3–5 pieces.',
      },
      'weak-cohesion': {
        title: 'Your decks lack cohesion',
        description: `Deck cohesion was shaky in ${pct}% of recent drafts.`,
        recommendation: 'Draft to a curve and a plan: prioritize 15+ creatures, a low-to-mid curve, and cards that reinforce one game plan.',
      },
      'power-over-fit': {
        title: 'You force raw power over fit',
        description: `You took off-color power in a defined deck in ${pct}% of recent drafts.`,
        recommendation: 'Late in a set deck, a on-color playable beats a stronger card you can barely cast — respect your mana.',
      },
      'fit-over-power': {
        title: 'You overvalue synergy over power',
        description: `You passed clearly stronger cards for synergy in ${pct}% of recent drafts.`,
        recommendation: 'Bombs and premium removal win games; only pay a real power premium for synergy when the payoff is already in your pool.',
      },
      'card-eval-slips': {
        title: 'Your card evaluation slips',
        description: `The strongest available card got passed in ${pct}% of recent drafts.`,
        recommendation: 'On each early pick, explicitly name the most powerful card in the pack before deciding — power is the #1 Limited skill.',
      },
      'abandoned-lane': {
        title: 'You abandon lanes',
        description: `You walked away from an invested color in ${pct}% of recent drafts.`,
        recommendation: 'Only abandon a lane when it is clearly dead; otherwise your early picks become wasted sideboard cards.',
      },
    };
    return map[fact.flag];
  }

  progress(fact: TrendFact): string {
    const d = Math.round(fact.delta);
    if (d >= 6) return `You've improved noticeably at ${fact.label} (+${d} over your recent drafts). Keep it up.`;
    if (d <= -6) return `Your ${fact.label} has slipped lately (${d}). Make it a focus next session.`;
    return `Your ${fact.label} is holding steady.`;
  }
}

let explainer: Explainer = new TemplateExplainer();
export function getExplainer(): Explainer {
  return explainer;
}
export function setExplainer(next: Explainer): void {
  explainer = next;
}
