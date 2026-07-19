import { create } from 'zustand';

/**
 * Full-bleed background art, scraped from mtgpics.com's illustration index
 * per set. Art is keyed by mtgpics' own art number — NOT the card collector
 * number — so the pool includes tokens, basics, alternate arts and other pieces
 * that don't map 1:1 to a draftable card. Only pieces at least 1024px wide are
 * kept; the halftone overlay (see index.css) sharpens smaller ones on hi-dpi.
 *
 * Each set has its OWN curatable pool (see `SET_ART`). Sets without a scraped
 * pool render no background (clean gradient) until curated — mtgpics is the
 * only art source, so we never borrow another set's art.
 */
export interface ArtItem {
  /** mtgpics art number (path segment), zero-padded as stored on the CDN. */
  num: string;
  name: string;
  artist: string;
  w: number;
  h: number;
}

/** Hi-res illustration URL for a set's mtgpics code + art number. */
export function artUrl(mtgpicsCode: string, num: string): string {
  return `https://www.mtgpics.com/pics/art/${mtgpicsCode}/${num}.jpg`;
}

/** Smaller thumbnail (used by the curation gallery grid). */
export function artThumbUrl(mtgpicsCode: string, num: string): string {
  return `https://www.mtgpics.com/pics/art_th_big/${mtgpicsCode}/${num}.jpg`;
}

