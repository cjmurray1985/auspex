import type { ColorPairRating, RatedCard } from '../types';
import type { AlternativeDeck, DeckAnalysis, DeckMetric } from './types';
import type { EvaluationEngine } from './evaluation';
import { archetypeName, canonicalPair, COLORS } from './context';

const isLand = (c: RatedCard) => c.typeLine.includes('Land');
const isCreature = (c: RatedCard) => c.typeLine.includes('Creature');
const REMOVAL_RE = /destroy target|exile target|deals? \d+ damage to (any target|target creature)|fight|target creature gets [-−]/i;

/** Cards from the pool castable in the given colors (subset match + colorless). */
export function playablesIn(pool: RatedCard[], colors: string[], engine: EvaluationEngine): RatedCard[] {
  const set = new Set(colors);
  return pool
    .filter((c) => !isLand(c))
    .filter((c) => !c.colors.length || c.colors.every((col) => set.has(col)))
    .sort((a, b) => engine.evaluate(b).power - engine.evaluate(a).power);
}

/** Top-heavy weighted mean power of the best 23 playables. */
function weightedPower(spells: RatedCard[], engine: EvaluationEngine): number {
  const top = spells.slice(0, 23);
  if (!top.length) return 0;
  let total = 0;
  let wsum = 0;
  top.forEach((c, i) => {
    const w = 1 + 1.4 * Math.max(0, (23 - i) / 23);
    total += engine.evaluate(c).power * w;
    wsum += w;
  });
  return total / wsum;
}

/** Project a 0..100 deck-quality score for the best build in a color pair. */
export function projectQuality(
  pool: RatedCard[],
  colors: string[],
  engine: EvaluationEngine,
  colorRatings: ColorPairRating[],
): number {
  const spells = playablesIn(pool, colors, engine);
  if (!spells.length) return 0;
  const avg = weightedPower(spells, engine);
  let score = 55 + (avg - 5) * 20;
  const playable = spells.length;
  if (playable < 23) score -= (23 - playable) * 2.2;

  const pair = canonicalPair(colors.slice(0, 2));
  const pairData = colorRatings.find((r) => canonicalPair(r.colors.split('')) === pair);
  if (pairData && colorRatings.length > 3) {
    const rates = colorRatings.filter((r) => r.colors.length === 2).map((r) => r.winRate);
    const mean = rates.reduce((a, b) => a + b, 0) / rates.length;
    const sd = Math.sqrt(rates.reduce((a, b) => a + (b - mean) ** 2, 0) / rates.length) || 0.01;
    score += Math.max(-6, Math.min(6, ((pairData.winRate - mean) / sd) * 4));
  }
  return Math.max(0, Math.min(100, score));
}

function pairWinRate(colors: string[], colorRatings: ColorPairRating[]): number | undefined {
  const pair = canonicalPair(colors.slice(0, 2));
  return colorRatings.find((r) => canonicalPair(r.colors.split('')) === pair)?.winRate;
}

const IDEAL_CURVE: Record<number, number> = { 1: 2, 2: 6, 3: 5, 4: 4, 5: 2, 6: 1 };

