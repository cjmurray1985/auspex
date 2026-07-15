import type { RatedCard } from '../types';
import type { CardEvaluation, Confidence, SourceOpinion } from './types';
import type { EvalProvider } from './providers/types';
import { WinRateProvider, PickOrderProvider } from './providers/seventeenlands';
import { HeuristicProvider } from './providers/heuristic';
import { classifyRoles } from './roles';

/**
 * Evaluation engine
 * =================
 * Combines every registered data provider into a single consensus power for a
 * card, plus a confidence and a disagreement measure. This is deterministic and
 * source-agnostic: adding a provider (pro pick order, set-review grades, an
 * internal sim) automatically feeds the consensus with no other changes.
 *
 * Crucially, the engine reports *confidence* rather than pretending every card
 * has one objective value. When strong sources disagree, confidence drops and
 * the UI can say "experts differ here" instead of grading harshly.
 */
export class EvaluationEngine {
  private providers: EvalProvider[];
  private cache = new Map<string, CardEvaluation>();

  constructor(providers?: EvalProvider[]) {
    this.providers = providers ?? [
      new WinRateProvider(),
      new PickOrderProvider(),
      new HeuristicProvider(),
    ];
  }

  calibrate(pool: RatedCard[]): void {
    for (const p of this.providers) p.calibrate(pool);
    this.cache.clear();
  }

  evaluate(card: RatedCard): CardEvaluation {
    const cached = this.cache.get(card.id);
    if (cached) return cached;

    const opinions: SourceOpinion[] = this.providers.map((p) => p.evaluate(card));
    const active = opinions.filter((o) => o.value != null && o.confidence > 0);

    let power: number;
    let disagreement = 0;
    let topConfidence = 0;

    if (active.length) {
      const wsum = active.reduce((a, o) => a + o.confidence, 0);
      power = active.reduce((a, o) => a + (o.value as number) * o.confidence, 0) / wsum;
      // Confidence-weighted spread between sources.
      const variance =
        active.reduce((a, o) => a + o.confidence * ((o.value as number) - power) ** 2, 0) / wsum;
      disagreement = Math.sqrt(variance);
      topConfidence = Math.max(...active.map((o) => o.confidence));
    } else {
      power = card.rating.score;
    }

    const { band, score } = confidenceOf(topConfidence, disagreement, active.length);

    const evaluation: CardEvaluation = {
      power,
      confidence: band,
      confidenceScore: score,
      disagreement,
      opinions,
      roles: classifyRoles(card),
    };
    this.cache.set(card.id, evaluation);
    return evaluation;
  }
}

function confidenceOf(
  topConfidence: number,
  disagreement: number,
  sources: number,
): { band: Confidence; score: number } {
  // Start from the strongest source, penalise disagreement, reward corroboration.
  let score = topConfidence;
  score -= Math.min(0.35, disagreement * 0.12);
  if (sources >= 2) score += 0.05;
  score = Math.max(0.05, Math.min(1, score));
  const band: Confidence = score >= 0.72 ? 'high' : score >= 0.45 ? 'medium' : 'low';
  return { band, score };
}

/** A shared, lazily-calibrated engine instance for the app. */
let shared: EvaluationEngine | null = null;
export function getEngine(pool: RatedCard[]): EvaluationEngine {
  if (!shared) {
    shared = new EvaluationEngine();
    shared.calibrate(pool);
  }
  return shared;
}
