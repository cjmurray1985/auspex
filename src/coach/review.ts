import type { ColorPairRating, DraftMode, PickRecord, RatedCard } from '../types';
import type { Confidence, DraftReview, PickTier } from './types';
import { toLetter } from '../grading/grade';
import { getEngine } from './evaluation';
import { archetypeName, canonicalPair, COLORS, poolAffinity, reconstructContexts } from './context';
import { evaluateDecision } from './decision';
import { buildCategories } from './categories';
import { buildMoments } from './moments';
import { buildEquity, buildCommitment } from './equity';
import { buildBranches } from './branch';
import { analyzeDeck } from './deck';
import { getExplainer } from './narrate';

const isLand = (c: RatedCard) => c.typeLine.includes('Land');

function resolveColors(deckSpells: RatedCard[], pool: RatedCard[], engine: ReturnType<typeof getEngine>): string[] {
  const counts: Record<string, number> = {};
  for (const c of deckSpells) for (const col of c.colors) counts[col] = (counts[col] ?? 0) + 1;
  let colors = Object.entries(counts)
    .filter(([, n]) => n >= 3)
    .sort((a, b) => b[1] - a[1])
    .map(([c]) => c);
  if (colors.length < 2) {
    const aff = poolAffinity(pool, engine);
    const lead = [...COLORS].filter((c) => aff[c] > 0).sort((a, b) => aff[b] - aff[a]);
    for (const c of lead) if (!colors.includes(c) && colors.length < 2) colors.push(c);
  }
  return colors.slice(0, 2);
}

function bandFrom(score: number): Confidence {
  return score >= 0.68 ? 'high' : score >= 0.42 ? 'medium' : 'low';
}
const bandScore: Record<Confidence, number> = { high: 0.85, medium: 0.55, low: 0.3 };

/**
 * The orchestrator. Runs every engine over the recorded draft and assembles a
 * single DraftReview. This is the one place the modules meet; each stays
 * independently testable and swappable.
 */
export function buildReview(
  deck: RatedCard[],
  basics: number,
  picks: PickRecord[],
  colorRatings: ColorPairRating[],
  cardPool: RatedCard[],
  mode: DraftMode = 'human',
): DraftReview {
  const engine = getEngine(cardPool);
  const contexts = reconstructContexts(picks, engine);
  const decisions = picks.map((p, i) => evaluateDecision(p, contexts[i], engine));

  const finalPool = picks.map((p) => p.picked);
  const deckSpells = deck.filter((c) => !isLand(c));
  const landCount = deck.filter(isLand).length + basics;
  const finalColors = resolveColors(deckSpells, finalPool, engine);

  const categories = buildCategories(decisions, deckSpells, finalColors, colorRatings, engine, mode);
  const overall = Math.round(categories.reduce((a, c) => a + c.score * c.weight, 0));

  const tierCounts: Record<PickTier, number> = { best: 0, strong: 0, acceptable: 0, weak: 0, mistake: 0 };
  for (const d of decisions) tierCounts[d.tier]++;

  const moments = buildMoments(decisions);
  const equity = buildEquity(decisions, colorRatings, engine);
  const commitment = buildCommitment(decisions, engine);
  const branches = buildBranches(decisions, finalPool, colorRatings, engine);
  const deckAnalysis = analyzeDeck(deckSpells, landCount, finalPool, finalColors, colorRatings, engine);

  const confScore =
    categories.reduce((a, c) => a + bandScore[c.confidence] * c.weight, 0) /
    (categories.reduce((a, c) => a + c.weight, 0) || 1);
  const confidence = bandFrom(confScore);

  const archetype = archetypeName(finalColors);
  const pair = canonicalPair(finalColors);
  const archetypeWinRate = colorRatings.find((r) => canonicalPair(r.colors.split('')) === pair)?.winRate;

  const headline = getExplainer().headline({ overall, letter: toLetter(overall), archetype, categories, tierCounts });

  const bestCard = deckSpells.length
    ? [...deckSpells].sort((a, b) => engine.evaluate(b).power - engine.evaluate(a).power)[0]
    : undefined;

  return {
    overall,
    letter: toLetter(overall),
    confidence,
    mode,
    headline,
    archetype,
    archetypeWinRate,
    categories,
    decisions,
    moments,
    equity,
    commitment,
    branches,
    deck: deckAnalysis,
    tierCounts,
    bestCard,
  };
}
