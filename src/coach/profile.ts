import type {
  Achievement,
  CategoryKey,
  CoachProfile,
  CoachRank,
  ColorPairStat,
  DimensionTrend,
  DraftRecord,
  HabitFlag,
  ImprovementTrend,
  MasteryLevel,
  RecurringPattern,
  WeeklyGoal,
} from './types';
import { getExplainer } from './narrate';

/**
 * Progression engine
 * ==================
 * Turns the persisted history of decision-quality records into a long-term
 * coaching profile: a persistent Draft Rating, per-dimension trends, recurring
 * habits, color-pair mastery, streaks, achievements and weekly goals. This is
 * where the app stops reviewing single drafts and starts coaching the player.
 */

const RANKS: CoachRank[] = [
  { name: 'Novice', color: '#c08457', min: 0 },
  { name: 'Apprentice', color: '#c3cad4', min: 1000 },
  { name: 'Adept', color: '#e6c463', min: 1400 },
  { name: 'Sharpshooter', color: '#7fd6d0', min: 1700 },
  { name: 'Expert', color: '#8ab6ff', min: 2000 },
  { name: 'Master Drafter', color: '#ff8a4c', min: 2300 },
  // Apex: sustained near-perfect decision quality (~grade 98 held over drafts).
  // Deliberately brutal so even Experts always have a summit to climb toward.
  { name: 'Oracle', color: '#c9a3ff', min: 2450 },
];

/** Drafts a new player completes before a rank is assigned (placement). */
export const CALIBRATION_DRAFTS = 3;

/** Roman numerals for the four within-rank divisions (IV lowest → I highest). */
const DIVISION_NUMERALS = ['', 'I', 'II', 'III', 'IV'];

const DIM_LABELS: Record<CategoryKey, string> = {
  'card-eval': 'Card Evaluation',
  'staying-open': 'Staying Open',
  'signal-reading': 'Signal Reading',
  'archetype-commitment': 'Archetype Commitment',
  'deck-cohesion': 'Deck Cohesion',
  'opportunity-cost': 'Opportunity Cost',
  'pick-efficiency': 'Pick Efficiency',
};
const DIM_KEYS = Object.keys(DIM_LABELS) as CategoryKey[];

const GUILD: Record<string, string> = {
  WU: 'Azorius', UB: 'Dimir', BR: 'Rakdos', RG: 'Gruul', GW: 'Selesnya',
  WB: 'Orzhov', UR: 'Izzet', BG: 'Golgari', RW: 'Boros', GU: 'Simic', UG: 'Simic',
};
const ALL_PAIRS = ['WU', 'UB', 'BR', 'RG', 'GW', 'WB', 'UR', 'BG', 'RW', 'GU'];

/**
 * Draft Rating curve (the progression invariant)
 * ----------------------------------------------
 * The rating is an exponentially-weighted moving average of each draft's
 * decision-quality grade (`overall`, 0..100) scaled to a 0..2500 ladder:
 *
 *   ratingₙ = ALPHA · (overallₙ · SCALE) + (1 − ALPHA) · ratingₙ₋₁
 *
 * Design guarantees (see DA-121 guard tests in profile.test.ts):
 *  - **Decision quality only.** `overall` is a pure decision-quality score;
 *    `DraftRecord` carries no win/loss/outcome field, so the rating literally
 *    cannot reward a "hot" deck or punish a "cold" one. A great-decision draft
 *    that ran cold still raises the rating; a lucky, badly-drafted deck does not.
 *  - **Recency-weighted.** ALPHA=0.3 lets recent improvement move the rating
 *    while damping single-draft variance — progression tracks *getting better*,
 *    not play frequency.
 */
const RATING_ALPHA = 0.3;
const RATING_SCALE = 25; // overall 0..100 -> rating 0..2500

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

/** The rank a given rating falls in. Exported so the UI can detect rank-ups. */
export function rankAtRating(rating: number): CoachRank {
  let rank = RANKS[0];
  for (const r of RANKS) if (rating >= r.min) rank = r;
  return rank;
}

/**
 * Rank + which division (1..4, I highest) the rating sits in within that rank's
 * band. The apex rank has no next tier, so it has no division.
 */
function rankInfo(rating: number): { rank: CoachRank; next?: CoachRank; division: number } {
  let rank = RANKS[0];
  let next: CoachRank | undefined;
  for (let i = 0; i < RANKS.length; i++) {
    if (rating >= RANKS[i].min) {
      rank = RANKS[i];
      next = RANKS[i + 1];
    }
  }
  let division = 0; // 0 = no division (apex rank)
  if (next) {
    const span = next.min - rank.min || 1;
    const p = Math.max(0, Math.min(1, (rating - rank.min) / span));
    // p near 0 → division IV (just entered); p near 1 → division I (about to promote)
    division = Math.min(4, Math.max(1, 4 - Math.floor(p * 4)));
  }
  return { rank, next, division };
}

