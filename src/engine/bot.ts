import type { RatedCard, Rarity } from '../types';
import { PACK_SIZE } from './pack';

/**
 * Heterogeneous bot pod.
 *
 * Real Arena pods mix players of different ranks and habits, so each seat gets
 * a randomized (rank x playstyle) persona. The strategies are synthesized from
 * three open-source drafters:
 *
 *  - dr4ft (backend/player/bot.js) picks completely at random. That is our
 *    low-rank baseline: high evaluation noise, no signal reading.
 *  - RyanSaxe/mtg is a 17lands-trained net that reached Mythic. It contributes
 *    the "stay open early, commit later" ramp and archetype (synergy) bias.
 *  - negaga53/nemedraft-client trains on 17lands TROPHY decks and adds explicit
 *    signal reading (detecting which colors are flowing / open).
 *
 * Higher-rank bots evaluate cards more accurately (less noise), read signals,
 * and stay in their lane. Lower-rank bots misevaluate, chase rares, and force
 * colors — approaching dr4ft's random bot at the bottom.
 */

export type Playstyle = 'power' | 'forcer' | 'synergy' | 'signals' | 'raredraft' | 'aggro';

export interface Persona {
  rank: string;
  skill: number; // 0..1
  style: Playstyle;
  styleLabel: string;
  noise: number;
  blunderProb: number;
  signalWeight: number;
  synergyWeight: number;
  raredraftBias: number;
  onColorMag: number;
  forced?: Set<string>;
}

export interface BotState {
  pool: RatedCard[];
  colorPull: Record<string, number>;
  openness: Record<string, number>;
  persona: Persona;
}

const COLORS = ['W', 'U', 'B', 'R', 'G'] as const;
const SEED_PAIRS = ['WU', 'UB', 'BR', 'RG', 'GW', 'WB', 'UR', 'BG', 'RW', 'UG'];

// Roughly the Arena ladder population: most players sit in Gold/Platinum.
const RANKS: Array<{ name: string; skill: number; weight: number }> = [
  { name: 'Bronze', skill: 0.12, weight: 1 },
  { name: 'Silver', skill: 0.28, weight: 2 },
  { name: 'Gold', skill: 0.45, weight: 3 },
  { name: 'Platinum', skill: 0.62, weight: 3 },
  { name: 'Diamond', skill: 0.8, weight: 2 },
  { name: 'Mythic', skill: 0.93, weight: 1 },
];

const STYLES: Array<{ style: Playstyle; label: string }> = [
  { style: 'power', label: 'Power Drafter' },
  { style: 'forcer', label: 'Color Forcer' },
  { style: 'synergy', label: 'Synergy Drafter' },
  { style: 'signals', label: 'Signal Reader' },
  { style: 'raredraft', label: 'Rare Drafter' },
  { style: 'aggro', label: 'Aggro Drafter' },
];

const RARITY_VALUE: Record<Rarity, number> = {
  common: 0,
  uncommon: 0.3,
  rare: 1.0,
  mythic: 1.4,
};

const SIGNAL_SCALE = 0.35;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function rollRank() {
  const total = RANKS.reduce((a, r) => a + r.weight, 0);
  let roll = Math.random() * total;
  for (const r of RANKS) {
    roll -= r.weight;
    if (roll <= 0) return r;
  }
  return RANKS[2];
}

function makePersona(style: Playstyle, seatIndex: number): Persona {
  const rank = rollRank();
  const skill = Math.max(0.05, Math.min(1, rank.skill + (Math.random() - 0.5) * 0.12));
  const label = STYLES.find((s) => s.style === style)!.label;

  const persona: Persona = {
    rank: rank.name,
    skill,
    style,
    styleLabel: label,
    // Low skill misevaluates cards; high skill is nearly precise.
    noise: 0.25 + 3 * (1 - skill),
    // ...and occasionally "blunders" — ignoring evaluation to grab a shiny or
    // random card, the way a beginner (or dr4ft's random bot) does.
    blunderProb: 0.5 * (1 - skill) ** 2,
    // Only strong players read signals (nemedraft's core edge).
    signalWeight: skill,
    synergyWeight: 0.12 + 0.15 * skill,
    // Weaker players chase rares/bombs regardless of fit.
    raredraftBias: 0.55 * (1 - skill),
    // Stronger players commit harder and cleaner to two colors.
    onColorMag: 2.4 + 1.6 * skill,
  };

  switch (style) {
    case 'power':
      persona.synergyWeight *= 0.6; // trusts raw card quality
      break;
    case 'forcer': {
      const pair = SEED_PAIRS[seatIndex % SEED_PAIRS.length];
      persona.forced = new Set(pair.split(''));
      persona.signalWeight = 0; // ignores what's open, forces its pair
      persona.onColorMag += 1.5;
      break;
    }
    case 'synergy':
      persona.synergyWeight = 0.4 + 0.3 * skill;
      break;
    case 'signals':
      persona.signalWeight = Math.max(persona.signalWeight, 0.65);
      break;
    case 'raredraft':
      persona.raredraftBias = Math.max(persona.raredraftBias, 0.7);
      break;
    case 'aggro':
      break; // handled in scoring (prefers cheap creatures)
  }
  return persona;
}

