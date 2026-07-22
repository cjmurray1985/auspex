import { create } from 'zustand';
import type {
  ColorPairRating,
  DraftMode,
  Phase,
  PickRecord,
  RatedCard,
} from './types';
import type { CoachProfile, DraftRecord, DraftReview } from './coach/types';
import { fetchSetCards, fetchBasicLandArt } from './data/scryfall';
import { fetchCardRatings, fetchColorRatings } from './data/seventeenlands';
import { buildRatings } from './data/ratings';
import { FEATURED_SET, getSet, type DraftableSet } from './data/sets';
import { generateAllPacks, NUM_PACKS, NUM_SEATS, PACK_SIZE } from './engine/pack';
import { botPick, createBot, rollBotTable, type BotState, type Persona } from './engine/bot';
import { buildReview } from './coach/review';
import { appendRecord, loadRecords, recordFromReview } from './coach/persistence';
import { computeProfile } from './coach/profile';
import { evaluateSetAchievements } from './data/achievements';
import { currentProfileId } from './data/account';

interface DraftStore {
  phase: Phase;
  loadingMessage: string;
  error?: string;
  /** The set the player is drafting (or will draft). */
  selectedSet: DraftableSet;
  /** Draft environment: 'quick' (MTGA QD bots) or 'human' (Human Table Sim).
   *  Persisted as the default; overridable per draft. */
  mode: DraftMode;
  setName: string;
  /** Which set's data is currently loaded into `cardPool` (null before init). */
  loadedSetCode: string | null;
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
  /** Set (and persist) the default draft mode. */
  setMode: (mode: DraftMode) => void;
  /** Re-read records, profile, and mode for the currently signed-in account.
   *  Call after sign in / sign out so performance data + settings switch. */
  reloadForAccount: () => void;
  /** Enter a draft. Pass a set code to draft that set; defaults to the
   *  currently selected set. Optionally override the mode for this draft.
   *  Re-fetches card data when the set changes. */
  startDraft: (setCode?: string, mode?: DraftMode) => Promise<void>;
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

/** Draft mode is a per-profile setting (guest namespace when signed out). */
function modeKey(): string {
  const id = currentProfileId();
  return id ? `auspex:draftMode:${id}` : 'auspex:draftMode';
}
function loadMode(): DraftMode {
  try {
    const m = localStorage.getItem(modeKey());
    if (m === 'quick' || m === 'human') return m;
  } catch {
    /* ignore */
  }
  return 'quick'; // default: fidelity to the MTGA Quick Draft bot experience
}

/** Fetch + build the rated card pool for a set. Shared by init and startDraft. */
async function loadSetData(code: string) {
  const cards = await fetchSetCards(code);
  const [ratings, colorRatings, basicLandArt] = await Promise.all([
    fetchCardRatings(code),
    fetchColorRatings(code),
    fetchBasicLandArt(),
  ]);
  return { rated: buildRatings(cards, ratings), colorRatings, basicLandArt };
}

const initialRecords = loadRecords();

export const useDraft = create<DraftStore>((set, get) => ({
  // Start on the loading screen — init() runs on mount, so we skip the brief
  // menu → loading → menu flash by not showing the menu first.
  phase: 'loading',
  loadingMessage: 'Summoning cards from Scryfall\u2026',
  selectedSet: FEATURED_SET,
  mode: loadMode(),
  setName: FEATURED_SET.name,
  loadedSetCode: null,
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
    const featured = FEATURED_SET;
    set({ initStarted: true, phase: 'loading', loadingMessage: 'Summoning cards from Scryfall\u2026' });
    try {
      const { rated, colorRatings, basicLandArt } = await loadSetData(featured.code);
      set({
        cardPool: rated,
        colorRatings,
        basicLandArt,
        loadedSetCode: featured.code,
        selectedSet: featured,
        setName: featured.name,
        phase: 'menu',
      });
    } catch (e) {
      // Allow a retry on failure.
      set({ phase: 'menu', error: `Failed to load card data: ${(e as Error).message}`, initStarted: false });
    }
  },

  setMode: (mode) => {
    try {
      localStorage.setItem(modeKey(), mode);
    } catch {
      /* ignore */
    }
    set({ mode });
  },

  reloadForAccount: () => {
    const records = loadRecords();
    set({ records, profile: computeProfile(records), mode: loadMode() });
  },

  startDraft: async (setCode, mode) => {
    const state = get();
    const target = getSet(setCode) ?? state.selectedSet;
    // Resolve the environment for this draft; persist it as the new default.
    const useMode = mode ?? state.mode;
    if (useMode !== state.mode) get().setMode(useMode);
    let cardPool = state.cardPool;

    // Load the target set's data on demand when switching sets (or on a cold
    // cardPool after an init failure).
    if (target.code !== state.loadedSetCode || cardPool.length === 0) {
      set({
        phase: 'loading',
        loadingMessage: `Summoning ${target.name} from Scryfall\u2026`,
        selectedSet: target,
        setName: target.name,
        error: undefined,
      });
      try {
        const loaded = await loadSetData(target.code);
        cardPool = loaded.rated;
        set({
          cardPool,
          colorRatings: loaded.colorRatings,
          basicLandArt: loaded.basicLandArt,
          loadedSetCode: target.code,
        });
      } catch (e) {
        set({ phase: 'menu', error: `Failed to load ${target.name}: ${(e as Error).message}` });
        return;
      }
    } else {
      set({ selectedSet: target, setName: target.name });
    }

    const rounds = generateAllPacks(cardPool);
    const personas = rollBotTable(NUM_SEATS - 1, useMode);
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
      pickDeadline: Date.now() + PICK_SECONDS * 1000,
    });
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
      const review = buildReview(s.deck, totalBasics, s.picks, s.colorRatings, s.cardPool, s.mode, s.selectedSet.code);
      // Achievements are about what you DRAFTED (the full pool), not just the
      // 40-card build, so evaluate against humanPool.
      const earned = evaluateSetAchievements(s.selectedSet.code, s.humanPool, review.overall);
      const records = appendRecord(recordFromReview(review, s.selectedSet.code, earned));
      const profile = computeProfile(records);
      set({ review, records, profile, phase: 'grade' });
    }, 2600);
  },

  reset: () => {
    set({
      phase: 'menu',
      humanPack: [],
      humanPool: [],
      picks: [],
      deck: [],
      review: null,
      pickDeadline: null,
    });
  },
}));