/**
 * The rating ladder. During the calibration window the value is the stable
 * running average of grades so far (so one hot/cold draft can't over- or
 * under-place a new drafter); afterwards it's the recency-weighted EWMA.
 */
function ratingSeries(records: DraftRecord[]): number[] {
  const series: number[] = [];
  let r = 0;
  let calSum = 0;
  records.forEach((rec, i) => {
    const target = rec.overall * RATING_SCALE;
    if (i < CALIBRATION_DRAFTS) {
      calSum += target;
      r = calSum / (i + 1);
    } else {
      r = RATING_ALPHA * target + (1 - RATING_ALPHA) * r;
    }
    series.push(Math.round(r));
  });
  return series;
}

function improvingStreak(records: DraftRecord[]): { current: number; best: number } {
  let best = 0;
  let run = 0;
  let current = 0;
  for (let i = 1; i < records.length; i++) {
    if (records[i].overall > records[i - 1].overall) run++;
    else run = 0;
    best = Math.max(best, run);
  }
  // current: trailing run of improvements
  for (let i = records.length - 1; i > 0; i--) {
    if (records[i].overall > records[i - 1].overall) current++;
    else break;
  }
  return { current, best: Math.max(best, current) };
}

/**
 * Rolling-window improvement trajectory (PRE-51). Compares the recent window of
 * drafts against the window before it, on two outcome-free signals: the
 * decision-quality grade and the Draft Rating. Honest during calibration — no
 * trajectory is claimed until a rank has been earned and there are two windows
 * to compare.
 */
function improvementTrend(records: DraftRecord[], series: number[]): ImprovementTrend {
  const grades = records.map((r) => r.overall);
  const empty = (direction: 'calibrating', summary: string): ImprovementTrend => ({
    window: 0,
    gradeRecent: 0,
    gradePrior: 0,
    gradeDelta: 0,
    ratingRecent: 0,
    ratingPrior: 0,
    ratingDelta: 0,
    direction,
    gradeSeries: grades.slice(-8),
    summary,
  });

  // Need at least calibration + one comparison window before we call a trend.
  if (records.length <= CALIBRATION_DRAFTS) {
    return empty('calibrating', 'Finish calibration to start tracking your improvement.');
  }

  const w = Math.min(5, Math.floor(records.length / 2));
  if (w < 1) {
    return empty('calibrating', 'Draft again to start tracking your improvement.');
  }
  const recent = grades.slice(-w);
  const prior = grades.slice(-2 * w, -w);
  const gradeRecent = mean(recent);
  const gradePrior = prior.length ? mean(prior) : gradeRecent;
  const gradeDelta = gradeRecent - gradePrior;
  const ratingRecent = mean(series.slice(-w));
  const ratingPrior = prior.length ? mean(series.slice(-2 * w, -w)) : ratingRecent;
  const ratingDelta = ratingRecent - ratingPrior;

  const direction: 'improving' | 'steady' | 'slipping' =
    gradeDelta >= 2 ? 'improving' : gradeDelta <= -2 ? 'slipping' : 'steady';

  const rd = Math.round(ratingDelta);
  const gd = Math.abs(gradeDelta).toFixed(1);
  const summary =
    direction === 'improving'
      ? `Your decision quality is trending up — +${gd} grade over your last ${w} drafts${rd > 0 ? ` (+${rd} rating)` : ''}. Keep it going.`
      : direction === 'slipping'
        ? `Your decision quality has dipped ${gd} grade over your last ${w} drafts. Revisit the focus below to steady it.`
        : 'Your decision quality is holding steady. Pick one focus below to push it up.';

  return {
    window: w,
    gradeRecent,
    gradePrior,
    gradeDelta,
    ratingRecent,
    ratingPrior,
    ratingDelta,
    direction,
    gradeSeries: grades.slice(-8),
    summary,
  };
}

function dimensions(withData: DraftRecord[]): DimensionTrend[] {
  if (!withData.length) return [];
  const recent = withData.slice(-5);
  const prior = withData.slice(-10, -5);
  return DIM_KEYS.map((key) => {
    const current = withData[withData.length - 1].categories[key] ?? 0;
    const avgRecent = mean(recent.map((r) => r.categories[key] ?? 0));
    const avgPrior = prior.length ? mean(prior.map((r) => r.categories[key] ?? 0)) : avgRecent;
    return { key, label: DIM_LABELS[key], current, avgRecent, avgPrior, delta: avgRecent - avgPrior };
  });
}

