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
  /**
   * Card whose art fronts this set's tile on the landing. To change the art a
   * set shows, swap `cn` (that card's collector number in this set) — the tile
   * pulls the stable art crop straight from Scryfall (see `setArtUrl`).
   */
  art?: { cn: string; card: string; artist: string };
}

/** Stable Scryfall art-crop URL for a set's tile art (null if none set). */
export function setArtUrl(set: DraftableSet): string | null {
  if (!set.art) return null;
  return `https://api.scryfall.com/cards/${set.code.toLowerCase()}/${set.art.cn}?format=image&version=art_crop`;
}

/** Scryfall monochrome set-symbol SVG for a set. */
export function setSymbolUrl(set: DraftableSet): string {
  return `https://svgs.scryfall.io/sets/${set.code.toLowerCase()}.svg`;
}

export const SETS: DraftableSet[] = [
  {
    ...ACTIVE_SET,
    status: 'live',
    format: 'Premier Draft',
    blurb: "Marvel's mightiest, drafted three packs deep.",
    featured: true,
    art: { cn: '233', card: 'Thanos, the Mad Titan', artist: 'Björn Barends' },
  },
  {
    code: 'ECL',
    name: 'Lorwyn Eclipsed',
    mtgpicsCode: 'ecl',
    mtgpicsSetId: 0,
    status: 'live',
    format: 'Quick Draft',
    blurb: 'Return to Lorwyn under an eclipse — tribal synergies and moonlight.',
    art: { cn: '252', card: 'Wistfulness', artist: 'Jesper Ejsing' },
  },
  {
    code: 'DFT',
    name: 'Aetherdrift',
    mtgpicsCode: 'dft',
    mtgpicsSetId: 0,
    status: 'live',
    format: 'Flashback Draft',
    blurb: 'A high-speed race across worlds — Vehicles, Exhaust, and Start your engines.',
    art: { cn: '212', card: 'Loot, the Pathfinder', artist: 'Ernanda Souza' },
  },
  {
    code: 'OTJ',
    name: 'Outlaws of Thunder Junction',
    mtgpicsCode: 'otj',
    mtgpicsSetId: 0,
    status: 'live',
    format: 'Quick Draft',
    blurb: 'Wild-west heists, crimes, and outlaw aggro.',
    art: { cn: '213', card: 'Kellan, the Kid', artist: 'Magali Villeneuve' },
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
