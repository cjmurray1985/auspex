import type {
  ColorPairRating,
  DeckGrade,
  GradeComponent,
  PickRecord,
  PickReviewEntry,
  RatedCard,
} from '../types';

/**
 * Deck grading model
 * ==================
 * Four components, mirroring how strong limited players (and tools like
 * Untapped/Arena Tutor built on 17lands data) evaluate a draft:
 *
 *  1. Card Power (35%) — mean 17lands-derived power of your 23 maindeck
 *     nonlands, weighted so your best cards matter most (games are decided
 *     by your top end, floor matters less).
 *  2. Synergy & Archetype (25%) — did you end up in a real deck? Uses the
 *     set's actual color-pair win rates from 17lands, color cohesion of the
 *     build, and detected tribal/keyword synergy packages.
 *  3. Curve & Composition (20%) — creature count, mana curve shape versus
 *     the ideal limited curve, average mana value, land count.
 *  4. Pick Discipline (20%) — every pick compared against the best card
 *     available at that moment. Early picks graded on raw power; from pick
 *     16 on, graded against the best card *in your lane*, because taking
 *     the on-color card over a marginally stronger off-color one is correct.
 */

const WEIGHTS = { power: 0.35, synergy: 0.25, curve: 0.2, picks: 0.2 };

export const LETTER_BANDS: Array<[number, string]> = [
  [93, 'S'],
  [89, 'A+'],
  [84, 'A'],
  [80, 'A-'],
  [76, 'B+'],
  [71, 'B'],
  [66, 'B-'],
  [61, 'C+'],
  [55, 'C'],
  [49, 'C-'],
  [43, 'D+'],
  [36, 'D'],
];

export function toLetter(score: number): string {
  for (const [cut, letter] of LETTER_BANDS) if (score >= cut) return letter;
  return 'F';
}

function isLand(c: RatedCard) {
  return c.typeLine.includes('Land');
}
function isCreature(c: RatedCard) {
  return c.typeLine.includes('Creature');
}

function deckColors(deck: RatedCard[]): string[] {
  const counts: Record<string, number> = {};
  for (const c of deck) for (const col of c.colors) counts[col] = (counts[col] ?? 0) + 1;
  return Object.entries(counts)
    .filter(([, n]) => n >= 3)
    .sort((a, b) => b[1] - a[1])
    .map(([c]) => c);
}

const COLOR_NAMES: Record<string, string> = {
  W: 'White',
  U: 'Blue',
  B: 'Black',
  R: 'Red',
  G: 'Green',
};

const WUBRG = ['W', 'U', 'B', 'R', 'G'];

function canonicalPair(colors: string[]): string {
  return WUBRG.filter((c) => colors.includes(c)).join('');
}

// ---------- Component 1: Card Power ----------

function gradePower(deck: RatedCard[]): GradeComponent {
  const spells = deck.filter((c) => !isLand(c)).sort((a, b) => b.rating.score - a.rating.score);
  if (!spells.length) {
    return { key: 'power', label: 'Card Power', score: 0, weight: WEIGHTS.power, detail: 'No spells in deck.' };
  }
  // Descending weights: bombs count ~2.5x more than the 23rd card
  let total = 0;
  let wsum = 0;
  spells.forEach((c, i) => {
    const w = 1 + 1.5 * Math.max(0, (23 - i) / 23);
    total += c.rating.score * w;
    wsum += w;
  });
  const avg = total / wsum; // 0..10 scale, ~5 is set average
  // A deck of straight set-average cards is a C (55); each point of average
  // power is worth a lot — decks average ~5.2-6 when well drafted.
  const score = Math.max(0, Math.min(100, 55 + (avg - 5) * 22));
  const bombs = spells.filter((c) => c.rating.score >= 7.5).length;
  return {
    key: 'power',
    label: 'Card Power',
    score,
    weight: WEIGHTS.power,
    detail: `Weighted card quality ${avg.toFixed(1)}/10 with ${bombs} bomb${bombs === 1 ? '' : 's'} (17lands win-rate based).`,
    tip:
      score < 65
        ? 'Prioritize raw card quality with your first 5-6 picks of each pack — power wins games in limited.'
        : undefined,
  };
}

// ---------- Component 2: Synergy & Archetype ----------