export function colorPairsOf(records: DraftRecord[]): ColorPairStat[] {
  return ALL_PAIRS.map((pair) => {
    const games = records.filter((r) => r.colors === pair);
    const scores = games.map((g) => g.overall);
    const avg = mean(scores);
    const best = scores.length ? Math.max(...scores) : 0;
    let level: MasteryLevel = 'unplayed';
    if (games.length) {
      if (games.length >= 3 && avg >= 76) level = 'mastered';
      else if (games.length >= 2 && avg < 58) level = 'struggling';
      else if (games.length >= 2 && avg >= 66) level = 'proficient';
      else level = 'learning';
    }
    return { pair, label: GUILD[pair] ?? pair, games: games.length, avg, best, level };
  });
}

function recurring(records: DraftRecord[]): RecurringPattern[] {
  const window = records.slice(-8);
  if (window.length < 2) return [];
  const counts = new Map<HabitFlag, number>();
  for (const r of window) for (const f of r.flags) counts.set(f, (counts.get(f) ?? 0) + 1);
  const patterns: RecurringPattern[] = [];
  for (const [flag, count] of counts) {
    const frequency = count / window.length;
    if (frequency < 0.34 || count < 2) continue;
    const copy = getExplainer().habit({ flag, frequency });
    patterns.push({
      id: `pat-${flag}`,
      flag,
      title: copy.title,
      frequency,
      description: copy.description,
      recommendation: copy.recommendation,
      severity: frequency >= 0.6 ? 'focus' : 'watch',
    });
  }
  return patterns.sort((a, b) => b.frequency - a.frequency).slice(0, 4);
}

function firstDate(records: DraftRecord[], pred: (r: DraftRecord) => boolean): string | undefined {
  return records.find(pred)?.date;
}

function achievements(records: DraftRecord[], pairs: ColorPairStat[], bestStreak: number): Achievement[] {
  const n = records.length;
  const distinctPairs = new Set(records.filter((r) => r.colors).map((r) => r.colors)).size;
  const totalTiers = (r: DraftRecord) => Object.values(r.tierCounts).reduce((a, b) => a + b, 0);
  const defs: Array<Omit<Achievement, 'earned' | 'date'> & { earned: boolean; date?: string }> = [
    { id: 'first', name: 'First Steps', description: 'Complete your first coached draft.', earned: n >= 1, date: records[0]?.date },
    { id: 'reps', name: 'Getting Reps', description: 'Complete 5 drafts.', earned: n >= 5, date: records[4]?.date },
    { id: 'dedicated', name: 'Dedicated', description: 'Complete 20 drafts.', earned: n >= 20, date: records[19]?.date },
    { id: 'sharp-eye', name: 'Sharp Eye', description: 'Score 85+ in Card Evaluation.', earned: records.some((r) => (r.categories['card-eval'] ?? 0) >= 85), date: firstDate(records, (r) => (r.categories['card-eval'] ?? 0) >= 85) },
    { id: 'captain', name: 'Table Captain', description: 'Score 90+ in Signal Reading.', earned: records.some((r) => (r.categories['signal-reading'] ?? 0) >= 90), date: firstDate(records, (r) => (r.categories['signal-reading'] ?? 0) >= 90) },
    { id: 'flawless', name: 'Ice in the Veins', description: 'Finish a draft with zero misplays.', earned: records.some((r) => totalTiers(r) > 0 && r.tierCounts.mistake === 0), date: firstDate(records, (r) => totalTiers(r) > 0 && r.tierCounts.mistake === 0) },
    { id: 'straight-a', name: "Straight A's", description: 'Earn an overall grade of A- or better.', earned: records.some((r) => r.overall >= 80), date: firstDate(records, (r) => r.overall >= 80) },
    { id: 'heater', name: 'On a Heater', description: 'Improve three drafts in a row.', earned: bestStreak >= 3 },
    { id: 'pair-master', name: 'Guild Master', description: 'Master a color pair (3+ drafts, 76+ avg).', earned: pairs.some((p) => p.level === 'mastered') },
    { id: 'polymath', name: 'Polymath', description: 'Draft 5 different color pairs.', earned: distinctPairs >= 5 },
    { id: 'comeback', name: 'Comeback Kid', description: 'Recover 25+ equity after a slump in one draft.', earned: records.some((r) => r.bestRecovery >= 25), date: firstDate(records, (r) => r.bestRecovery >= 25) },
  ];
  return defs.map((d) => ({ id: d.id, name: d.name, description: d.description, earned: d.earned, date: d.earned ? d.date : undefined }));
}

/**
 * Every HabitFlag maps to exactly one coaching dimension (compile-time total:
 * `Record<HabitFlag, …>` forces all flags to be covered — no orphan habits).
 * Weekly goals dedupe by *dimension*, so two habits on the same dimension never
 * produce two overlapping goals (no double-counting).
 */
