/**
 * Active set configuration
 * ========================
 * The single source of truth for "which set are we drafting". Rotating to a new
 * set (roughly every ~3 months) should be a one-value config change here, not a
 * hunt through fetchers, the store, and the art layer.
 *
 * Everything set-specific flows from `ACTIVE_SET`:
 *  - `code`         → Scryfall + 17lands queries (`src/data/scryfall.ts`,
 *                     `src/data/seventeenlands.ts`)
 *  - `mtgpicsCode`  → hi-res background art paths (`src/data/backgrounds.ts`)
 *  - `mtgpicsSetId` → the mtgpics illustration index for that set
 *
 * Note: the scraped `ART` list in `backgrounds.ts` is itself set-specific data;
 * a full rotation swaps that list too. This config makes the *wiring* set-
 * agnostic so that data swap is the only remaining manual step.
 */
export interface SetConfig {
  /** Scryfall + 17lands set code (uppercase), e.g. "MSH". */
  code: string;
  /** Human-readable set name. */
  name: string;
  /** mtgpics art path segment (lowercase), usually the lowercased code. */
  mtgpicsCode: string;
  /** mtgpics illustration-index set id (the `?set=` number). */
  mtgpicsSetId: number;
}

export const ACTIVE_SET: SetConfig = {
  code: 'MSH',
  name: 'Marvel Super Heroes',
  mtgpicsCode: 'msh',
  mtgpicsSetId: 493,
};
