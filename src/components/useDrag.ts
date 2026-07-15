import { create } from 'zustand';
import type { RatedCard } from '../types';

/**
 * Global deck-builder drag state, in the spirit of `useHover`. A single source
 * of truth for "what card is being dragged" and "which drop target is under the
 * pointer", so the deck zone, columns, sideboard, and source card can all light
 * up in sync (Arena-style) without threading booleans through the tree.
 *
 * This store is deliberately the ONLY place that knows a drag is in progress:
 * the visual components subscribe to it and never touch the native DragEvent.
 * A future touch / pointer (or dnd-kit) implementation only has to reproduce
 * `begin` / `setOver` / `end` — no component or CSS needs to change.
 */

/**
 * Identifier for the drop target currently under the pointer. Columns are keyed
 * `col:<key>` (matching the mana-curve column key), plus the named zones.
 */
export type DropTarget = 'pool' | 'lands' | `col:${number}` | null;

interface DragState {
  /** The card being dragged, or null when no drag is in progress. */
  card: RatedCard | null;
  /** The drop target under the pointer, for the strong "insert here" cue. */
  over: DropTarget;
  begin: (card: RatedCard) => void;
  setOver: (over: DropTarget) => void;
  end: () => void;
}

export const useDrag = create<DragState>((set) => ({
  card: null,
  over: null,
  begin: (card) => set({ card, over: null }),
  setOver: (over) => set({ over }),
  end: () => set({ card: null, over: null }),
}));

/** Convenience selector: is any card currently being dragged? */
export const selectDragging = (s: DragState) => s.card !== null;
