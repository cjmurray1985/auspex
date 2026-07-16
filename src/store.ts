import { create } from 'zustand';
import type {
  ColorPairRating,
  Phase,
  PickRecord,
  RatedCard,
} from './types';
import type { CoachProfile, DraftRecord, DraftReview } from './coach/types';
import { fetchSetCards, fetchBasicLandArt } from './data/scryfall';
import { fetchCardRatings, fetchColorRatings } from './data/seventeenlands';
import { buildRatings } from './data/ratings';
import { ACTIVE_SET } from './data/set';
import { generateAllPacks, NUM_PACKS, NUM_SEATS, PACK_SIZE } from './engine/pack';
import { botPick, createBot, rollBotTable, type BotState, type Persona } from './engine/bot';
import { buildReview } from './coach/review';
import { appendRecord, loadRecords, recordFromReview } from './coach/persistence';
import { computeProfile } from './coach/profile';

const SET_CODE = ACTIVE_SET.code;

interface DraftStore {
  phase: Phase;
  /** When the user backs out of an in-progress draft to the menu, the phase to
   *  resume into ('draft' or 'build'). null when there's nothing to resume. */
  pausedPhase: Phase | null;
  loadingMessage: string;
  error?: string;
  setName: string;
  /** Guards against `init` running more than once (e.g. StrictMode double-mount). */
  initStarted: boolean;

  cardPool: RatedCard[];
  colorRatings: ColorPairRating[];
  basicLandArt: Record<string, string>;

  // Live draft state
  rounds: RatedCard[][][]; // rounds[round][seat]
  currentRound: number; // 0-based
  currentPickInRound: number; // 0-based
  bots: BotState[];
  opponents: Persona[];
  humanPack: RatedCard[];
  humanPool: RatedCard[];
  picks: PickRecord[];
  pickDeadline: number | null;

  // Deck building
  deck: RatedCard[];
  basics: Record<string, number>;
  /** Which pile new picks are routed to during the draft. */
  activeTab: 'deck' | 'sideboard';

  review: DraftReview | null;
  records: DraftRecord[];
  profile: CoachProfile;

  init: () => Promise<void>;
  startDraft: () => void;
  /** Back out of an active draft to the menu, keeping the draft resumable. */
  pauseToMenu: () => void;
  /** Return to the paused draft/build phase. */
  resumeDraft: () => void;
  setActiveTab: (tab: 'deck' | 'sideboard') => void;
  makePick: (card: RatedCard) => void;
  moveToDeck: (card: RatedCard) => void;
  moveToPool: (card: RatedCard) => void;
  setBasics: (color: string, count: number) => void;
  autoLands: () => void;
  submitDeck: () => void;
  reset: () => void;
}

export const PICK_SECONDS = 50;

const initialRecords = loadRecords();

