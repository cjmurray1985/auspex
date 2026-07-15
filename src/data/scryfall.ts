import type { DraftCard, Rarity } from '../types';

const CACHE_KEY = (set: string) => `mtgdraft:cards:v5:${set}`;
const TOKEN_CACHE_KEY = (set: string) => `mtgdraft:tokens:v1:${set}`;
const CACHE_TTL = 1000 * 60 * 60 * 24 * 3; // 3 days

interface ScryfallCard {
  id: string;
  name: string;
  mana_cost?: string;
  cmc: number;
  colors?: string[];
  color_identity: string[];
  rarity: Rarity;
  type_line: string;
  oracle_text?: string;
  layout: string;
  collector_number: string;
  keywords?: string[];
  power?: string;
  toughness?: string;
  produced_mana?: string[];
  image_uris?: { normal: string; large: string; art_crop?: string };
  card_faces?: Array<{
    name: string;
    mana_cost?: string;
    type_line?: string;
    oracle_text?: string;
    colors?: string[];
    power?: string;
    toughness?: string;
    image_uris?: { normal: string; large: string; art_crop?: string };
  }>;
  all_parts?: Array<{ component: string; id: string; name: string; type_line: string }>;
}

function extractCreatureTypes(typeLine: string): string[] {
  const dash = typeLine.split('—');
  if (dash.length < 2 || !typeLine.includes('Creature')) return [];
  return dash[1].trim().split(/[\s/]+/).filter(Boolean);
}

function toDraftCard(c: ScryfallCard, tokenMap: Map<string, string>): DraftCard {
  const face = c.card_faces?.[0];
  const backFace = c.card_faces?.[1];
  const img = c.image_uris ?? face?.image_uris;
  const tokenImages = [
    ...new Set(
      (c.all_parts ?? [])
        .filter((p) => p.component === 'token')
        .map((p) => tokenMap.get(p.id))
        .filter((u): u is string => !!u),
    ),
  ];
  return {
    id: c.id,
    collectorNumber: c.collector_number,
    name: c.name,
    manaCost: c.mana_cost ?? face?.mana_cost ?? '',
    cmc: c.cmc,
    colors: c.colors ?? face?.colors ?? [],
    colorIdentity: c.color_identity,
    rarity: c.rarity,
    typeLine: c.type_line,
    oracleText: c.oracle_text ?? [face?.oracle_text, backFace?.oracle_text].filter(Boolean).join('\n//\n'),
    imageNormal: img?.normal ?? '',
    imageLarge: img?.large ?? img?.normal ?? '',
    artCrop: img?.art_crop,
    backImage: backFace?.image_uris?.large ?? backFace?.image_uris?.normal,
    tokenImages: tokenImages.length ? tokenImages : undefined,
    keywords: c.keywords ?? [],
    creatureTypes: extractCreatureTypes(face?.type_line ?? c.type_line),
    power: c.power ?? face?.power,
    toughness: c.toughness ?? face?.toughness,
    producedMana: c.produced_mana,
  };
}

/** Fetch the set's token cards (set code `t<code>`), mapped id → large image. */
async function fetchTokenMap(setCode: string): Promise<Map<string, string>> {
  const tokenSet = `t${setCode.toLowerCase()}`;
  const cached = localStorage.getItem(TOKEN_CACHE_KEY(setCode));
  if (cached) {
    try {
      return new Map(JSON.parse(cached));
    } catch {
      /* refetch */
    }
  }
  const map = new Map<string, string>();
  let url: string | undefined =
    `https://api.scryfall.com/cards/search?q=set%3A${tokenSet}&unique=cards`;
  try {
    while (url) {
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!res.ok) break; // no token set — fine, no tokens shown
      const page = await res.json();
      for (const t of page.data as ScryfallCard[]) {
        const im = t.image_uris ?? t.card_faces?.[0]?.image_uris;
        if (im) map.set(t.id, im.large ?? im.normal);
      }
      url = page.next_page;
      if (url) await new Promise((r) => setTimeout(r, 120));
    }
    // Only cache a non-empty result so a transient failure retries next load.
    if (map.size) {
      localStorage.setItem(TOKEN_CACHE_KEY(setCode), JSON.stringify([...map.entries()]));
    }
  } catch {
    /* offline — degrade to no token previews */
  }
  return map;
}

export async function fetchSetCards(setCode: string): Promise<DraftCard[]> {
  const cached = localStorage.getItem(CACHE_KEY(setCode));
  if (cached) {
    try {
      const { at, cards } = JSON.parse(cached);
      if (Date.now() - at < CACHE_TTL) return cards;
    } catch {
      /* fall through to refetch */
    }
  }

  const cards: ScryfallCard[] = [];
  let url: string | undefined =
    `https://api.scryfall.com/cards/search?q=set%3A${setCode}&unique=cards&order=set`;
  while (url) {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`Scryfall error ${res.status} for set ${setCode}`);
    const page = await res.json();
    cards.push(...page.data);
    url = page.next_page;
    if (url) await new Promise((r) => setTimeout(r, 120)); // be polite to Scryfall
  }

  const tokenMap = await fetchTokenMap(setCode);

  // Keep the draftable main set: numeric collector numbers within the set's
  // stated size, excluding basic lands.
  const draftable = cards
    .filter((c) => /^\d+$/.test(c.collector_number))
    .filter((c) => !c.type_line.startsWith('Basic Land'))
    .map((c) => toDraftCard(c, tokenMap))
    .filter((c) => c.imageNormal);

  try {
    localStorage.setItem(CACHE_KEY(setCode), JSON.stringify({ at: Date.now(), cards: draftable }));
  } catch {
    /* localStorage quota — fine, just skip caching */
  }
  return draftable;
}

/**
 * Hi-res illustration URL from mtgpics.com (~1500-3800px wide), far sharper
 * than Scryfall's ~626px art crops. mtgpics uses the same collector numbers
 * as Scryfall, zero-padded to three digits.
 */
export function mtgpicsArtUrl(setCode: string, collectorNumber: string): string | null {
  const n = collectorNumber.match(/^\d+$/) ? collectorNumber.padStart(3, '0') : null;
  if (!n) return null;
  return `https://www.mtgpics.com/pics/art/${setCode.toLowerCase()}/${n}.jpg`;
}

export const BASIC_LAND_NAMES: Record<string, string> = {
  W: 'Plains',
  U: 'Island',
  B: 'Swamp',
  R: 'Mountain',
  G: 'Forest',
};

const LANDS_CACHE_KEY = 'mtgdraft:basiclands';

/** Fetch real art for the five basic lands (cached indefinitely). */
export async function fetchBasicLandArt(): Promise<Record<string, string>> {
  const cached = localStorage.getItem(LANDS_CACHE_KEY);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      /* refetch */
    }
  }
  const art: Record<string, string> = {};
  for (const [color, name] of Object.entries(BASIC_LAND_NAMES)) {
    const res = await fetch(
      `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(name)}`,
      { headers: { Accept: 'application/json' } },
    );
    if (res.ok) {
      const card = await res.json();
      art[color] = card.image_uris?.normal ?? '';
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  try {
    localStorage.setItem(LANDS_CACHE_KEY, JSON.stringify(art));
  } catch {
    /* ignore quota */
  }
  return art;
}