// Scraped 2026-07 from https://www.mtgpics.com/art?set=493&size=3 (all pages),
// filtered to width >= 1024. Sorted by card/piece name.
export const MSH_ART: ArtItem[] = [
  { num: '257', name: 'A.I.M. Labs', artist: 'Lixin Yin', w: 1440, h: 1057 },
  { num: '199', name: 'Absorbing Man', artist: 'Nathaniel Himawan', w: 2951, h: 2126 },
  { num: '002', name: 'Agent Maria Hill', artist: 'Jake Murray', w: 1080, h: 1080 },
  { num: '085', name: 'Agents of HYDRA', artist: 'Wero Gallo', w: 1740, h: 1257 },
  { num: '911', name: 'Alien', artist: 'Michele Giorgi', w: 1440, h: 1920 },
  { num: '201', name: 'Ant-Man, Colony Commander', artist: 'Nathaniel Himawan', w: 2951, h: 2126 },
  { num: '087', name: 'Baron Helmut Zemo', artist: 'Wero Gallo', w: 1920, h: 1387 },
  { num: '1005', name: 'Black Panther, Hope Enduring', artist: 'Eric Wilkerson', w: 2000, h: 1479 },
  { num: '393', name: 'Black Widow, Super Spy', artist: 'Emanuela Lupacchino', w: 1080, h: 1302 },
  { num: '007', name: 'Borough Backup', artist: 'Gal Or', w: 1174, h: 862 },
  { num: '209', name: 'Bullseye, Death Dealer', artist: 'Bartek Fedyczak', w: 1386, h: 1016 },
  { num: '009', name: 'Captain America, Super-Soldier', artist: 'Anna Podedworna', w: 1387, h: 1000 },
  { num: '011', name: "Captain Marvel, Earth's Protector", artist: 'Victor Adame Minguez', w: 1152, h: 1440 },
  { num: '263', name: 'Castle Doom', artist: 'Nino Is', w: 1073, h: 784 },
  { num: '126', name: 'Crimson Operative', artist: 'Kevin Glint', w: 3840, h: 2821 },
  { num: '014', name: 'Crowd of True Believers', artist: 'Michele Giorgi', w: 1440, h: 1058 },
  { num: '093', name: 'Dark Deed', artist: 'Lixin Yin', w: 1440, h: 1057 },
  { num: '380', name: 'Dark Fortress', artist: 'David Alvarez', w: 1187, h: 1440 },
  { num: '164', name: 'Doc Samson, Super Psychiatrist', artist: 'Ryan Pancoast', w: 3000, h: 2237 },
  { num: '394', name: 'Doctor Doom', artist: 'Larry Lieber', w: 1821, h: 2800 },
  { num: '095', name: 'Doctor Doom', artist: 'David Palumbo', w: 1500, h: 1125 },
  { num: '096', name: 'Doom Reigns Supreme', artist: 'Alexander Gering', w: 1080, h: 810 },
  { num: '918', name: 'Doombot', artist: 'L J Koh', w: 1440, h: 1920 },
  { num: '097', name: 'Elektra, Daughter of the Hand', artist: 'Bastien L. Deharme', w: 2000, h: 1636 },
  { num: '053', name: "Falcon's Wing Harness", artist: 'David Alvarez', w: 1920, h: 1410 },
  { num: '381', name: 'Gathering Place', artist: 'David Alvarez', w: 1042, h: 1273 },
  { num: '167', name: 'Giant Growth', artist: 'Andreia Ugrai', w: 1800, h: 1321 },
  { num: '382', name: 'Gleaming Bastion', artist: 'David Alvarez', w: 1184, h: 1440 },
  { num: '169', name: 'Guerrilla Gorilla', artist: 'Michele Giorgi', w: 1440, h: 1057 },
  { num: '247', name: 'H.E.R.B.I.E. Scout Unit', artist: 'David Alvarez', w: 1920, h: 1410 },
  { num: '268', name: "Hell's Kitchen", artist: 'Shahab Alizadeh', w: 1439, h: 1057 },
  { num: '170', name: 'Hellcat, Undying Vigilante', artist: 'Solan', w: 2500, h: 1701 },
  { num: '016', name: 'Hero in Training', artist: 'Taurin Clarke', w: 1080, h: 810 },
  { num: '172', name: 'Heroic Feast', artist: 'Javier Charro', w: 1433, h: 1052 },
  { num: '133', name: 'Hex Magic', artist: 'Kevin Glint', w: 3840, h: 2821 },
  { num: '383', name: 'Hidden Lair', artist: 'David Alvarez', w: 1184, h: 1440 },
  { num: '134', name: 'Hire a Crew', artist: 'Lordigan', w: 1080, h: 810 },
  { num: '099', name: 'Hour of Defeat', artist: 'Jake Murray', w: 1080, h: 1080 },
  { num: '135', name: 'HULK SMASH!', artist: 'Chris Rahn', w: 2880, h: 2139 },
  { num: '215', name: 'Hulk, Gamma Goliath', artist: 'Zezhou Chen', w: 1334, h: 1209 },
  { num: '173', name: 'Hulkling, Burgeoning Bruiser', artist: 'Wero Gallo', w: 1920, h: 1387 },
  { num: '137', name: 'HYDRA Assault Robot', artist: 'Wero Gallo', w: 1740, h: 1257 },
  { num: '100', name: 'HYDRA Infiltration', artist: 'Eli Minaya', w: 1440, h: 1058 },
  { num: '057', name: 'Hydraulic Helper', artist: 'Kevin Glint', w: 3840, h: 2821 },
  { num: '248', name: 'Iron Man Armor', artist: 'Javier Charro', w: 1440, h: 1043 },
  { num: '018', name: 'Jennifer Walters', artist: 'Taurin Clarke', w: 2954, h: 2131 },
  { num: '174', name: 'Ka-Zar of the Savage Land', artist: 'Paolo Parente', w: 1678, h: 1168 },
  { num: '217', name: 'Kang, Temporal Tyrant', artist: 'David Szabo', w: 1438, h: 1036 },
  { num: '218', name: 'Killmonger, Scourge of Wakanda', artist: 'Sean Vo', w: 2965, h: 2143 },
  { num: '103', name: 'Klaw, Sonic Subjugator', artist: 'Andreia Ugrai', w: 1800, h: 1297 },
  { num: '142', name: 'Lightning Strike', artist: 'Toni Infante', w: 1844, h: 1326 },
  { num: '270', name: 'Los Diablos Missile Base', artist: 'Rockey Chen', w: 3822, h: 2810 },
  { num: '144', name: 'Machinesmith Automaton', artist: 'Wero Gallo', w: 1740, h: 1257 },
  { num: '906', name: 'Merfolk', artist: 'Eilene Cherie', w: 1440, h: 1920 },
  { num: '176', name: 'Mister Hyde, Monster Within', artist: 'Svetlin Velinov', w: 1600, h: 1153 },
  { num: '177', name: 'Mole Man, Moloid Master', artist: 'Michele Giorgi', w: 1440, h: 1038 },
  { num: '913', name: 'Moloid', artist: 'Genel Jumalon', w: 1075, h: 1433 },
  { num: '023', name: 'Monica Rambeau', artist: 'Xabi Gaztelua', w: 1248, h: 900 },
  { num: '223', name: 'Moon Girl and Devil Dinosaur', artist: 'Zezhou Chen', w: 1500, h: 1082 },
  { num: '107', name: 'Moonstone, Harsh Mistress', artist: 'Grace Zhu', w: 1419, h: 1023 },
  { num: '293', name: 'Mountain', artist: 'Rockey Chen', w: 3334, h: 2451 },
  { num: '068', name: 'Multiversal Incursion', artist: 'Lordigan', w: 3840, h: 2768 },
  { num: '024', name: "Murdock's Crusade", artist: 'Gal Or', w: 1174, h: 862 },
  { num: '026', name: 'Night Nurse, Healer of Heroes', artist: 'Gal Or', w: 1152, h: 830 },
  { num: '027', name: 'Okoye, Dora Milaje Leader', artist: 'LA Draws', w: 2951, h: 2126 },
  { num: '178', name: 'Pet Avengers', artist: 'Leesha Hannigan', w: 1200, h: 881 },
  { num: '147', name: 'Photon Blast Barrage', artist: 'Immanuela Crovius', w: 1550, h: 1118 },
  { num: '032', name: 'Quake, Agent of S.H.I.E.L.D.', artist: 'Solan', w: 2500, h: 1802 },
  { num: '182', name: 'Reptil, Dinomorpher', artist: 'Paolo Parente', w: 1676, h: 1163 },
  { num: '183', name: 'Restorative Technique', artist: 'Kevin Glint', w: 4000, h: 2938 },
  { num: '920', name: 'Robot Villain', artist: 'L J Koh', w: 1440, h: 1920 },
  { num: '112', name: 'Ronin, Shadow Stalker', artist: 'Lie Setiawan', w: 1440, h: 1038 },
  { num: '225', name: 'Scientist Supreme of A.I.M.', artist: 'Gal Or', w: 1152, h: 830 },
  { num: '075', name: 'Shuri, Wakandan Inventor', artist: 'Wayne Wu', w: 1775, h: 1280 },
  { num: '228', name: 'Spider-Man, To the Rescue', artist: 'Anna Podedworna', w: 1438, h: 1036 },
  { num: '914', name: 'Squirrel', artist: 'Brooklyn Smith', w: 1920, h: 2602 },
  { num: '153', name: 'Stark Industries Executive', artist: 'Xabi Gaztelua', w: 1225, h: 900 },
  { num: '114', name: 'Stolen Stark Tech', artist: 'Lixin Yin', w: 1440, h: 1057 },
  { num: '230', name: 'Storm, Windrider', artist: 'Immanuela Crovius', w: 1550, h: 1118 },
  { num: '077', name: 'Super Intelligence', artist: 'Michele Giorgi', w: 1440, h: 1057 },
  { num: '204', name: 'The Astonishing Ant-Man', artist: 'Randy Gallegos', w: 1125, h: 843 },
  { num: '222', name: 'The Mighty Thor, Jane Foster', artist: 'Victor Adame Minguez', w: 1212, h: 1440 },
  { num: '021', name: 'The Mind Stone', artist: 'Volkan Baga', w: 1389, h: 1000 },
  { num: '385', name: 'The Mind Stone', artist: 'Madeline Boni', w: 1080, h: 1350 },
  { num: '1019', name: 'The Sensational She-Hulk', artist: 'John Buscema', w: 1821, h: 2800 },
  { num: '1016', name: 'The Sensational She-Hulk', artist: 'Taurin Clarke', w: 2954, h: 2131 },
  { num: '255', name: 'The Vision', artist: 'Carissa Susilo', w: 1440, h: 1041 },
  { num: '084', name: 'The Wondrous Wasp', artist: 'Gal Or', w: 1600, h: 1153 },
  { num: '234', name: 'Thor Odinson', artist: 'Sean Vo', w: 2965, h: 2143 },
  { num: '156', name: 'Thor, God of Thunder', artist: 'Jesper Ejsing', w: 1440, h: 1089 },
  { num: '191', name: 'Tigra, Feline Fury', artist: 'Ben Harvey', w: 1438, h: 1125 },
  { num: '081', name: "Trickster's Stratagem", artist: 'David Palumbo', w: 1500, h: 1125 },
  { num: '194', name: 'Undercover Skrull', artist: 'Svetlin Velinov', w: 1600, h: 1175 },
  { num: '909', name: 'Villain', artist: 'Thanh Tuan', w: 2000, h: 2710 },
  { num: '158', name: 'Vision of Love', artist: 'Lixin Yin', w: 1440, h: 1057 },
  { num: '195', name: 'Wakandan Royal Guard', artist: 'Randy Gallegos', w: 1500, h: 1134 },
  { num: '238', name: 'War Machine, Legacy of Iron', artist: 'Carlos Dattoli', w: 1413, h: 1048 },
  { num: '082', name: 'We Say Thee Nay!', artist: 'Mateus Manhanini', w: 2150, h: 1550 },
  { num: '304', name: 'World War Hulk', artist: 'Steve Ellis', w: 1515, h: 1703 },
  { num: '916', name: 'Zabu', artist: 'Rhonda Libbey', w: 2357, h: 3000 },
];

