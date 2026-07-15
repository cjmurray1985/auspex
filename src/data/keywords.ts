import type { DraftCard } from '../types';

/**
 * Keyword glossary for hover tooltips, in the spirit of Arena's reminder-text
 * boxes. Covers evergreen keywords plus the mechanics that appear in the
 * current set (Power-up, Teamwork, Connive, etc.).
 */
const GLOSSARY: Record<string, string> = {
  Flying: 'Can only be blocked by creatures with flying or reach.',
  Vigilance: "Attacking doesn't cause this creature to tap.",
  Flash: 'You may cast this spell any time you could cast an instant.',
  Reach: 'Can block creatures with flying.',
  Trample: 'Excess combat damage is dealt to the player or planeswalker it\u2019s attacking.',
  Lifelink: 'Damage dealt by this creature also causes you to gain that much life.',
  Haste: 'Can attack and tap as soon as it comes under your control.',
  Deathtouch: 'Any amount of damage this deals to a creature is enough to destroy it.',
  Prowess: 'Gets +1/+1 until end of turn whenever you cast a noncreature spell.',
  Ward: 'Spells and abilities your opponents control that target this cost extra.',
  Indestructible: "Damage and effects that say \u201cdestroy\u201d don't destroy this.",
  'First strike': 'Deals combat damage before creatures without first strike.',
  'Double strike': 'Deals both first-strike and regular combat damage.',
  Menace: "Can't be blocked except by two or more creatures.",
  Hexproof: "Can't be the target of spells or abilities your opponents control.",
  Defender: "Can't attack.",
  'Power-up':
    'An activated ability you can use once. Its cost is reduced if this creature entered the battlefield this turn.',
  Teamwork:
    'As an additional cost, you may tap untapped creatures you control with the listed total power or more for a bonus effect.',
  Connive:
    'Draw a card, then discard a card. If you discarded a nonland card, put a +1/+1 counter on this creature.',
  Scry: 'Look at the top cards of your library; put any number on the bottom and the rest back on top.',
  Surveil: 'Look at the top cards of your library; put any of them into your graveyard.',
  Mill: 'Put the top cards of a library into its owner\u2019s graveyard.',
  Investigate: 'Create a Clue token: \u201c2, Sacrifice: Draw a card.\u201d',
  Treasure: 'Treasure tokens can be sacrificed for one mana of any color.',
  Food: 'Food tokens can be sacrificed (2, tap) to gain 3 life.',
  Landfall: 'Triggers whenever a land you control enters the battlefield.',
  Enrage: 'Triggers whenever this creature is dealt damage.',
  Crew: 'Tap creatures with the listed total power to turn this Vehicle into a creature.',
  Equip: 'Pay the cost to attach to a creature you control, as a sorcery.',
  Improvise: 'Your artifacts can help cast this spell: tap one to pay for 1 generic mana.',
  Cycling: 'Pay the cost and discard this card to draw a card.',
  Landcycling: 'Pay the cost and discard this card to search for the named land type.',
  Fight: 'Each creature deals damage equal to its power to the other.',
  Extort: 'When you cast a spell, you may pay W/B: each opponent loses 1 life, you gain that life.',
  Boast: 'Activate only if this creature attacked this turn, once per turn.',
  Transform: 'A double-faced card that can turn into its other face.',
};

// Skip aliases too generic to be useful in a tooltip
const IGNORED = new Set(['Double', 'Sneak', 'Heal', 'Basic landcycling', 'Typecycling']);

export interface KeywordHint {
  name: string;
  text: string;
}

export function keywordHints(card: DraftCard): KeywordHint[] {
  const hints: KeywordHint[] = [];
  const seen = new Set<string>();
  for (const kw of card.keywords) {
    if (IGNORED.has(kw) || seen.has(kw)) continue;
    const text = GLOSSARY[kw] ?? GLOSSARY[kw.replace(/^Basic /, '')];
    if (text) {
      hints.push({ name: kw, text });
      seen.add(kw);
    }
  }
  return hints.slice(0, 4); // Arena shows at most a few boxes
}
