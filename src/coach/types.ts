import type { DraftMode, RatedCard } from '../types';

/**
 * Coaching domain model
 * =====================
 * The philosophy: grade DECISIONS, not the final deck. Every type here is built
 * around a single recorded pick and the information available at the moment it
 * was made. The final deck is analysed separately (see DeckAnalysis) because a
 * good decision can lead to a mediocre deck (variance) and a lucky deck can come
 * from poor decisions.
 *
 * Data flows one direction:
 *   providers -> evaluation (card power + confidence)
 *   picks     -> context   (draft state reconstructed at each pick)
 *   eval+ctx  -> decision  (in-context pick quality)
 *   decisions -> categories / moments / equity / commitment / branches
 *   facts     -> narrator  (natural language only; never decides anything)
 */

// ---------- Evaluation: card power from multiple sources ----------

export type SourceId = 'winrate' | 'pickorder' | 'heuristic';

export interface SourceOpinion {
  source: SourceId;
  /** Human label, e.g. "17lands GIH win rate". */
  label: string;
  /** 0..10 power estimate, or null if this source has nothing to say. */
  value: number | null;
  /** 0..1 — how much this opinion should be trusted for this card. */
  confidence: number;
  /** One-line rationale, e.g. "58.1% GIH WR over 4,210 games". */
  note: string;
}

export type Confidence = 'high' | 'medium' | 'low';

export interface CardEvaluation {
  /** Consensus power on the 0..10 scale (confidence-weighted across sources). */
  power: number;
  /** Overall trust in the consensus. */
  confidence: Confidence;
  /** 0..1 numeric confidence backing the band. */
  confidenceScore: number;
  /** Std-dev-like spread between disagreeing sources (0 = agreement). */
  disagreement: number;
  opinions: SourceOpinion[];
  /** Functional role, derived deterministically from text/stats. */
  roles: CardRole[];
}

export type CardRole =
  | 'bomb'
  | 'removal'
  | 'evasion'
  | 'card-advantage'
  | 'creature'
  | 'combat-trick'
  | 'fixing'
  | 'filler'
  | 'situational';

// ---------- Context: the state of the draft at a given pick ----------

export interface DraftContext {
  /** Overall pick index, 0-based (P1P1 = 0). */
  index: number;
  packNumber: number;
  pickNumber: number;
  /** Cards already in the pool BEFORE this pick. */
  poolBefore: RatedCard[];
  /** Weighted color affinity of the pool so far, 0..1 per color. */
  colorAffinity: Record<string, number>;
  /** Colors the drafter is effectively committed to (0-2 usually). */
  committedColors: string[];
  /** 0..1 — how locked-in the drafter is (grows with picks + concentration). */
  commitmentLevel: number;
  /** Open-color signal strength per color, read from packs seen so far. */
  openness: Record<string, number>;
  /** Colors reading as clearly open right now. */
  openColors: string[];
  /** True once this pack has wheeled (pick 9+), i.e. seen a second time. */
  wheeled: boolean;
}

// ---------- Decision: how good was this pick, in context ----------

export type PickTier = 'best' | 'strong' | 'acceptable' | 'weak' | 'mistake';

export interface Candidate {
  card: RatedCard;
  /** Raw isolated power consensus. */
  power: number;
  /** In-context value = power + fit + speculation - opportunity cost. */
  contextValue: number;
  evaluation: CardEvaluation;
  /** Structured tags explaining the contextual adjustment. */
  fitReasons: FitReason[];
}

export interface FitReason {
  kind:
    | 'on-color'
    | 'off-color'
    | 'splash'
    | 'open-signal'
    | 'against-signal'
    | 'speculative-gold'
    | 'flexible'
    | 'synergy'
    | 'role-need'
    | 'redundant';
  /** Signed contribution to context value. */
  delta: number;
  text: string;
}

