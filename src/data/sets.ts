import type { SetConfig } from './set';
import { ACTIVE_SET } from './set';

/**
 * Draft Academy set registry
 * ==========================
 * The list of sets a player can enter in the Draft Academy. This is the single
 * curation point for "what's available to draft right now" — it is meant to
 * mirror MTG Arena's live limited menu. When Arena rotates its Premier / Quick
 * Draft queues, edit THIS list (add an entry, flip a `status`) — nothing else.
 *
 * Card data is fetched per-set at draft time from Scryfall (booster cards) and
 * 17lands (win-rate ratings). Sets without 17lands coverage degrade to
 * heuristic ratings via the fail-soft path (see `providers/`), so every entry
 * here is playable even before 17lands publishes numbers.
 *
 * Note: full-bleed background art (`backgrounds.ts`) is scraped per-set and
 * currently only exists for the featured set; other sets draft against the
 * shared atmosphere. Per-set art is a future data op.
 */

export type SetStatus = 'live' | 'coming-soon';

export interface DraftableSet extends SetConfig {
  /** Availability in the Draft Academy right now. */
  status: SetStatus;
  /** Arena limited queue this maps to, e.g. "Premier Draft". */
  format: string;
  /** Short line for the set tile. */
  blurb: string;
  /** Featured set gets the hero tile + is the default draft. */
  featured?: boolean;
}

export const SETS: DraftableSet[] = [
  {
    ...ACTIVE_SET,
    status: 'live',
    format: 'Premier Draft',
    blurb: "Marvel's mightiest, drafted three packs deep.",
    featured: true,
  },
  {
    code: 'BLB',
    name: 'Bloomburrow',
    mtgpicsCode: 'blb',
    mtgpicsSetId: 0,
    status: 'live',
    format: 'Quick Draft',
    blurb: 'Woodland critters, big synergies, tight curves.',
  },
  {
    code: 'DSK',
    name: 'Duskmourn: House of Horror',
    mtgpicsCode: 'dsk',
    mtgpicsSetId: 0,
    status: 'live',
    format: 'Quick Draft',
    blurb: 'Survive the house — rooms, fear, and eerie value.',
  },
  {
    code: 'OTJ',
    name: 'Outlaws of Thunder Junction',
    mtgpicsCode: 'otj',
    mtgpicsSetId: 0,
    status: 'live',
    format: 'Quick Draft',
    blurb: 'Wild-west heists, crimes, and outlaw aggro.',
  },
  {
    code: 'MKM',
    name: 'Murders at Karlov Manor',
    mtgpicsCode: 'mkm',
    mtgpicsSetId: 0,
    status: 'coming-soon',
    format: 'Quick Draft',
    blurb: 'Collect clues and solve the case. Rotating in soon.',
  },
];

/** The featured set — the default draft when no set is chosen. */
export const FEATURED_SET: DraftableSet =
  SETS.find((s) => s.featured) ?? SETS[0];

/** Look up a set by its (case-insensitive) code. Returns undefined if unknown. */
export function getSet(code: string | undefined): DraftableSet | undefined {
  if (typeof code !== 'string' || !code) return undefined;
  const upper = code.toUpperCase();
  return SETS.find((s) => s.code.toUpperCase() === upper);
}
