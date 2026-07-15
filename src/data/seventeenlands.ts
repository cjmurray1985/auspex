import type { ColorPairRating } from '../types';

const CACHE_TTL = 1000 * 60 * 60 * 12; // 12h — live-format data moves

export interface SeventeenLandsCard {
  name: string;
  avg_seen: number | null;
  avg_pick: number | null;
  ever_drawn_win_rate: number | null;
  drawn_improvement_win_rate: number | null;
  ever_drawn_game_count: number;
}

async function cachedFetch<T>(key: string, url: string): Promise<T | null> {
  const cached = localStorage.getItem(key);
  if (cached) {
    try {
      const { at, data } = JSON.parse(cached);
      if (Date.now() - at < CACHE_TTL) return data;
    } catch {
      /* refetch */
    }
  }
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const data = (await res.json()) as T;
    try {
      localStorage.setItem(key, JSON.stringify({ at: Date.now(), data }));
    } catch {
      /* quota */
    }
    return data;
  } catch {
    return null; // offline / blocked — the app degrades to heuristic ratings
  }
}

export async function fetchCardRatings(set: string): Promise<Map<string, SeventeenLandsCard>> {
  const data = await cachedFetch<SeventeenLandsCard[]>(
    `mtgdraft:17l:${set}`,
    `/17lands/card_ratings/data?expansion=${set}&event_type=PremierDraft`,
  );
  const map = new Map<string, SeventeenLandsCard>();
  if (!data) return map;
  for (const c of data) {
    map.set(c.name, c);
    // Index DFCs by front-face name too so Scryfall "A // B" names match.
    if (c.name.includes(' // ')) map.set(c.name.split(' // ')[0], c);
  }
  return map;
}

interface ColorRatingRow {
  is_summary: boolean;
  color_name: string;
  short_name: string | number;
  wins: number;
  games: number;
}

export async function fetchColorRatings(set: string): Promise<ColorPairRating[]> {
  const data = await cachedFetch<ColorRatingRow[]>(
    `mtgdraft:17lcolors:${set}`,
    `/17lands/color_ratings/data?expansion=${set}&event_type=PremierDraft&combine_splash=true`,
  );
  if (!data) return [];
  return data
    .filter((r) => !r.is_summary && typeof r.short_name === 'string' && r.games > 200)
    .map((r) => ({
      colors: r.short_name as string,
      winRate: r.wins / r.games,
      games: r.games,
    }));
}