export interface DecisionEval {
  context: DraftContext;
  picked: Candidate;
  /** The best in-context option available. */
  best: Candidate;
  /** Top alternatives by context value (includes best, excludes picked dupes). */
  alternatives: Candidate[];
  tier: PickTier;
  /** Value lost vs the best option, in power-scale points. */
  valueGap: number;
  /** 0..1 confidence that this evaluation is correct. */
  confidence: number;
  confidenceBand: Confidence;
  /** True when the top options are close enough that reasonable experts differ. */
  contested: boolean;
  /** Structured facts the narrator turns into prose. */
  facts: DecisionFacts;
  /** Natural-language coaching for this pick. */
  narrative: string;
}

export interface DecisionFacts {
  pickedName: string;
  bestName: string;
  tier: PickTier;
  valueGap: number;
  /** Signals live at this pick. */
  openColors: string[];
  committedColors: string[];
  commitmentLevel: number;
  reasons: FitReason[];
  /** What choosing this closed off (opportunity cost note), if notable. */
  opportunityCost?: string;
}

// ---------- Categories: the multi-dimensional grade ----------

export type CategoryKey =
  | 'card-eval'
  | 'staying-open'
  | 'signal-reading'
  | 'archetype-commitment'
  | 'deck-cohesion'
  | 'opportunity-cost'
  | 'pick-efficiency';

export interface CategoryScore {
  key: CategoryKey;
  label: string;
  score: number; // 0..100
  weight: number; // 0..1, weights sum to 1
  confidence: Confidence;
  /** One-line summary of how this score was earned. */
  summary: string;
  /** Supporting bullet facts. */
  detail: string[];
  /** Actionable, specific "next time" recommendation. */
  recommendation: string;
}

// ---------- Coaching moments ----------

export interface CoachingMoment {
  id: string;
  title: string;
  packNumber: number;
  pickNumber: number;
  /** 0..1 relative impact used to rank moments. */
  impact: number;
  kind:
    | 'card-eval'
    | 'over-commit'
    | 'missed-signal'
    | 'over-read-signal'
    | 'abandoned-lane'
    | 'power-over-fit'
    | 'fit-over-power'
    | 'great-pick';
  lesson: string;
  decisionIndex: number;
}

// ---------- Equity timeline ----------

export interface EquityPoint {
  index: number;
  packNumber: number;
  pickNumber: number;
  /** Your projected draft strength (0..100) if it ended now. */
  yours: number;
  /** Strength had you taken the best in-context card every pick to here. */
  ideal: number;
  tier: PickTier;
  pickedName: string;
}

// ---------- Commitment meter ----------

export interface CommitmentPoint {
  index: number;
  packNumber: number;
  pickNumber: number;
  /** Color share of the weighted pool, 0..1 each. */
  colorShare: Record<string, number>;
  /** 0..1 — 0 fully open, 1 fully locked. */
  commitment: number;
  /** Whether the leading pair was justified by pool+signals at this point. */
  justified: boolean;
}

// ---------- Branch analysis ----------

export interface BranchProjection {
  label: string;
  colors: string[];
  archetype: string;
  /** Projected deck quality 0..100. */
  quality: number;
  /** Projected win rate from color-pair data, if available. */
  winRate?: number;
  strengths: string[];
  weaknesses: string[];
}

export interface BranchPoint {
  packNumber: number;
  pickNumber: number;
  decisionIndex: number;
  chosen: BranchProjection & { card: RatedCard };
  alternative: BranchProjection & { card: RatedCard };
  narrative: string;
}

// ---------- Final deck analysis ----------

export interface DeckMetric {
  key: string;
  label: string;
  score: number; // 0..100
  value: string; // display value, e.g. "16 creatures"
  ideal: string;
}

export interface AlternativeDeck {
  colors: string[];
  archetype: string;
  quality: number;
  winRate?: number;
  playableCount: number;
  note: string;
}

export interface DeckAnalysis {
  archetype: string;
  colors: string[];
  power: number; // 0..100 deck power (separate from draft grade)
  winRate?: number;
  metrics: DeckMetric[];
  gamePlan: string;
  alternatives: AlternativeDeck[];
  bestCards: RatedCard[];
}

