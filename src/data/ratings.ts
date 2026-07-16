import type { CardRating, DraftCard, RatedCard } from '../types';
import type { SeventeenLandsCard } from './seventeenlands';

/**
 * Rating model.
 *
 * Tier 1 (best): 17lands Games-In-Hand win rate (GIH WR), the community-standard
 * card quality metric. We z-score each card against the set's GIH distribution
 * and convert to letter grades exactly the way 17lands does: a normal
 * distribution centered at C with 0.33 standard deviations per letter step.
 *
 * Tier 2: cards below 17lands' 500-sample floor but with ALSA (average last
 * seen at) data. We fit a linear regression of score-on-ALSA using the cards
 * that have both, then predict. ALSA encodes the community's collective pick
 * order, so this is a real signal, just noisier.
 *
 * Tier 3: pure heuristic from rarity, card type and text. Used only when
 * 17lands has nothing (brand-new cards, offline mode).
 */

const GRADE_BANDS: Array<[number, string]> = [
  [2.145, 'A+'],
  [1.815, 'A'],
  [1.485, 'A-'],
  [1.155, 'B+'],
  [0.825, 'B'],
  [0.495, 'B-'],
  [0.165, 'C+'],
  [-0.165, 'C'],
  [-0.495, 'C-'],
  [-0.825, 'D+'],
  [-1.155, 'D'],
  [-1.485, 'D-'],
];

function zToGrade(z: number): string {
  for (const [cut, grade] of GRADE_BANDS) if (z >= cut) return grade;
  return 'F';
}

/** Map a z-score to the app's 0..10 power scale (5 = average playable). */
function zToScore(z: number): number {
  return Math.max(0, Math.min(10, 5 + z * 1.9));
}

function heuristicScore(card: DraftCard): number {
  let score = { common: 4.2, uncommon: 4.9, rare: 5.6, mythic: 6.2 }[card.rarity];
  const text = card.oracleText.toLowerCase();
  const isCreature = card.typeLine.includes('Creature');

  // Removal & interaction are premium in limited
  if (/destroy target|exile target|deals? \d+ damage to (any target|target creature)/.test(text))
    score += 1.2;
  if (/counter target/.test(text)) score += 0.4;
  // Card advantage
  if (/draw (two|three|a card)/.test(text)) score += 0.5;
  // Evasion & combat keywords
  for (const kw of ['Flying', 'Menace', 'Trample', 'Lifelink', 'Deathtouch', 'First strike'])
    if (card.keywords.includes(kw)) score += 0.25;
  // Efficient bodies
  if (isCreature && card.power && card.cmc > 0) {
    const p = parseInt(card.power) || 0;
    const t = parseInt(card.toughness ?? '0') || 0;
    if ((p + t) / 2 >= card.cmc) score += 0.4;
    if (p + t <= card.cmc) score -= 0.4;
  }
  // Clunky or narrow
  if (card.cmc >= 6) score -= 0.5;
  if (!isCreature && !text) score -= 0.5;
  // Multicolor cards are harder to cast
  if (card.colors.length >= 2) score -= 0.2;

  return Math.max(0.5, Math.min(8.5, score));
}

export function buildRatings(
  cards: DraftCard[],
  ratings: Map<string, SeventeenLandsCard>,
): RatedCard[] {
  // Set-wide GIH distribution
  const gihs: number[] = [];
  for (const c of cards) {
    const r = ratings.get(c.name) ?? ratings.get(c.name.split(' // ')[0]);
    if (r?.ever_drawn_win_rate) gihs.push(r.ever_drawn_win_rate);
  }
  const mean = gihs.length ? gihs.reduce((a, b) => a + b, 0) / gihs.length : 0.55;
  const sd = gihs.length > 5
    ? Math.sqrt(gihs.reduce((a, b) => a + (b - mean) ** 2, 0) / gihs.length)
    : 0.04;

  // Fit score ~ ALSA on cards with both signals, for tier-2 prediction
  const pairs: Array<[number, number]> = [];
  for (const c of cards) {
    const r = ratings.get(c.name) ?? ratings.get(c.name.split(' // ')[0]);
    if (r?.ever_drawn_win_rate && r?.avg_seen) {
      pairs.push([r.avg_seen, zToScore((r.ever_drawn_win_rate - mean) / sd)]);
    }
  }
  let slope = -0.55;
  let intercept = 8.0;
  if (pairs.length >= 10) {
    const mx = pairs.reduce((a, [x]) => a + x, 0) / pairs.length;
    const my = pairs.reduce((a, [, y]) => a + y, 0) / pairs.length;
    const num = pairs.reduce((a, [x, y]) => a + (x - mx) * (y - my), 0);
    const den = pairs.reduce((a, [x]) => a + (x - mx) ** 2, 0);
    if (den > 0) {
      slope = num / den;
      intercept = my - slope * mx;
    }
  }

  return cards.map((card) => {
    const r = ratings.get(card.name) ?? ratings.get(card.name.split(' // ')[0]);
    let rating: CardRating;

    if (r?.ever_drawn_win_rate && r.ever_drawn_game_count >= 500) {
      const z = (r.ever_drawn_win_rate - mean) / sd;
      rating = {
        gihwr: r.ever_drawn_win_rate,
        gihSamples: r.ever_drawn_game_count,
        iwd: r.drawn_improvement_win_rate ?? undefined,
        alsa: r.avg_seen ?? undefined,
        score: zToScore(z),
        grade: zToGrade(z),
        source: 'winrate',
      };
    } else if (r?.avg_seen) {
      // Blend the ALSA regression with the heuristic to temper noise
      const predicted = slope * r.avg_seen + intercept;
      const score = Math.max(0, Math.min(10, predicted * 0.65 + heuristicScore(card) * 0.35));
      rating = {
        alsa: r.avg_seen,
        score,
        grade: zToGrade((score - 5) / 1.9),
        source: 'alsa',
      };
    } else {
      const score = heuristicScore(card);
      rating = { score, grade: zToGrade((score - 5) / 1.9), source: 'heuristic' };
    }
    return { ...card, rating };
  });
}