export function analyzeDeck(
  deckSpells: RatedCard[],
  _landCount: number,
  pool: RatedCard[],
  finalColors: string[],
  colorRatings: ColorPairRating[],
  engine: EvaluationEngine,
): DeckAnalysis {
  const colors = finalColors.slice(0, 2);
  const archetype = archetypeName(colors);
  const creatures = deckSpells.filter(isCreature).length;
  const removal = deckSpells.filter((c) => REMOVAL_RE.test(c.oracleText)).length;
  const avgMv = deckSpells.length ? deckSpells.reduce((a, c) => a + c.cmc, 0) / deckSpells.length : 0;
  const avgPower = weightedPower([...deckSpells].sort((a, b) => engine.evaluate(b).power - engine.evaluate(a).power), engine);
  const mainSet = new Set(colors);
  const offColor = deckSpells.filter((c) => c.colors.length && !c.colors.every((col) => mainSet.has(col))).length;
  const threats = deckSpells.filter(
    (c) => isCreature(c) && (engine.evaluate(c).roles.includes('evasion') || engine.evaluate(c).power >= 6.5),
  ).length;

  const powerScore = Math.max(0, Math.min(100, 55 + (avgPower - 5) * 20));

  let curvePenalty = 0;
  for (const [mvStr, ideal] of Object.entries(IDEAL_CURVE)) {
    const mv = Number(mvStr);
    const have = deckSpells.filter((c) => (mv === 6 ? c.cmc >= 6 : Math.round(c.cmc) === mv)).length;
    curvePenalty += Math.max(0, Math.abs(have - ideal) - 1) * 6;
  }
  const curveScore = Math.max(0, 100 - Math.min(60, curvePenalty));

  const metrics: DeckMetric[] = [
    { key: 'power', label: 'Deck Power', score: powerScore, value: `${avgPower.toFixed(1)}/10 avg`, ideal: '≥ 5.8' },
    { key: 'curve', label: 'Mana Curve', score: curveScore, value: `${avgMv.toFixed(1)} avg MV`, ideal: 'peak at 2–3' },
    {
      key: 'creatures',
      label: 'Creatures',
      score: Math.max(0, Math.min(100, 100 - Math.abs(15 - creatures) * 7)),
      value: `${creatures}`,
      ideal: '14–17',
    },
    {
      key: 'removal',
      label: 'Interaction',
      score: Math.max(0, Math.min(100, removal * 28)),
      value: `${removal}`,
      ideal: '3–5',
    },
    {
      key: 'threats',
      label: 'Threat Density',
      score: Math.max(0, Math.min(100, threats * 20)),
      value: `${threats}`,
      ideal: '4–6 finishers',
    },
    {
      key: 'consistency',
      label: 'Consistency',
      score: Math.max(0, Math.min(100, 100 - offColor * 12)),
      value: offColor ? `${offColor} off-color` : 'mono-focused',
      ideal: 'tight two colors',
    },
  ];

  // Plausible alternative decks from the same pool/seat.
  const alternatives: AlternativeDeck[] = [];
  const pairs: string[][] = [];
  for (let i = 0; i < COLORS.length; i++)
    for (let j = i + 1; j < COLORS.length; j++) pairs.push([COLORS[i], COLORS[j]]);
  const chosenPair = canonicalPair(colors);
  for (const pair of pairs) {
    if (canonicalPair(pair) === chosenPair) continue;
    const playable = playablesIn(pool, pair, engine).filter((c) => c.colors.length).length;
    if (playable < 12) continue;
    alternatives.push({
      colors: pair,
      archetype: archetypeName(pair),
      quality: projectQuality(pool, pair, engine, colorRatings),
      winRate: pairWinRate(pair, colorRatings),
      playableCount: playable,
      note: '',
    });
  }
  alternatives.sort((a, b) => b.quality - a.quality);
  const chosenQuality = projectQuality(pool, colors, engine, colorRatings);
  const topAlts = alternatives.slice(0, 2).map((a) => ({
    ...a,
    note:
      a.quality > chosenQuality + 3
        ? `Your pool arguably supported ${a.archetype} more strongly.`
        : `A viable pivot, but weaker than the ${archetype} you built.`,
  }));

  const gamePlan = describePlan(archetype, avgMv, creatures, threats, removal);

  const bestCards = [...deckSpells]
    .sort((a, b) => engine.evaluate(b).power - engine.evaluate(a).power)
    .slice(0, 4);

  return {
    archetype,
    colors,
    power: powerScore,
    winRate: pairWinRate(colors, colorRatings),
    metrics,
    gamePlan,
    alternatives: topAlts,
    bestCards,
  };
}

function describePlan(archetype: string, avgMv: number, creatures: number, threats: number, removal: number): string {
  const speed = avgMv <= 2.9 ? 'aggressive' : avgMv >= 3.6 ? 'grindy, top-end' : 'midrange';
  const plan =
    speed === 'aggressive'
      ? 'apply early pressure and close before opponents stabilize'
      : speed === 'grindy, top-end'
      ? 'trade off early, then win on card quality and bombs'
      : 'trade efficiently and take over the mid-game with better creatures';
  return `A ${speed} ${archetype} deck (${creatures} creatures, ${threats} finishers, ${removal} interaction). Game plan: ${plan}.`;
}