/** Roll a varied table of `count` personas (distinct styles where possible). */
export function rollBotTable(count: number): Persona[] {
  const styleBag = shuffle(STYLES.map((s) => s.style));
  return Array.from({ length: count }, (_, i) =>
    makePersona(styleBag[i % styleBag.length], i),
  );
}

export function createBot(persona: Persona, seatIndex = 0): BotState {
  const colorPull: Record<string, number> = { W: 0, U: 0, B: 0, R: 0, G: 0 };
  if (persona.forced) {
    for (const c of persona.forced) colorPull[c] = 3.0; // forcers start locked in
  } else {
    for (const c of SEED_PAIRS[seatIndex % SEED_PAIRS.length]) colorPull[c] = 1.0;
  }
  return { pool: [], colorPull, openness: { W: 0, U: 0, B: 0, R: 0, G: 0 }, persona };
}

/** Colors the bot is drifting toward: own picks + (skilled) open-color signals. */
function committedColors(bot: BotState): Set<string> {
  if (bot.persona.forced) return bot.persona.forced;
  const attraction = (c: string) =>
    bot.colorPull[c] + bot.persona.signalWeight * bot.openness[c] * SIGNAL_SCALE;
  const top = [...COLORS].sort((a, b) => attraction(b) - attraction(a));
  return new Set(top.slice(0, 2));
}

/** Read the pack for open colors: strong cards still available late = a signal. */
function updateSignals(bot: BotState, pack: RatedCard[], pickInPack: number) {
  if (bot.persona.signalWeight <= 0) return;
  const lateness = (pickInPack + 1) / PACK_SIZE;
  for (const card of pack) {
    if (!card.colors.length) continue;
    const surprise = Math.max(0, card.rating.score - 4.5) * lateness;
    if (surprise <= 0) continue;
    for (const c of card.colors) bot.openness[c] += surprise / card.colors.length;
  }
}

function synergyMatches(bot: BotState, card: RatedCard): number {
  if (!card.creatureTypes.length && !card.keywords.length) return 0;
  let matches = 0;
  for (const owned of bot.pool) {
    const shares =
      card.creatureTypes.some((t) => owned.creatureTypes.includes(t)) ||
      card.keywords.some((k) => owned.keywords.includes(k));
    if (shares) matches++;
    if (matches >= 5) break;
  }
  return matches;
}

function scoreCard(
  bot: BotState,
  card: RatedCard,
  commitment: number,
  committed: Set<string>,
): number {
  const p = bot.persona;
  let s = card.rating.score;

  // Color fit (two-phase: small nudge early, big pull once committed)
  if (!card.colors.length) {
    s += 0.5;
  } else {
    const onColor = card.colors.every((c) => committed.has(c));
    if (onColor) s += 0.6 + commitment * (p.onColorMag - 0.6);
    // Speculate on gold early; the incentive fades as the bot commits.
    if (card.colors.length >= 2) s += 0.8 * (1 - commitment);
  }

  s += p.synergyWeight * synergyMatches(bot, card);
  s += p.raredraftBias * RARITY_VALUE[card.rarity] * (1 - commitment * 0.5);
  if (p.style === 'aggro' && card.typeLine.includes('Creature') && card.cmc <= 3) s += 0.6;

  s += (Math.random() - 0.5) * p.noise;
  return s;
}

/** dr4ft-style pick: (mostly) random, but drawn toward flashy rares. */
function blunderPick(pack: RatedCard[]): RatedCard {
  const weights = pack.map((c) => 1 + RARITY_VALUE[c.rarity] * 2);
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < pack.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return pack[i];
  }
  return pack[0];
}

export function botPick(bot: BotState, pack: RatedCard[], picksMade: number): RatedCard {
  const pickInPack = picksMade % PACK_SIZE;
  const commitment = bot.persona.forced
    ? 1
    : Math.max(0, Math.min(1, (picksMade - 2) / 12));

  updateSignals(bot, pack, pickInPack);
  const committed = committedColors(bot);

  let best: RatedCard;
  if (Math.random() < bot.persona.blunderProb) {
    best = blunderPick(pack);
  } else {
    best = pack[0];
    let bestScore = -Infinity;
    for (const card of pack) {
      const s = scoreCard(bot, card, commitment, committed);
      if (s > bestScore) {
        bestScore = s;
        best = card;
      }
    }
  }

  bot.pool.push(best);
  for (const c of best.colors) {
    bot.colorPull[c] += best.rating.score / (best.colors.length || 1);
  }
  return best;
}
