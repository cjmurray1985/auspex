import type { RatedCard } from '../../types';
import type { SourceOpinion } from '../types';
import type { EvalProvider } from './types';

/**
 * A rules-of-thumb evaluator built from rarity, card type, keywords and oracle
 * text. It always has an opinion, but a weak one — it is the floor that keeps
 * the engine working for brand-new cards or fully offline. Low confidence.
 */
export class HeuristicProvider implements EvalProvider {
  id = 'heuristic';

  calibrate(): void {
    /* stateless */
  }

  evaluate(card: RatedCard): SourceOpinion {
    let score = { common: 4.2, uncommon: 4.9, rare: 5.6, mythic: 6.2 }[card.rarity];
    const text = card.oracleText.toLowerCase();
    const isCreature = card.typeLine.includes('Creature');

    if (/destroy target|exile target|deals? \d+ damage to (any target|target creature)/.test(text))
      score += 1.2;
    if (/counter target/.test(text)) score += 0.4;
    if (/draw (two|three|a card)/.test(text)) score += 0.5;
    for (const kw of ['Flying', 'Menace', 'Trample', 'Lifelink', 'Deathtouch', 'First strike'])
      if (card.keywords.includes(kw)) score += 0.25;
    if (isCreature && card.power && card.cmc > 0) {
      const p = parseInt(card.power) || 0;
      const t = parseInt(card.toughness ?? '0') || 0;
      if ((p + t) / 2 >= card.cmc) score += 0.4;
      if (p + t <= card.cmc) score -= 0.4;
    }
    if (card.cmc >= 6) score -= 0.5;
    if (!isCreature && !text) score -= 0.5;
    if (card.colors.length >= 2) score -= 0.2;

    return {
      source: 'heuristic',
      label: 'Card-text heuristic',
      value: Math.max(0.5, Math.min(8.5, score)),
      confidence: 0.3,
      note: 'Rarity, type and text read',
    };
  }
}
