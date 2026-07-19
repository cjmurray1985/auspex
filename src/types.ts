export type Rarity = 'common' | 'uncommon' | 'rare' | 'mythic';

/**
 * Draft environment the pod emulates:
 *  - 'quick': MTGA Quick Draft bots — rigid pick order, aggressive rare-drafting,
 *    minimal signal adaptation, low variance (fidelity to what you face in QD).
 *  - 'human': Auspex Human Table Sim — varied personas, signal reading, rares
 *    wheel more (training for a Premier/paper table).
 */
export type DraftMode = 'quick' | 'human';

export const DRAFT_MODES: Record<DraftMode, { label: string; blurb: string }> = {
  quick: {
    label: 'Quick Draft Bots',
    blurb: "MTGA's bots — rigid pick order, they snap rares. What you face in Quick Draft.",
  },
  human: {
    label: 'Human Table (Sim)',
    blurb: 'A varied human pod that reads signals and lets rares wheel. Train for Premier/paper.',
  },
};

export interface DraftCard {
  id: string;
  /** Unique per dealt copy — the same card can appear in multiple packs */
  instanceId?: string;
  /** Set collector number, used to source hi-res art from mtgpics */
  collectorNumber: string;
  name: string;
  manaCost: string;
  cmc: number;
  colors: string[];
  colorIdentity: string[];
  rarity: Rarity;
  typeLine: string;
  oracleText: string;
  imageNormal: string;
  imageLarge: string;
  /** Borderless art crop, used for atmospheric backgrounds */
  artCrop?: string;
  /** Back face image for double-faced cards (large) */
  backImage?: string;
  /** Images of tokens this card creates (large) */
  tokenImages?: string[];
  keywords: string[];
  creatureTypes: string[];
  power?: string;
  toughness?: string;
  producedMana?: string[];
}

export interface CardRating {
  /** Games-in-hand win rate from 17lands, if the card met the sample floor */
  gihwr?: number;
  /** Games-in-hand sample count backing `gihwr` (data-maturity signal) */
  gihSamples?: number;
  /** Improvement when drawn */
  iwd?: number;
  /** Average last seen at (pick position signal) */
  alsa?: number;
  /** Normalized power score 0..10 used everywhere in the app */
  score: number;
  /** Letter grade on the 17lands-style scale */
  grade: string;
  /** Where the score came from, for transparency in the UI */
  source: 'winrate' | 'alsa' | 'heuristic';
}

export interface RatedCard extends DraftCard {
  rating: CardRating;
}

export interface ColorPairRating {
  colors: string; // e.g. "WU"
  winRate: number;
  games: number;
}

export interface PickRecord {
  packNumber: number; // 1-based
  pickNumber: number; // 1-based within pack
  picked: RatedCard;
  pack: RatedCard[]; // full contents of the pack at time of pick
}

export type Phase = 'menu' | 'loading' | 'draft' | 'build' | 'grading' | 'grade';

export interface GradeComponent {
  key: string;
  label: string;
  score: number; // 0..100
  weight: number;
  detail: string;
  tip?: string;
}

export interface DeckGrade {
  overall: number; // 0..100
  letter: string;
  components: GradeComponent[];
  pickReview: PickReviewEntry[];
  archetype: string;
  archetypeWinRate?: number;
  bestCard?: RatedCard;
  tips: string[];
}

export interface PickReviewEntry {
  packNumber: number;
  pickNumber: number;
  picked: RatedCard;
  best: RatedCard;
  accuracy: number; // 0..1
  onColorAdjusted: boolean;
}

export interface HistoryEntry {
  date: string;
  set: string;
  overall: number;
  letter: string;
  archetype: string;
}
