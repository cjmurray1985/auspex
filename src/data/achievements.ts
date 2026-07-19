import type { RatedCard } from '../types';
import type { DraftRecord } from '../coach/types';

/**
 * Per-set achievements
 * ====================
 * Set mastery is built from two halves: color-pair mastery (see coach/mastery)
 * and these achievements. Each set gets a debut, a couple of type/theme goals,
 * one or more *unique* signature achievements grounded in that set's real cards
 * and mechanics, an "ace" grade goal, and a longevity goal.
 *
 * Two predicate kinds:
 *  - `fromDeck(pool, grade)`  → earned by a single draft (evaluated at review
 *    time against everything you drafted; stored on the record).
 *  - `fromHistory(setRecords)`→ earned across drafts in the set (evaluated live).
 */
export interface SetAchievement {
  id: string;
  name: string;
  description: string;
  /** Signature, set-defining achievement (highlighted in the UI). */
  unique?: boolean;
  /** Collector number (in this set) of a card whose art fronts the earned tile. */
  art?: { cn: string; card: string };
  fromDeck?: (pool: RatedCard[], grade: number) => boolean;
  fromHistory?: (setRecords: DraftRecord[]) => boolean;
}

// ---- predicate helpers -----------------------------------------------------
const typeCount = (pool: RatedCard[], t: string) =>
  pool.filter((c) => c.creatureTypes?.includes(t)).length;
const hasName = (pool: RatedCard[], re: RegExp) => pool.some((c) => re.test(c.name));
const oracleCount = (pool: RatedCard[], re: RegExp) =>
  pool.filter((c) => re.test(c.oracleText ?? '')).length;

const TRIBES = ['Elf', 'Faerie', 'Kithkin', 'Goblin', 'Merfolk', 'Elemental', 'Treefolk', 'Giant'];
const maxTribe = (pool: RatedCard[]) => Math.max(0, ...TRIBES.map((t) => typeCount(pool, t)));

const OUTLAW_TYPES = ['Assassin', 'Mercenary', 'Pirate', 'Rogue', 'Warlock'];
const outlawCount = (pool: RatedCard[]) =>
  pool.filter((c) => c.creatureTypes?.some((t) => OUTLAW_TYPES.includes(t))).length;

const ace = (grade: number) => grade >= 85;

