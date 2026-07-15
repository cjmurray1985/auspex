import type { RatedCard } from '../types';
import type { CardRole } from './types';

/**
 * Deterministic functional classification of a card from its type line, oracle
 * text, keywords and stats. Roles drive deck-cohesion (do you have enough
 * removal? evasion? card advantage?) and per-pick "role need" bonuses. This is
 * pure heuristics — never an LLM — so it is fast, offline and reproducible.
 */

const REMOVAL_RE =
  /(destroy target|exile target|deals? \d+ damage to (any target|target creature|each|it)|target creature gets [-−]\d|fight|-\d\/-\d|return target (creature|permanent) .* to its owner'?s hand|target creature.*can'?t block)/i;
const HARD_REMOVAL_RE = /(destroy target creature|exile target creature|destroy target permanent)/i;
const DRAW_RE = /(draw (a|one|two|three|\w+) cards?|investigate|create a clue)/i;
const EVASION_KW = ['Flying', 'Menace', 'Trample', 'Fear', 'Shadow', 'Skulk', 'Intimidate'];
const TRICK_RE = /(target creature gets \+|until end of turn|flash)/i;

export function classifyRoles(card: RatedCard): CardRole[] {
  const roles: CardRole[] = [];
  const text = card.oracleText.toLowerCase();
  const isCreature = card.typeLine.includes('Creature');
  const isInstant = card.typeLine.includes('Instant');

  if (card.rarity === 'mythic' || card.rarity === 'rare') {
    if (card.rating.score >= 7.4) roles.push('bomb');
  }
  if (REMOVAL_RE.test(text) || HARD_REMOVAL_RE.test(text)) roles.push('removal');
  if (isCreature && EVASION_KW.some((k) => card.keywords.includes(k))) roles.push('evasion');
  if (DRAW_RE.test(text)) roles.push('card-advantage');
  if (isCreature) roles.push('creature');
  if (isInstant && TRICK_RE.test(text) && !roles.includes('removal')) roles.push('combat-trick');
  if (card.typeLine.includes('Land') || /add \{[wubrgc]\}/i.test(text) || (card.producedMana?.length ?? 0) > 1)
    roles.push('fixing');

  // Narrow / conditional cards
  if (/only if|as long as|whenever.*you (control|sacrifice)/i.test(text) && !roles.includes('bomb'))
    roles.push('situational');

  if (!roles.length) roles.push('filler');
  return roles;
}

export function roleLabel(role: CardRole): string {
  return {
    bomb: 'Bomb',
    removal: 'Removal',
    evasion: 'Evasion',
    'card-advantage': 'Card advantage',
    creature: 'Creature',
    'combat-trick': 'Combat trick',
    fixing: 'Fixing',
    filler: 'Role-player',
    situational: 'Situational',
  }[role];
}