// ---------- Top-level review ----------

export interface DraftReview {
  overall: number; // 0..100
  letter: string;
  confidence: Confidence;
  /** The draft environment this review graded against. */
  mode: DraftMode;
  headline: string;
  archetype: string;
  archetypeWinRate?: number;
  categories: CategoryScore[];
  decisions: DecisionEval[];
  moments: CoachingMoment[];
  equity: EquityPoint[];
  commitment: CommitmentPoint[];
  branches: BranchPoint[];
  deck: DeckAnalysis;
  /** Efficiency distribution of picks by tier. */
  tierCounts: Record<PickTier, number>;
  bestCard?: RatedCard;
}

// ======================= Long-term coaching profile =======================
// Persisted across drafts so the app evolves from reviewing single drafts into
// coaching the individual player over time.

/** Behavioural flags captured per draft; aggregated into recurring habits. */
export type HabitFlag =
  | 'early-commit'
  | 'late-commit'
  | 'missed-signals'
  | 'over-read-signals'
  | 'undervalue-interaction'
  | 'weak-cohesion'
  | 'power-over-fit'
  | 'fit-over-power'
  | 'card-eval-slips'
  | 'abandoned-lane';

/** Compact, persisted record of one completed draft. */
export interface DraftRecord {
  id: string;
  date: string; // ISO
  set: string;
  /** Draft environment (added PRE-49; older records may omit it). */
  mode?: DraftMode;
  /** Per-set achievement ids earned by this draft (deck-based). */
  earnedAchievements?: string[];
  overall: number;
  letter: string;
  confidence: Confidence;
  archetype: string;
  /** Canonical color pair, e.g. "UB". */
  colors: string;
  archetypeWinRate?: number;
  categories: Record<CategoryKey, number>;
  tierCounts: Record<PickTier, number>;
  momentKinds: string[];
  flags: HabitFlag[];
  /** Biggest single equity recovery seen in the draft (0..100). */
  bestRecovery: number;
}

export interface DimensionTrend {
  key: CategoryKey;
  label: string;
  current: number;
  avgRecent: number;
  avgPrior: number;
  delta: number; // recent - prior
}

export type MasteryLevel = 'unplayed' | 'learning' | 'proficient' | 'mastered' | 'struggling';

export interface ColorPairStat {
  pair: string; // canonical, e.g. "UB"
  label: string; // "Dimir" style archetype name
  games: number;
  avg: number;
  best: number;
  level: MasteryLevel;
}

export interface RecurringPattern {
  id: string;
  flag: HabitFlag;
  title: string;
  frequency: number; // 0..1 over the recent window
  description: string;
  recommendation: string;
  severity: 'watch' | 'focus';
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  earned: boolean;
  date?: string;
}

export interface WeeklyGoal {
  id: string;
  title: string;
  detail: string;
  targetScore: number;
  currentScore: number;
  met: boolean;
}

export interface CoachRank {
  name: string;
  color: string;
  min: number;
}

export interface CoachProfile {
  drafts: number;
  rating: number;
  peakRating: number;
  ratingDelta: number; // change from the previous draft
  rank: CoachRank;
  nextRank?: CoachRank;
  /** Display label, e.g. "Sharpshooter II", "Oracle", or "Calibrating". */
  rankLabel: string;
  /** Within-rank division 1..4 (I highest); undefined at the apex rank. */
  rankDivision?: number;
  /** True until the player has completed the calibration drafts (no rank yet). */
  calibrating: boolean;
  /** Drafts remaining before a rank is assigned. */
  calibrationRemaining: number;
  ratingHistory: number[];
  personalBest: number;
  streak: number; // current consecutive improving/quality streak
  bestStreak: number;
  dimensions: DimensionTrend[];
  colorPairs: ColorPairStat[];
  recurring: RecurringPattern[];
  achievements: Achievement[];
  goals: WeeklyGoal[];
  /** Narrated long-term coaching sentences. */
  insights: string[];
}