export const FLAG_DIM: Record<HabitFlag, CategoryKey> = {
  'early-commit': 'staying-open',
  'late-commit': 'archetype-commitment',
  'missed-signals': 'signal-reading',
  'over-read-signals': 'signal-reading',
  'undervalue-interaction': 'deck-cohesion',
  'weak-cohesion': 'deck-cohesion',
  'power-over-fit': 'card-eval',
  'fit-over-power': 'card-eval',
  'card-eval-slips': 'card-eval',
  'abandoned-lane': 'archetype-commitment',
};

function goals(patterns: RecurringPattern[], dims: DimensionTrend[]): WeeklyGoal[] {
  const out: WeeklyGoal[] = [];
  const usedDims = new Set<CategoryKey>();
  const dimBy = (k: CategoryKey) => dims.find((d) => d.key === k);

  // One goal per detected habit, deduped by the dimension it targets: two
  // habits on the same dimension collapse to a single goal (no double-counting).
  for (const p of patterns) {
    const dimKey = FLAG_DIM[p.flag];
    if (usedDims.has(dimKey)) continue;
    usedDims.add(dimKey);
    const current = Math.round(dimBy(dimKey)?.current ?? 0);
    out.push({
      id: `goal-${p.flag}`,
      title: p.title.replace(/^You /, 'Stop ').replace(/^Your /, 'Fix your '),
      detail: p.recommendation,
      targetScore: 72,
      currentScore: current,
      met: current >= 72,
    });
    if (out.length >= 2) break;
  }

  // Fallback: if habits didn't fill two goals, add the weakest untargeted dim.
  if (out.length < 2 && dims.length) {
    const weakest = [...dims].filter((d) => !usedDims.has(d.key)).sort((a, b) => a.current - b.current)[0];
    if (weakest) {
      usedDims.add(weakest.key);
      out.push({
        id: `goal-${weakest.key}`,
        title: `Raise your ${weakest.label}`,
        detail: `Your weakest dimension right now. Target ${Math.min(85, Math.round(weakest.current) + 8)} next session.`,
        targetScore: Math.min(85, Math.round(weakest.current) + 8),
        currentScore: Math.round(weakest.current),
        met: false,
      });
    }
  }
  return out.slice(0, 3);
}

function insights(records: DraftRecord[], dims: DimensionTrend[], pairs: ColorPairStat[]): string[] {
  const out: string[] = [];
  if (records.length < 3) {
    out.push('Draft a few more times and I\u2019ll start tracking your long-term patterns and habits.');
    return out;
  }
  const movers = [...dims].filter((d) => Math.abs(d.delta) >= 6).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  for (const m of movers.slice(0, 2)) out.push(getExplainer().progress({ label: m.label, delta: m.delta }));
  const mastered = pairs.find((p) => p.level === 'mastered');
  if (mastered) out.push(`You've mastered ${mastered.label} (${mastered.games} drafts, ${Math.round(mastered.avg)} avg).`);
  const struggling = pairs.find((p) => p.level === 'struggling');
  if (struggling) out.push(`${struggling.label} is a weak spot — ${struggling.games} drafts averaging just ${Math.round(struggling.avg)}. Worth a focused rep.`);
  if (!out.length) out.push('Your dimensions are steady. Pick one weekly goal below and push it.');
  return out.slice(0, 4);
}

export function computeProfile(records: DraftRecord[]): CoachProfile {
  const series = ratingSeries(records);
  const rating = series[series.length - 1] ?? 0;
  const peakRating = series.length ? Math.max(...series) : 0;
  const ratingDelta = series.length >= 2 ? series[series.length - 1] - series[series.length - 2] : 0;
  const { rank, next, division } = rankInfo(rating);
  const calibrating = records.length < CALIBRATION_DRAFTS;
  const calibrationRemaining = Math.max(0, CALIBRATION_DRAFTS - records.length);
  const rankLabel = calibrating
    ? 'Calibrating'
    : division
      ? `${rank.name} ${DIVISION_NUMERALS[division]}`
      : rank.name;
  const { current: streak, best: bestStreak } = improvingStreak(records);
  const withData = records.filter((r) => Object.keys(r.categories).length > 0);
  const dims = dimensions(withData);
  const pairs = colorPairsOf(records);
  const patterns = recurring(records);

  return {
    drafts: records.length,
    rating,
    peakRating,
    ratingDelta,
    rank,
    nextRank: next,
    rankLabel,
    rankDivision: division || undefined,
    calibrating,
    calibrationRemaining,
    ratingHistory: series,
    personalBest: records.length ? Math.max(...records.map((r) => r.overall)) : 0,
    streak,
    bestStreak,
    dimensions: dims,
    improvement: improvementTrend(records, series),
    colorPairs: pairs,
    recurring: patterns,
    achievements: achievements(records, pairs, bestStreak),
    goals: goals(patterns, dims),
    insights: insights(records, dims, pairs),
  };
}