export const useDraft = create<DraftStore>((set, get) => ({
  // Start on the loading screen — init() runs on mount, so we skip the brief
  // menu → loading → menu flash by not showing the menu first.
  phase: 'loading',
  pausedPhase: null,
  loadingMessage: 'Summoning cards from Scryfall\u2026',
  setName: 'Marvel Super Heroes',
  initStarted: false,
  cardPool: [],
  colorRatings: [],
  basicLandArt: {},
  rounds: [],
  currentRound: 0,
  currentPickInRound: 0,
  bots: [],
  opponents: [],
  humanPack: [],
  humanPool: [],
  picks: [],
  pickDeadline: null,
  deck: [],
  basics: { W: 0, U: 0, B: 0, R: 0, G: 0 },
  activeTab: 'deck',
  review: null,
  records: initialRecords,
  profile: computeProfile(initialRecords),

  init: async () => {
    // Only ever run once — StrictMode (dev) mounts effects twice, which would
    // otherwise double-fetch and replay the loading animation.
    if (get().initStarted || get().cardPool.length) return;
    set({ initStarted: true, phase: 'loading', loadingMessage: 'Summoning cards from Scryfall\u2026' });
    try {
      const cards = await fetchSetCards(SET_CODE);
      set({ loadingMessage: 'Channeling 17lands win-rate data\u2026' });
      const [ratings, colorRatings, basicLandArt] = await Promise.all([
        fetchCardRatings(SET_CODE),
        fetchColorRatings(SET_CODE),
        fetchBasicLandArt(),
      ]);
      const rated = buildRatings(cards, ratings);
      set({ cardPool: rated, colorRatings, basicLandArt, phase: 'menu' });
    } catch (e) {
      // Allow a retry on failure.
      set({ phase: 'menu', error: `Failed to load card data: ${(e as Error).message}`, initStarted: false });
    }
  },

  startDraft: () => {
    const { cardPool } = get();
    const rounds = generateAllPacks(cardPool);
    const personas = rollBotTable(NUM_SEATS - 1);
    const bots = personas.map((p, i) => createBot(p, i));
    set({
      rounds,
      bots,
      opponents: personas,
      currentRound: 0,
      currentPickInRound: 0,
      humanPack: rounds[0][0],
      humanPool: [],
      picks: [],
      deck: [],
      basics: { W: 0, U: 0, B: 0, R: 0, G: 0 },
      activeTab: 'deck',
      review: null,
      phase: 'draft',
      pausedPhase: null,
      pickDeadline: Date.now() + PICK_SECONDS * 1000,
    });
  },

  pauseToMenu: () => {
    const { phase } = get();
    // Only draft/deck-build are resumable; a finished grade is not "underway".
    const resumable = phase === 'draft' || phase === 'build';
    set({ phase: 'menu', pausedPhase: resumable ? phase : null });
  },

  resumeDraft: () => {
    const { pausedPhase } = get();
    if (pausedPhase) set({ phase: pausedPhase, pausedPhase: null });
  },

  setActiveTab: (tab) => set({ activeTab: tab }),

  makePick: (card) => {
    const s = get();
    // Guard against double-picks (e.g. rapid double-clicks scheduling two
    // makePick calls for the same card): ignore if it's already left the pack.
    if (!s.humanPack.some((c) => (c.instanceId ?? c.id) === (card.instanceId ?? card.id))) {
      return;
    }
    const { rounds, currentRound, currentPickInRound, bots } = s;
    const seatPacks = rounds[currentRound];

    // Record the human pick (seat 0)
    const picks = [
      ...s.picks,
      {
        packNumber: currentRound + 1,
        pickNumber: currentPickInRound + 1,
        picked: card,
        pack: [...s.humanPack],
      },
    ];
    seatPacks[0] = s.humanPack.filter((c) => c.instanceId !== card.instanceId);
    const humanPool = [...s.humanPool, card];
    // Route the pick to the active pile; sideboard picks stay in the pool only.
    const deck = s.activeTab === 'deck' ? [...s.deck, card] : s.deck;

    // Bots pick from their current packs
    const totalPicksMade = currentRound * PACK_SIZE + currentPickInRound;
    for (let i = 0; i < bots.length; i++) {
      const seat = i + 1;
      const pack = seatPacks[seat];
      if (pack.length) {
        const picked = botPick(bots[i], pack, totalPicksMade);
        seatPacks[seat] = pack.filter((c) => c.instanceId !== picked.instanceId);
      }
    }

    // Pass packs: left (ascending seat) for packs 1 & 3, right for pack 2
    const dir = currentRound === 1 ? -1 : 1;
    const passed: RatedCard[][] = new Array(NUM_SEATS);
    for (let seat = 0; seat < NUM_SEATS; seat++) {
      passed[(seat + dir + NUM_SEATS) % NUM_SEATS] = seatPacks[seat];
    }
    rounds[currentRound] = passed;

    const nextPick = currentPickInRound + 1;
    if (nextPick >= PACK_SIZE) {
      const nextRound = currentRound + 1;
      if (nextRound >= NUM_PACKS) {
        // Draft over — carry the deck built during the draft into the builder,
        // and flip to the sideboard tab so the builder shows sideboard on top.
        set({
          picks,
          humanPool,
          deck,
          phase: 'build',
          activeTab: 'sideboard',
          pickDeadline: null,
        });
        // Seed a color-balanced 17-land mana base so the builder opens ready.
        get().autoLands();
        return;
      }
      set({
        picks,
        humanPool,
        deck,
        currentRound: nextRound,
        currentPickInRound: 0,
        humanPack: rounds[nextRound][0],
        rounds: [...rounds],
        pickDeadline: Date.now() + PICK_SECONDS * 1000,
      });
      return;
    }

    set({
      picks,
      humanPool,
      deck,
      currentPickInRound: nextPick,
      humanPack: passed[0],
      rounds: [...rounds],
      pickDeadline: Date.now() + PICK_SECONDS * 1000,
    });
  },

  moveToDeck: (card) => {
    const s = get();
    if (s.deck.some((c) => c.instanceId === card.instanceId)) return;
    set({ deck: [...s.deck, card] });
  },

  moveToPool: (card) => {
    set({ deck: get().deck.filter((c) => c.instanceId !== card.instanceId) });
  },

  setBasics: (color, count) => {
    set({ basics: { ...get().basics, [color]: Math.max(0, Math.min(20, count)) } });
  },

  // Fill basic lands so the deck has 17 lands total (the limited standard),
  // counting any nonbasic lands already in the deck, and split proportionally
  // to the colored pips in the chosen spells (Arena's "auto-select lands").
  autoLands: () => {
    const { deck } = get();
    const spells = deck.filter((c) => !c.typeLine.includes('Land'));
    const nonbasicLands = deck.filter((c) => c.typeLine.includes('Land')).length;
    const target = Math.max(0, 17 - nonbasicLands);

    const pip: Record<string, number> = { W: 0, U: 0, B: 0, R: 0, G: 0 };
    for (const c of spells) {
      const matches = c.manaCost.match(/\{([WUBRG])\}/g) ?? [];
      for (const m of matches) pip[m[1]]++;
    }
    const colors = Object.entries(pip)
      .filter(([, n]) => n > 0)
      .sort((a, b) => b[1] - a[1]);
    const basics: Record<string, number> = { W: 0, U: 0, B: 0, R: 0, G: 0 };
    if (!colors.length || target === 0) {
      set({ basics });
      return;
    }
    const totalPips = colors.reduce((a, [, n]) => a + n, 0) || 1;
    let assigned = 0;
    colors.forEach(([c, n], i) => {
      if (i === colors.length - 1) basics[c] = target - assigned;
      else {
        basics[c] = Math.round((n / totalPips) * target);
        assigned += basics[c];
      }
    });
    set({ basics });
  },

  submitDeck: () => {
    const s = get();
    set({ phase: 'grading' });
    // Small theatrical delay before the reveal
    setTimeout(() => {
      const totalBasics = Object.values(s.basics).reduce((a, b) => a + b, 0);
      const review = buildReview(s.deck, totalBasics, s.picks, s.colorRatings, s.cardPool);
      const records = appendRecord(recordFromReview(review, SET_CODE));
      const profile = computeProfile(records);
      set({ review, records, profile, phase: 'grade' });
    }, 2600);
  },

  reset: () => {
    set({
      phase: 'menu',
      pausedPhase: null,
      humanPack: [],
      humanPool: [],
      picks: [],
      deck: [],
      review: null,
      pickDeadline: null,
    });
  },
}));