export const SET_ACHIEVEMENTS: Record<string, SetAchievement[]> = {
  // ---- Marvel Super Heroes ----
  MSH: [
    { id: 'msh-debut', name: 'Recruited', description: 'Complete your first draft of this set.', art: { cn: '9', card: 'Captain America, Super-Soldier' }, fromHistory: (r) => r.length >= 1 },
    {
      id: 'msh-ff',
      name: 'Fantastic Four',
      description: 'Draft all four members of the Fantastic Four in one draft.',
      unique: true,
      art: { cn: '66', card: 'Mister Fantastic, Reed Richards' },
      fromDeck: (p) => [/Mister Fantastic/i, /Invisible Woman/i, /Human Torch/i, /The Thing/i].every((re) => hasName(p, re)),
    },
    { id: 'msh-heroes', name: "Earth's Mightiest", description: 'Draft 8 or more Heroes in one draft.', art: { cn: '165', card: "Earth's Mightiest Heroes" }, fromDeck: (p) => typeCount(p, 'Hero') >= 8 },
    { id: 'msh-villains', name: "Rogues' Gallery", description: 'Draft 6 or more Villains in one draft.', art: { cn: '95', card: 'Doctor Doom' }, fromDeck: (p) => typeCount(p, 'Villain') >= 6 },
    { id: 'msh-mutants', name: 'Children of the Atom', description: 'Draft 4 or more Mutants in one draft.', unique: true, art: { cn: '240', card: 'Wolverine, Fierce Fighter' }, fromDeck: (p) => typeCount(p, 'Mutant') >= 4 },
    { id: 'msh-stones', name: 'Infinity Pursuit', description: 'Draft an Infinity Stone.', art: { cn: '21', card: 'The Mind Stone' }, fromDeck: (p) => p.some((c) => /Infinity Stone/i.test(c.typeLine)) },
    { id: 'msh-worthy', name: 'Worthy', description: 'Draft 3 or more cards with Worthy.', art: { cn: '146', card: 'Mjölnir, Hammer of Thor' }, fromDeck: (p) => oracleCount(p, /\bworthy\b/i) >= 3 },
    { id: 'msh-ace', name: 'True Believer', description: 'Grade 85+ drafting this set.', art: { cn: '11', card: "Captain Marvel, Earth's Protector" }, fromDeck: (_p, g) => ace(g) },
    { id: 'msh-veteran', name: 'Ongoing Series', description: 'Complete 10 drafts of this set.', art: { cn: '233', card: 'Thanos, the Mad Titan' }, fromHistory: (r) => r.length >= 10 },
  ],

  // ---- Lorwyn Eclipsed ----
  ECL: [
    { id: 'ecl-debut', name: 'Into the Eclipse', description: 'Complete your first draft of this set.', art: { cn: '61', card: 'Oko, Lorwyn Liege' }, fromHistory: (r) => r.length >= 1 },
    { id: 'ecl-kindred', name: 'Kindred Spirits', description: 'Draft 8+ creatures of a single tribe in one draft.', unique: true, art: { cn: '166', card: 'Bloom Tender' }, fromDeck: (p) => maxTribe(p) >= 8 },
    { id: 'ecl-faeries', name: 'The High Fae', description: 'Draft 6 or more Faeries in one draft.', art: { cn: '88', card: 'Bitterbloom Bearer' }, fromDeck: (p) => typeCount(p, 'Faerie') >= 6 },
    { id: 'ecl-changeling', name: 'A Thousand Faces', description: 'Draft a Changeling.', unique: true, art: { cn: '1', card: 'Changeling Wayfinder' }, fromDeck: (p) => p.some((c) => c.creatureTypes?.includes('Shapeshifter') || /changeling/i.test(c.oracleText ?? '')) },
    { id: 'ecl-blight', name: 'Withering Away', description: 'Draft 4+ cards that deal in -1/-1 counters.', art: { cn: '156', card: 'Soul Immolation' }, fromDeck: (p) => oracleCount(p, /-1\/-1 counter|\bblight\b/i) >= 4 },
    { id: 'ecl-elves', name: 'Wild Growth', description: 'Draft 6 or more Elves in one draft.', art: { cn: '391', card: 'Selfless Safewright' }, fromDeck: (p) => typeCount(p, 'Elf') >= 6 },
    { id: 'ecl-giants', name: 'Towering', description: 'Draft 3 or more Giants in one draft.', art: { cn: '12', card: 'Curious Colossus' }, fromDeck: (p) => typeCount(p, 'Giant') >= 3 },
    { id: 'ecl-ace', name: 'Eclipse Adept', description: 'Grade 85+ drafting this set.', art: { cn: '27', card: "Morningtide's Light" }, fromDeck: (_p, g) => ace(g) },
    { id: 'ecl-veteran', name: 'Twilight Regular', description: 'Complete 10 drafts of this set.', art: { cn: '110', card: 'Moonshadow' }, fromHistory: (r) => r.length >= 10 },
  ],

  // ---- Aetherdrift ----
  DFT: [
    { id: 'dft-debut', name: 'Green Flag', description: 'Complete your first draft of this set.', art: { cn: '212', card: 'Loot, the Pathfinder' }, fromHistory: (r) => r.length >= 1 },
    { id: 'dft-garage', name: 'Full Garage', description: 'Draft 5 or more Vehicles in one draft.', unique: true, art: { cn: '35', card: "Valor's Flagship" }, fromDeck: (p) => p.filter((c) => c.typeLine.includes('Vehicle')).length >= 5 },
    { id: 'dft-speed', name: 'Redline', description: 'Draft 4+ cards with Start your engines / Max speed.', unique: true, art: { cn: '105', card: 'The Speed Demon' }, fromDeck: (p) => oracleCount(p, /start your engines|max speed/i) >= 4 },
    { id: 'dft-exhaust', name: 'Burnout', description: 'Draft 3 or more cards with Exhaust.', art: { cn: '198', card: 'Coalstoke Gearhulk' }, fromDeck: (p) => oracleCount(p, /\bexhaust\b/i) >= 3 },
    { id: 'dft-mounts', name: 'Saddle Up', description: 'Draft 3 or more Mounts.', art: { cn: '122', card: 'Dracosaur Auxiliary' }, fromDeck: (p) => typeCount(p, 'Mount') >= 3 || oracleCount(p, /\bsaddle\b/i) >= 3 },
    { id: 'dft-gearhulk', name: 'Assembly Line', description: 'Draft a Gearhulk.', art: { cn: '219', card: 'Riptide Gearhulk' }, fromDeck: (p) => hasName(p, /Gearhulk/i) },
    { id: 'dft-cycle', name: 'Pit Stop', description: 'Draft 4 or more cards with Cycling.', art: { cn: '240', card: 'Radiant Lotus' }, fromDeck: (p) => oracleCount(p, /\bcycling\b/i) >= 4 },
    { id: 'dft-ace', name: 'Podium Finish', description: 'Grade 85+ drafting this set.', art: { cn: '116', card: 'Chandra, Spark Hunter' }, fromDeck: (_p, g) => ace(g) },
    { id: 'dft-veteran', name: 'Circuit Regular', description: 'Complete 10 drafts of this set.', art: { cn: '52', card: 'Mu Yanling, Wind Rider' }, fromHistory: (r) => r.length >= 10 },
  ],

  // ---- Outlaws of Thunder Junction ----
  OTJ: [
    { id: 'otj-debut', name: 'Wanted', description: 'Complete your first draft of this set.', art: { cn: '213', card: 'Kellan, the Kid' }, fromHistory: (r) => r.length >= 1 },
    { id: 'otj-mostwanted', name: 'Most Wanted', description: 'Draft an outlaw of all five types (Assassin, Mercenary, Pirate, Rogue, Warlock).', unique: true, art: { cn: '223', card: 'Oko, the Ringleader' }, fromDeck: (p) => OUTLAW_TYPES.every((t) => typeCount(p, t) >= 1) },
    { id: 'otj-crew', name: 'Rakish Crew', description: 'Draft 8 or more outlaws in one draft.', art: { cn: '190', card: 'Annie Flash, the Veteran' }, fromDeck: (p) => outlawCount(p) >= 8 },
    { id: 'otj-crime', name: 'Crime Spree', description: 'Draft 5+ cards that commit crimes.', unique: true, art: { cn: '237', card: 'Vraska, the Silencer' }, fromDeck: (p) => oracleCount(p, /commit(?:ted|s)? a crime|\bcrime\b/i) >= 5 },
    { id: 'otj-plot', name: 'The Big Score', description: 'Draft 3 or more cards with Plot.', art: { cn: '89', card: 'Gisa, the Hellraiser' }, fromDeck: (p) => oracleCount(p, /\bplot\b/i) >= 3 },
    { id: 'otj-mount', name: 'Ride Together', description: 'Draft 3 or more Mounts in one draft.', art: { cn: '206', card: 'The Gitrog, Ravenous Ride' }, fromDeck: (p) => typeCount(p, 'Mount') >= 3 },
    { id: 'otj-spree', name: 'Choose Your Price', description: 'Draft 4 or more cards with Spree.', art: { cn: '11', card: 'Final Showdown' }, fromDeck: (p) => oracleCount(p, /\bspree\b/i) >= 4 },
    { id: 'otj-ace', name: 'Quick Draw', description: 'Grade 85+ drafting this set.', art: { cn: '226', card: 'Rakdos, the Muscle' }, fromDeck: (_p, g) => ace(g) },
    { id: 'otj-veteran', name: 'Junction Regular', description: 'Complete 10 drafts of this set.', art: { cn: '109', card: 'Tinybones, the Pickpocket' }, fromHistory: (r) => r.length >= 10 },
  ],
};

/** Achievement ids earned by a single completed draft (evaluated on the pool). */
export function evaluateSetAchievements(setCode: string, pool: RatedCard[], grade: number): string[] {
  const defs = SET_ACHIEVEMENTS[setCode] ?? [];
  return defs.filter((d) => d.fromDeck && d.fromDeck(pool, grade)).map((d) => d.id);
}