/**
 * Per-set curatable art pools, keyed by set code. Only sets with a scraped list
 * appear here; any set not present renders the clean gradient (no borrowed art).
 * Add a set by scraping mtgpics `art?set=<id>` (width >= 1024) into a new list,
 * exactly like `MSH_ART`, and registering it here.
 */
export const SET_ART: Record<string, ArtItem[]> = {
  MSH: MSH_ART,
};

/** The curatable art pool for a set code (empty if none scraped yet). */
export function artForSet(code: string): ArtItem[] {
  return SET_ART[code] ?? [];
}

/** Minimum art width (px) eligible for the background rotation. */
export const BG_MIN_WIDTH = 1024;

const LS_KEY = 'mtgdraft:bgExcluded:v2';
const LEGACY_KEY = 'mtgdraft:bgExcluded:v1';

/** Per-set exclusions: { [setCode]: excludedArtNumbers }. */
type ExcludedMap = Record<string, string[]>;

function loadExcluded(): ExcludedMap {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw) as ExcludedMap;
    // Migrate the v1 flat list (MSH-only era) into the MSH bucket.
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) return { MSH: JSON.parse(legacy) as string[] };
  } catch {
    /* ignore malformed prefs */
  }
  return {};
}

interface BgPrefsStore {
  /** Per-set art numbers the user has unchecked (removed from the rotation). */
  excluded: ExcludedMap;
  toggle: (setCode: string, num: string) => void;
  isExcluded: (setCode: string, num: string) => boolean;
}

/**
 * Persisted background-selection store, shared between the live Background and
 * the #bg-gallery curation tool so unchecking a piece removes it everywhere —
 * now scoped per set so curating one set never affects another.
 */
export const useBgPrefs = create<BgPrefsStore>((set, get) => ({
  excluded: loadExcluded(),
  toggle: (setCode, num) => {
    const cur = new Set(get().excluded[setCode] ?? []);
    if (cur.has(num)) cur.delete(num);
    else cur.add(num);
    const next = { ...get().excluded, [setCode]: [...cur] };
    localStorage.setItem(LS_KEY, JSON.stringify(next));
    set({ excluded: next });
  },
  isExcluded: (setCode, num) => (get().excluded[setCode] ?? []).includes(num),
}));