function gradeSynergy(deck: RatedCard[], colorRatings: ColorPairRating[]): {
  component: GradeComponent;
  archetype: string;
  archetypeWinRate?: number;
} {
  const spells = deck.filter((c) => !isLand(c));
  const colors = deckColors(spells);
  const mainPair = canonicalPair(colors.slice(0, 2));
  const archetype = colors.length
    ? colors.slice(0, 2).map((c) => COLOR_NAMES[c]).join('-')
    : 'Colorless';

  let score = 55;
  const details: string[] = [];

  // (a) Real archetype strength from 17lands color-pair win rates
  const pairData = colorRatings.find((r) => canonicalPair(r.colors.split('')) === mainPair);
  let archetypeWinRate: number | undefined;
  if (pairData && colorRatings.length) {
    archetypeWinRate = pairData.winRate;
    const rates = colorRatings.filter((r) => r.colors.length === 2).map((r) => r.winRate);
    const mean = rates.reduce((a, b) => a + b, 0) / rates.length;
    const sd = Math.sqrt(rates.reduce((a, b) => a + (b - mean) ** 2, 0) / rates.length) || 0.01;
    const z = (pairData.winRate - mean) / sd;
    score += Math.max(-8, Math.min(8, z * 5));
    details.push(`${archetype} wins ${(pairData.winRate * 100).toFixed(1)}% of games in this format`);
  }

  // (b) Color cohesion — off-color cards (splashes) cost consistency
  const mainColors = new Set(colors.slice(0, 2));
  const offColor = spells.filter(
    (c) => c.colors.length && !c.colors.every((col) => mainColors.has(col)),
  ).length;
  score -= offColor * 4;
  if (offColor > 0) details.push(`${offColor} off-color card${offColor === 1 ? '' : 's'}`);
  else details.push('perfectly cohesive two-color build');

  // (c) Tribal / mechanical package detection
  const typeCounts: Record<string, number> = {};
  for (const c of spells) for (const t of c.creatureTypes) typeCounts[t] = (typeCounts[t] ?? 0) + 1;
  const textLower = spells.map((c) => c.oracleText.toLowerCase());
  let synergyBonus = 0;
  for (const [type, count] of Object.entries(typeCounts)) {
    if (count >= 4) {
      const payoffs = textLower.filter((t) => t.includes(type.toLowerCase())).length;
      if (payoffs >= 2) synergyBonus += Math.min(8, count + payoffs);
    }
  }
  // Keyword density (e.g. a deck full of flyers with flyer payoffs)
  const kwCounts: Record<string, number> = {};
  for (const c of spells) for (const k of c.keywords) kwCounts[k] = (kwCounts[k] ?? 0) + 1;
  for (const [kw, count] of Object.entries(kwCounts)) {
    if (count >= 5 && textLower.filter((t) => t.includes(kw.toLowerCase())).length >= 2) {
      synergyBonus += 4;
    }
  }
  synergyBonus = Math.min(15, synergyBonus);
  if (synergyBonus > 5) details.push('strong synergy package detected');
  score += synergyBonus;

  return {
    component: {
      key: 'synergy',
      label: 'Synergy & Archetype',
      score: Math.max(0, Math.min(100, score)),
      weight: WEIGHTS.synergy,
      detail: details.join('; ') + '.',
      tip:
        score < 60
          ? 'Settle into your format\u2019s strongest open color pair by mid-pack 2 and cut the splashes.'
          : undefined,
    },
    archetype,
    archetypeWinRate,
  };
}

// ---------- Component 3: Curve & Composition ----------

const IDEAL_CURVE: Record<number, number> = { 1: 2, 2: 6, 3: 5, 4: 4, 5: 2, 6: 1 };

function gradeCurve(deck: RatedCard[], basics: number): GradeComponent {
  const spells = deck.filter((c) => !isLand(c));
  const lands = deck.filter(isLand).length + basics;
  const creatures = spells.filter(isCreature).length;
  let score = 100;
  const issues: string[] = [];

  // Deck size — 40 exactly is correct; every extra card dilutes your best draws
  const size = deck.length + basics;
  if (size < 40) {
    score -= 30;
    issues.push(`deck is ${size}/40 cards`);
  } else if (size > 41) {
    score -= (size - 40) * 4;
    issues.push(`${size} cards — trim to 40 to draw your best cards more often`);
  }

  // Lands
  if (lands < 16 || lands > 18) {
    score -= Math.abs(17 - lands) * 6;
    issues.push(`${lands} lands (16\u201318 is standard)`);
  }

  // Creature count
  if (creatures < 12) {
    score -= (12 - creatures) * 4;
    issues.push(`only ${creatures} creatures — limited is a creature format`);
  } else if (creatures > 20) {
    score -= 5;
    issues.push('very creature-heavy; a couple of interaction spells would help');
  }

  // Curve shape vs ideal
  let curvePenalty = 0;
  for (const [mvStr, ideal] of Object.entries(IDEAL_CURVE)) {
    const mv = Number(mvStr);
    const have = spells.filter((c) => (mv === 6 ? c.cmc >= 6 : Math.round(c.cmc) === mv)).length;
    curvePenalty += Math.max(0, Math.abs(have - ideal) - 1) * 2;
  }
  score -= Math.min(20, curvePenalty);
  const avgMv = spells.length ? spells.reduce((a, c) => a + c.cmc, 0) / spells.length : 0;
  if (avgMv > 3.6) {
    score -= 8;
    issues.push(`average mana value ${avgMv.toFixed(1)} is too high`);
  }

  return {
    key: 'curve',
    label: 'Curve & Composition',
    score: Math.max(0, Math.min(100, score)),
    weight: WEIGHTS.curve,
    detail: issues.length
      ? issues.join('; ') + '.'
      : `Clean build: ${creatures} creatures, ${lands} lands, avg MV ${avgMv.toFixed(1)}.`,
    tip: issues.length
      ? 'Aim for ~16 creatures, 17 lands, and a curve peaking at 2\u20133 mana.'
      : undefined,
  };
}

// ---------- Component 4: Pick Discipline ----------

function gradePicks(picks: PickRecord[], finalDeck: RatedCard[]): {
  component: GradeComponent;
  review: PickReviewEntry[];
} {
  const finalColors = new Set(deckColors(finalDeck.filter((c) => !isLand(c))).slice(0, 2));
  const review: PickReviewEntry[] = [];
  let weightedAcc = 0;
  let weightSum = 0;

  picks.forEach((p) => {
    const overallPick = (p.packNumber - 1) * 14 + p.pickNumber;
    const lateDraft = overallPick > 15;

    // After the lane is set, the "best" pick is the best card you could
    // actually play — on-color or colorless.
    const candidates = lateDraft
      ? p.pack.filter((c) => !c.colors.length || c.colors.every((col) => finalColors.has(col)))
      : p.pack;
    const pool = candidates.length ? candidates : p.pack;
    const best = pool.reduce((a, b) => (b.rating.score > a.rating.score ? b : a), pool[0]);

    const accuracy = best.rating.score > 0
      ? Math.min(1, p.picked.rating.score / best.rating.score)
      : 1;
    // First picks of each pack carry the most signal
    const weight = p.pickNumber <= 5 ? 1.0 : p.pickNumber <= 9 ? 0.7 : 0.4;
    weightedAcc += accuracy * weight;
    weightSum += weight;
    review.push({
      packNumber: p.packNumber,
      pickNumber: p.pickNumber,
      picked: p.picked,
      best,
      accuracy,
      onColorAdjusted: lateDraft && candidates.length > 0,
    });
  });

  const acc = weightSum ? weightedAcc / weightSum : 1;
  // 100% accuracy = 100; 85% (typical decent drafter) ≈ 70
  const score = Math.max(0, Math.min(100, 100 - (1 - acc) * 200));
  const misses = review.filter((r) => r.accuracy < 0.8).length;
  return {
    component: {
      key: 'picks',
      label: 'Pick Discipline',
      score,
      weight: WEIGHTS.picks,
      detail: `${(acc * 100).toFixed(0)}% pick efficiency; ${misses} significant miss${misses === 1 ? '' : 'es'}.`,
      tip:
        score < 65
          ? 'Review your misses below — the biggest rating gaps are the picks costing you wins.'
          : undefined,
    },
    review,
  };
}

// ---------- Overall ----------

export function gradeDeck(
  deck: RatedCard[],
  basics: number,
  picks: PickRecord[],
  colorRatings: ColorPairRating[],
): DeckGrade {
  const power = gradePower(deck);
  const { component: synergy, archetype, archetypeWinRate } = gradeSynergy(deck, colorRatings);
  const curve = gradeCurve(deck, basics);
  const { component: pickComp, review } = gradePicks(picks, deck);

  const components = [power, synergy, curve, pickComp];
  const overall = Math.round(
    components.reduce((a, c) => a + c.score * c.weight, 0),
  );

  const spells = deck.filter((c) => !isLand(c));
  const bestCard = spells.length
    ? spells.reduce((a, b) => (b.rating.score > a.rating.score ? b : a), spells[0])
    : undefined;

  const tips = components
    .filter((c) => c.tip)
    .sort((a, b) => a.score - b.score)
    .map((c) => c.tip!) as string[];

  return {
    overall,
    letter: toLetter(overall),
    components,
    pickReview: review.sort((a, b) => a.accuracy - b.accuracy),
    archetype,
    archetypeWinRate,
    bestCard,
    tips,
  };
}
