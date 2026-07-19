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
export const ECL_ART: ArtItem[] = [
  { num: '204', name: "Abigale, Eloquent First-Year", artist: "Mark Zug", w: 2048, h: 1538 },
  { num: '003', name: "Adept Watershaper", artist: "Pauline Voss", w: 1440, h: 1038 },
  { num: '297', name: "Adept Watershaper", artist: "Julie Benbassat", w: 1440, h: 1105 },
  { num: '284', name: "Ajani, Outland Chaperone", artist: "Greg Staples", w: 1920, h: 1080 },
  { num: '005', name: "Appeal to Eirdu", artist: "Milivoj Ceran", w: 1276, h: 969 },
  { num: '205', name: "Ashling's Command", artist: "Iris Compiet", w: 1920, h: 1080 },
  { num: '124', name: "Ashling, Rekindled", artist: "Ilse Gort", w: 1920, h: 995 },
  { num: '1001', name: "Ashling, Rimebound", artist: "Ilse Gort", w: 1280, h: 923 },
  { num: '164', name: "Assert Perfection", artist: "Matt Stewart", w: 1440, h: 1080 },
  { num: '323', name: "Aurora Awakener", artist: "Matthew Forsythe", w: 1080, h: 909 },
  { num: '165', name: "Aurora Awakener", artist: "Paolo Parente", w: 1883, h: 1338 },
  { num: '006', name: "Bark of Doran", artist: "Jorge Jacinto", w: 1440, h: 1058 },
  { num: '352', name: "Bitterbloom Bearer", artist: "Rebecca Guay", w: 1253, h: 1223 },
  { num: '088', name: "Bitterbloom Bearer", artist: "Chris Rahn", w: 1766, h: 1412 },
  { num: '089', name: "Blight Rot", artist: "Forrest Schehl", w: 1920, h: 1080 },
  { num: '262', name: "Blood Crypt", artist: "Adam Paquette", w: 1700, h: 1226 },
  { num: '091', name: "Bloodline Bidding", artist: "Drew Baker", w: 2000, h: 1442 },
  { num: '166', name: "Bloom Tender", artist: "Nils Hamm", w: 1200, h: 862 },
  { num: '324', name: "Bloom Tender", artist: "Danny Schwartz", w: 2000, h: 1534 },
  { num: '167', name: "Blossoming Defense", artist: "Eelis Kyttanen", w: 2000, h: 1444 },
  { num: '206', name: "Boggart Cursecrafter", artist: "Alex Stone", w: 1200, h: 900 },
  { num: '125', name: "Boldwyr Aggressor", artist: "Aaron Miller", w: 1440, h: 1075 },
  { num: '128', name: "Brambleback Brute", artist: "Aaron Miller", w: 1920, h: 1080 },
  { num: '207', name: "Bre of Clan Stoutarm", artist: "Jesper Ejsing", w: 2048, h: 1486 },
  { num: '208', name: "Brigid's Command", artist: "Sam Guay", w: 2000, h: 1442 },
  { num: '007', name: "Brigid, Clachan's Heart", artist: "Zoltan Boros", w: 1920, h: 1080 },
  { num: '285', name: "Brigid, Clachan's Heart", artist: "Jesper Ejsing", w: 1440, h: 1070 },
  { num: '1019', name: "Brigid, Doun's Mind", artist: "Zoltan Boros", w: 1920, h: 1080 },
  { num: '1018', name: "Brigid, Doun's Mind", artist: "Jesper Ejsing", w: 1440, h: 1412 },
  { num: '169', name: "Bristlebane Outrider", artist: "Ryan Pancoast", w: 2000, h: 1539 },
  { num: '008', name: "Burdened Stoneback", artist: "Carl Critchlow", w: 1760, h: 1281 },
  { num: '326', name: "Celestial Reunion", artist: "Serena Malyon", w: 1500, h: 1151 },
  { num: '170', name: "Celestial Reunion", artist: "Justin Gerard", w: 1200, h: 900 },
  { num: '009', name: "Champion of the Clachan", artist: "Edgar Snchez Hidalgo", w: 1920, h: 1384 },
  { num: '130', name: "Champion of the Path", artist: "Tyler Walpole", w: 1679, h: 1220 },
  { num: '095', name: "Champion of the Weird", artist: "Lucas Graciano", w: 1440, h: 1076 },
  { num: '171', name: "Champions of the Perfect", artist: "Chris Rahn", w: 1817, h: 1440 },
  { num: '131', name: "Cinder Strike", artist: "Joshua Raphael", w: 1439, h: 1057 },
  { num: '010', name: "Clachan Festival", artist: "Kev Fang", w: 1099, h: 807 },
  { num: '132', name: "Collective Inferno", artist: "Jason A. Engle", w: 1500, h: 1081 },
  { num: '011', name: "Crib Swap", artist: "Pete Venters", w: 2000, h: 1493 },
  { num: '173', name: "Crossroads Watcher", artist: "Aurore Folny", w: 1389, h: 1021 },
  { num: '013', name: "Curious Colossus", artist: "Raoul Vitale", w: 1280, h: 923 },
  { num: '174', name: "Dawn's Light Archer", artist: "Scott Gustafson", w: 1440, h: 1080 },
  { num: '254', name: "Dawn-Blessed Pennant", artist: "Igor Krstic", w: 2000, h: 1468 },
  { num: '098', name: "Dawnhand Dissident", artist: "Jacob Walker", w: 1433, h: 1033 },
  { num: '099', name: "Dawnhand Eulogist", artist: "Evyn Fong", w: 1200, h: 881 },
  { num: '212', name: "Deceit", artist: "Svetlin Velinov", w: 1440, h: 1038 },
  { num: '293', name: "Deceit", artist: "Kev Walker", w: 1280, h: 720 },
  { num: '213', name: "Deepchannel Duelist", artist: "Richard Kane Ferguson", w: 2000, h: 1483 },
  { num: '214', name: "Deepway Navigator", artist: "Jacob Walker", w: 2048, h: 1536 },
  { num: '047', name: "Disruptor of Currents", artist: "Pauline Voss", w: 2732, h: 1972 },
  { num: '303', name: "Disruptor of Currents", artist: "Julie Benbassat", w: 1440, h: 1105 },
  { num: '215', name: "Doran, Besieged by Time", artist: "Carl Critchlow", w: 1744, h: 1257 },
  { num: '334', name: "Doran, Besieged by Time", artist: "Serena Malyon", w: 1600, h: 1147 },
  { num: '100', name: "Dose of Dawnglow", artist: "Quintin Gleim", w: 2000, h: 1508 },
  { num: '101', name: "Dream Seizer", artist: "Omar Rayyan", w: 1920, h: 1080 },
  { num: '175', name: "Dundoolin Weaver", artist: "Olivier Bernard", w: 1439, h: 1057 },
  { num: '218', name: "Eclipsed Elf", artist: "Jason A. Engle", w: 1920, h: 1080 },
  { num: '337', name: "Eclipsed Flamekin", artist: "Vanessa Gillings", w: 1440, h: 1104 },
  { num: '220', name: "Eclipsed Kithkin", artist: "Filip Burburan", w: 1999, h: 1467 },
  { num: '339', name: "Eclipsed Merrow", artist: "Felicita Sala", w: 1440, h: 1236 },
  { num: '221', name: "Eclipsed Merrow", artist: "Chris Rahn", w: 2048, h: 1632 },
  { num: '263', name: "Eclipsed Realms", artist: "Alayna Danner", w: 1920, h: 1080 },
  { num: '012', name: "Eirdu, Carrier of Dawn", artist: "Lucas Graciano", w: 1920, h: 1080 },
  { num: '133', name: "Elder Auntie", artist: "Caio Monteiro", w: 1960, h: 1440 },
  { num: '602', name: "Elk", artist: "Sam Guay", w: 1476, h: 2000 },
  { num: '294', name: "Emptiness", artist: "Jeff Miracola", w: 1329, h: 2000 },
  { num: '222', name: "Emptiness", artist: "Ryan Pancoast", w: 2000, h: 1543 },
  { num: '014', name: "Encumbered Reejerey", artist: "Jeff Miracola", w: 1440, h: 1057 },
  { num: '134', name: "End-Blaze Epiphany", artist: "Tyler Walpole", w: 1522, h: 1164 },
  { num: '015', name: "Evershrike's Gift", artist: "Drew Tucker", w: 1440, h: 1440 },
  { num: '264', name: "Evolving Wilds", artist: "Alayna Danner", w: 1920, h: 1080 },
  { num: '136', name: "Explosive Prodigy", artist: "Joshua Raphael", w: 1439, h: 1057 },
  { num: '224', name: "Figure of Fable", artist: "Omar Rayyan", w: 1712, h: 1270 },
  { num: '255', name: "Firdoch Core", artist: "Jason A. Engle", w: 1500, h: 1102 },
  { num: '138', name: "Flame-Chain Mauler", artist: "Kai Carpenter", w: 1440, h: 1057 },
  { num: '139', name: "Flamebraider", artist: "Pete Venters", w: 2000, h: 1491 },
  { num: '140', name: "Flamekin Gildweaver", artist: "Aurore Folny", w: 1334, h: 980 },
  { num: '048', name: "Flitterwing Nuisance", artist: "Evyn Fong", w: 1997, h: 1440 },
  { num: '304', name: "Flitterwing Nuisance", artist: "Serena Malyon", w: 1400, h: 1074 },
  { num: '016', name: "Flock Impostor", artist: "Ilse Gort", w: 1920, h: 1080 },
  { num: '256', name: "Foraging Wickermaw", artist: "Ron Spencer", w: 1280, h: 941 },
  { num: '273', name: "Forest", artist: "Jorge Jacinto", w: 1440, h: 1058 },
  { num: '176', name: "Formidable Speaker", artist: "Aurore Folny", w: 1920, h: 1080 },
  { num: '017', name: "Gallant Fowlknight", artist: "Edgar Snchez Hidalgo", w: 1920, h: 1080 },
  { num: '226', name: "Gangly Stompling", artist: "Scott Murphy", w: 1500, h: 1088 },
  { num: '257', name: "Gathering Stone", artist: "Paolo Parente", w: 1440, h: 996 },
  { num: '177', name: "Gilt-Leaf's Embrace", artist: "Volkan Baga", w: 1600, h: 1181 },
  { num: '051', name: "Glen Elendra Guardian", artist: "Yohann Schepacz", w: 1920, h: 1080 },
  { num: '305', name: "Glen Elendra Guardian", artist: "Danny Schwartz", w: 2000, h: 1534 },
  { num: '052', name: "Glen Elendra's Answer", artist: "Sam Guay", w: 2000, h: 1442 },
  { num: '227', name: "Glister Bairn", artist: "Nils Hamm", w: 1960, h: 1440 },
  { num: '142', name: "Goatnap", artist: "Vincent Christiaens", w: 2048, h: 1504 },
  { num: '018', name: "Goldmeadow Nomad", artist: "Paolo Parente", w: 1700, h: 1196 },
  { num: '316', name: "Goliath Daydreamer", artist: "Vanessa Gillings", w: 1876, h: 1440 },
  { num: '053', name: "Gravelgill Scoundrel", artist: "John Tedrick", w: 1920, h: 1080 },
  { num: '178', name: "Great Forest Druid", artist: "Pete Venters", w: 2048, h: 1542 },
  { num: '144', name: "Gristle Glutton", artist: "Filip Burburan", w: 1078, h: 784 },
  { num: '340', name: "Grub's Command", artist: "Phoebe Wahl", w: 1509, h: 1232 },
  { num: '228', name: "Grub's Command", artist: "Iris Compiet", w: 1654, h: 1192 },
  { num: '1016', name: "Grub, Notorious Auntie", artist: "Jesper Ejsing", w: 2048, h: 1526 },
  { num: '105', name: "Grub, Storied Matriarch", artist: "Jesper Ejsing", w: 1440, h: 1069 },
  { num: '106', name: "Gutsplitter Gang", artist: "Tyler Walpole", w: 1429, h: 1034 },
  { num: '265', name: "Hallowed Fountain", artist: "Adam Paquette", w: 1700, h: 1186 },
  { num: '054', name: "Harmonized Crescendo", artist: "Tyler Walpole", w: 1579, h: 1170 },
  { num: '317', name: "Hexing Squelcher", artist: "Matthew Forsythe", w: 1920, h: 1080 },
  { num: '145', name: "Hexing Squelcher", artist: "Matt Stewart", w: 1440, h: 1080 },
  { num: '229', name: "High Perfect Morcant", artist: "Victor Adame Minguez", w: 1080, h: 810 },
  { num: '146', name: "Impolite Entrance", artist: "Scott Murphy", w: 1500, h: 1078 },
  { num: '108', name: "Iron-Shield Elf", artist: "Adrin Rodrguez Prez", w: 1920, h: 1410 },
  { num: '1002', name: "Isilu, Carrier of Twilight", artist: "Lucas Graciano", w: 1920, h: 1080 },
  { num: '019', name: "Keep Out", artist: "Ron Spencer", w: 1920, h: 1080 },
  { num: '020', name: "Kinbinding", artist: "Caio Monteiro", w: 1997, h: 1440 },
  { num: '147', name: "Kindle the Inner Flame", artist: "Jeff Miracola", w: 1500, h: 1101 },
  { num: '300', name: "Kinscaer Sentry", artist: "Felicita Sala", w: 1440, h: 1238 },
  { num: '231', name: "Kirol, Attentive First-Year", artist: "Evyn Fong", w: 1920, h: 1080 },
  { num: '023', name: "Kithkeeper", artist: "Filip Burburan", w: 2000, h: 1473 },
  { num: '056', name: "Kulrath Mystic", artist: "Jason A. Engle", w: 1500, h: 1102 },
  { num: '148', name: "Kulrath Zealot", artist: "Karl Kopinski", w: 1363, h: 999 },
  { num: '318', name: "Lavaleaper", artist: "Matthew Forsythe", w: 1440, h: 1440 },
  { num: '024', name: "Liminal Hold", artist: "Ovidio Cartagena", w: 2000, h: 1495 },
  { num: '057', name: "Loch Mare", artist: "Chris Rahn", w: 1811, h: 1439 },
  { num: '058', name: "Lofty Dreams", artist: "Steven Belledin", w: 1603, h: 1200 },
  { num: '179', name: "Luminollusk", artist: "Maxime Minard", w: 1920, h: 1524 },
  { num: '181', name: "Lys Alana Informant", artist: "Sidharth Chaturvedi", w: 1440, h: 1070 },
  { num: '608', name: "Merfolk", artist: "Julia Griffin", w: 1350, h: 1829 },
  { num: '308', name: "Mirrorform", artist: "Felicita Sala", w: 1440, h: 1238 },
  { num: '184', name: "Moon-Vigil Adherents", artist: "David Palumbo", w: 1500, h: 1125 },
  { num: '109', name: "Moonglove Extractor", artist: "Milivoj Ceran", w: 1300, h: 961 },
  { num: '026', name: "Moonlit Lamenter", artist: "Steve Ellis", w: 1170, h: 845 },
  { num: '313', name: "Moonshadow", artist: "Julie Benbassat", w: 2000, h: 1534 },
  { num: '110', name: "Moonshadow", artist: "Olivier Bernard", w: 1440, h: 1038 },
  { num: '185', name: "Morcant's Eyes", artist: "David Palumbo", w: 1500, h: 1125 },
  { num: '027', name: "Morningtide's Light", artist: "Mark Poole", w: 1920, h: 1080 },
  { num: '111', name: "Mornsong Aria", artist: "Scott M. Fischer", w: 1079, h: 1358 },
  { num: '112', name: "Mudbutton Cursetosser", artist: "Ioannis Fiore", w: 1960, h: 1440 },
  { num: '327', name: "Mutable Explorer", artist: "Felicita Sala", w: 1440, h: 1238 },
  { num: '113', name: "Nameless Inversion", artist: "Dominik Mayer", w: 1063, h: 790 },
  { num: '114', name: "Nightmare Sower", artist: "Tommy Arnold", w: 3334, h: 2449 },
  { num: '061', name: "Oko, Lorwyn Liege", artist: "Kai Carpenter", w: 1440, h: 1908 },
  { num: '287', name: "Oko, Lorwyn Liege", artist: "Steve Prescott", w: 1181, h: 1479 },
  { num: '1012', name: "Oko, Shadowmoor Scion", artist: "Kai Carpenter", w: 1920, h: 1080 },
  { num: '1014', name: "Oko, Shadowmoor Scion", artist: "Steve Prescott", w: 1258, h: 1621 },
  { num: '266', name: "Overgrown Tomb", artist: "Adam Paquette", w: 1700, h: 1226 },
  { num: '1009', name: "Overgrown Tomb", artist: "Matt Stewart", w: 1198, h: 1500 },
  { num: '350', name: "Overgrown Tomb", artist: "Matt Stewart", w: 1197, h: 1500 },
  { num: '115', name: "Perfect Intimidation", artist: "Heather Hudson", w: 1920, h: 1280 },
  { num: '029', name: "Protective Response", artist: "Gustavo Pelissari", w: 1440, h: 1058 },
  { num: '259', name: "Puca's Eye", artist: "Dan Frazier", w: 2048, h: 1536 },
  { num: '030', name: "Pyrrhic Strike", artist: "Randy Vargas", w: 2000, h: 1469 },
  { num: '240', name: "Reaping Willow", artist: "Igor Krstic", w: 2047, h: 1503 },
  { num: '152', name: "Reckless Ransacking", artist: "Daren Bader", w: 1920, h: 1080 },
  { num: '031', name: "Reluctant Dounguard", artist: "Paolo Parente", w: 1440, h: 1011 },
  { num: '116', name: "Requiting Hex", artist: "Randy Gallegos", w: 1500, h: 1125 },
  { num: '032', name: "Rhys, the Evermore", artist: "Kai Carpenter", w: 1920, h: 1080 },
  { num: '064', name: "Rime Chill", artist: "Igor Krstic", w: 2048, h: 1480 },
  { num: '065', name: "Rimefire Torque", artist: "Jorge Jacinto", w: 1428, h: 1048 },
  { num: '066', name: "Rimekin Recluse", artist: "Aurore Folny", w: 1920, h: 1080 },
  { num: '033', name: "Riverguard's Reflexes", artist: "Lucas Graciano", w: 1440, h: 1080 },
  { num: '002', name: "Rooftop Percher", artist: "Nils Hamm", w: 1200, h: 954 },
  { num: '067', name: "Run Away Together", artist: "Annie Stegg", w: 1200, h: 881 },
  { num: '191', name: "Safewright Cavalry", artist: "Milivoj Ceran", w: 1300, h: 965 },
  { num: '241', name: "Sanar, Innovative First-Year", artist: "Steven Belledin", w: 1200, h: 932 },
  { num: '328', name: "Sapling Nursery", artist: "Julie Benbassat", w: 1440, h: 1105 },
  { num: '192', name: "Sapling Nursery", artist: "Vincent Christiaens", w: 1920, h: 1080 },
  { num: '320', name: "Scuzzback Scrounger", artist: "Matthew Forsythe", w: 2000, h: 1728 },
  { num: '153', name: "Scuzzback Scrounger", artist: "Mark Zug", w: 1280, h: 934 },
  { num: '154', name: "Sear", artist: "Lars Grant-West", w: 1500, h: 1128 },
  { num: '193', name: "Selfless Safewright", artist: "Quintin Gleim", w: 1110, h: 800 },
  { num: '242', name: "Shadow Urchin", artist: "Ron Spencer", w: 1280, h: 927 },
  { num: '120', name: "Shimmercreep", artist: "Nils Hamm", w: 1972, h: 1439 },
  { num: '194', name: "Shimmerwilds Growth", artist: "Jorge Jacinto", w: 1440, h: 1073 },
  { num: '068', name: "Shinestriker", artist: "Ron Spencer", w: 1280, h: 938 },
  { num: '034', name: "Shore Lurker", artist: "Tiffany Turrill", w: 1999, h: 1469 },
  { num: '069', name: "Silvergill Mentor", artist: "Iris Compiet", w: 1200, h: 882 },
  { num: '070', name: "Silvergill Peddler", artist: "John Tedrick", w: 1920, h: 1410 },
  { num: '321', name: "Soul Immolation", artist: "Serena Malyon", w: 1600, h: 1139 },
  { num: '157', name: "Soulbright Seeker", artist: "Kev Fang", w: 1440, h: 1057 },
  { num: '158', name: "Sourbread Auntie", artist: "John Tedrick", w: 1999, h: 1469 },
  { num: '322', name: "Spinerock Tyrant", artist: "Danny Schwartz", w: 2000, h: 1534 },
  { num: '195', name: "Spry and Mighty", artist: "Pete Venters", w: 2048, h: 1533 },
  { num: '261', name: "Stalactite Dagger", artist: "Drew Tucker", w: 1440, h: 1440 },
  { num: '267', name: "Steam Vents", artist: "Adam Paquette", w: 1662, h: 1192 },
  { num: '243', name: "Stoic Grove-Guide", artist: "Tran Nguyen", w: 1600, h: 1176 },
  { num: '072', name: "Stratosoarer", artist: "John Tedrick", w: 1920, h: 1410 },
  { num: '309', name: "Sunderflock", artist: "Danny Schwartz", w: 1440, h: 1105 },
  { num: '074', name: "Sunderflock", artist: "Caio Monteiro", w: 1997, h: 1440 },
  { num: '196', name: "Surly Farrier", artist: "Jake Murray", w: 1200, h: 900 },
  { num: '271', name: "Swamp", artist: "Jorge Jacinto", w: 1440, h: 1058 },
  { num: '342', name: "Sygg's Command", artist: "Felicita Sala", w: 1440, h: 1238 },
  { num: '244', name: "Sygg's Command", artist: "Margaret Organ-Kean", w: 1920, h: 1080 },
  { num: '1003', name: "Sygg, Wanderbrine Shield", artist: "Justin Gerard", w: 1440, h: 1440 },
  { num: '076', name: "Sygg, Wanderwine Wisdom", artist: "Justin Gerard", w: 1440, h: 1439 },
  { num: '314', name: "Taster of Wares", artist: "Felicita Sala", w: 1440, h: 1238 },
  { num: '121', name: "Taster of Wares", artist: "Edgar Snchez Hidalgo", w: 1920, h: 1384 },
  { num: '268', name: "Temple Garden", artist: "Adam Paquette", w: 1700, h: 1226 },
  { num: '197', name: "Tend the Sprigs", artist: "Iris Compiet", w: 1200, h: 881 },
  { num: '079', name: "Thirst for Identity", artist: "Danny Schwartz", w: 1440, h: 1057 },
  { num: '198', name: "Thoughtweft Charge", artist: "Josiah 'Jo' Cameron", w: 1999, h: 1469 },
  { num: '246', name: "Thoughtweft Lieutenant", artist: "Matt Stewart", w: 1440, h: 1080 },
  { num: '343', name: "Thoughtweft Lieutenant", artist: "Vanessa Gillings", w: 1876, h: 1440 },
  { num: '039', name: "Timid Shieldbearer", artist: "Edgar Snchez Hidalgo", w: 1920, h: 1410 },
  { num: '040', name: "Tributary Vaulter", artist: "Tiffany Turrill", w: 1111, h: 816 },
  { num: '247', name: "Trystan's Command", artist: "Sam Guay", w: 1200, h: 900 },
  { num: '199', name: "Trystan, Callous Cultivator", artist: "Annie Stegg", w: 1080, h: 1350 },
  { num: '1013', name: "Trystan, Penitent Culler", artist: "Annie Stegg", w: 1080, h: 1350 },
  { num: '162', name: "Tweeze", artist: "Scott Gustafson", w: 2048, h: 1609 },
  { num: '122', name: "Twilight Diviner", artist: "Pauline Voss", w: 3840, h: 2768 },
  { num: '315', name: "Twilight Diviner", artist: "Isabella Mazzanti", w: 1170, h: 1376 },
  { num: '080', name: "Unexpected Assistance", artist: "Gustavo Pelissari", w: 1920, h: 1080 },
  { num: '200', name: "Unforgiving Aim", artist: "Filip Burburan", w: 2000, h: 1462 },
  { num: '081', name: "Unwelcome Sprite", artist: "Iris Compiet", w: 1134, h: 833 },
  { num: '295', name: "Vibrance", artist: "Mark Zug", w: 1653, h: 2048 },
  { num: '249', name: "Vibrance", artist: "Jakub Kasper", w: 1700, h: 1250 },
  { num: '201', name: "Vinebred Brawler", artist: "Evyn Fong", w: 1920, h: 1080 },
  { num: '250', name: "Voracious Tome-Skimmer", artist: "Loc Canavaggia", w: 1080, h: 792 },
  { num: '042', name: "Wanderbrine Trapper", artist: "Iris Compiet", w: 1200, h: 881 },
  { num: '163', name: "Warren Torchmaster", artist: "Ioannis Fiore", w: 1960, h: 1440 },
  { num: '043', name: "Winnowing", artist: "David Palumbo", w: 1500, h: 1125 },
  { num: '252', name: "Wistfulness", artist: "Jesper Ejsing", w: 1210, h: 900 },
  { num: '609', name: "Worm", artist: "Edgar Snchez Hidalgo", w: 1060, h: 1440 },
];

export const DFT_ART: ArtItem[] = [
  { num: '075', name: "Ancient Vendetta", artist: "Tianxing Xu", w: 1960, h: 1440 },
  { num: '310', name: "Boommobile", artist: "Ian Jepson", w: 1440, h: 1800 },
  { num: '320', name: "Boosted Sloop", artist: "Gabriel Rubio", w: 2150, h: 2615 },
  { num: '006', name: "Broadcast Rambler", artist: "Ioannis Fiore", w: 1960, h: 1440 },
  { num: '156', name: "Broken Wings", artist: "Nils Hamm", w: 1200, h: 882 },
  { num: '008', name: "Canyon Vaulter", artist: "David Astruga", w: 1200, h: 900 },
  { num: '362', name: "Caradora, Heart of Alacria", artist: "Yuko Shimizu", w: 1400, h: 1780 },
  { num: '305', name: "Carrion Cruiser", artist: "Ian Jepson", w: 1440, h: 1800 },
  { num: '078', name: "Carrion Cruiser", artist: "Mathias Kollros", w: 1200, h: 882 },
  { num: '079', name: "Chitin Gravestalker", artist: "Slawomir Maniak", w: 1200, h: 882 },
  { num: '198', name: "Coalstoke Gearhulk", artist: "Nino Vecia", w: 1200, h: 865 },
  { num: '119', name: "Crash and Burn", artist: "Anthony Devine", w: 1111, h: 816 },
  { num: '322', name: "Debris Beetle", artist: "Michal Ivan", w: 1440, h: 1800 },
  { num: '127', name: "Full Throttle", artist: "Benjamin Ee", w: 1387, h: 1000 },
  { num: '338', name: "Gas Guzzler", artist: "Sam McKenzie", w: 1080, h: 785 },
  { num: '164', name: "Greenbelt Guardian", artist: "Tianxing Xu", w: 1960, h: 1440 },
  { num: '090', name: "Hellish Sideswipe", artist: "Diana Franco", w: 1960, h: 1440 },
  { num: '095', name: "Locust Spray", artist: "Caio Monteiro", w: 1960, h: 1439 },
  { num: '050', name: "Midnight Mangler", artist: "Villarrte", w: 1439, h: 1089 },
  { num: '053', name: "Nimble Thopterist", artist: "Ioannis Fiore", w: 1960, h: 1440 },
  { num: '172', name: "Ooze Patrol", artist: "Forrest Schehl", w: 1200, h: 900 },
  { num: '139', name: "Outpace Oblivion", artist: "Raymond Swanland", w: 1200, h: 914 },
  { num: '238', name: "Pit Automaton", artist: "Villarrte", w: 1440, h: 1058 },
  { num: '278', name: "Plains", artist: "Titus Lunter", w: 1200, h: 882 },
  { num: '352', name: "Pyrewood Gearhulk", artist: "William Tempest", w: 1439, h: 1751 },
  { num: '055', name: "Rangers' Refueler", artist: "Samuel Perin", w: 1920, h: 1410 },
  { num: '144', name: "Reckless Velocitaur", artist: "Inkognit", w: 1440, h: 1057 },
  { num: '102', name: "Risen Necroregent", artist: "Inkognit", w: 1960, h: 1439 },
  { num: '260', name: "Riverpyre Verge", artist: "Titus Lunter", w: 1200, h: 865 },
  { num: '058', name: "Roadside Blowout", artist: "Michele Giorgi", w: 1440, h: 1058 },
  { num: '327', name: "Rocketeer Boostbuggy", artist: "Adam Volker", w: 1440, h: 1752 },
  { num: '059', name: "Sabotage Strategist", artist: "Darren Tan", w: 1440, h: 1058 },
  { num: '295', name: "Salvation Engine", artist: "Adam Volker", w: 1440, h: 1454 },
  { num: '247', name: "Spire Mechcycle", artist: "Adam Volker", w: 1229, h: 906 },
  { num: '314', name: "Spire Mechcycle", artist: "Neo.G", w: 1440, h: 1752 },
  { num: '297', name: "Spotcycle Scouter", artist: "Neo.G", w: 1440, h: 1752 },
  { num: '108', name: "Syphon Fuel", artist: "Mathias Kollros", w: 1200, h: 882 },
  { num: '094', name: "The Last Ride", artist: "Michele Giorgi", w: 1440, h: 1038 },
  { num: '105', name: "The Speed Demon", artist: "Helge C. Balzer", w: 1080, h: 779 },
  { num: '304', name: "Thopter Fabricator", artist: "William Tempest", w: 1440, h: 1751 },
  { num: '328', name: "Thundering Broodwagon", artist: "Villarrte", w: 1440, h: 1800 },
  { num: '298', name: "Valor's Flagship", artist: "William Tempest", w: 1440, h: 1751 },
  { num: '268', name: "Wastewood Verge", artist: "Bartek Fedyczak", w: 1386, h: 1016 },
  { num: '074', name: "Waxen Shapethief", artist: "Helge C. Balzer", w: 1080, h: 779 },
  { num: '345', name: "Webstrike Elite", artist: "Sam McKenzie", w: 1080, h: 785 },
  { num: '271', name: "Wind-Scarred Crag", artist: "Svetlin Velinov", w: 1440, h: 1057 },
  { num: '147', name: "Wreck Remover", artist: "Villarrte", w: 1440, h: 1058 },
];

export const SET_ART: Record<string, ArtItem[]> = {
  MSH: MSH_ART,
  ECL: ECL_ART,
  DFT: DFT_ART,
  // OTJ: mtgpics' art index (set 441) currently returns 500 server-side, so no
  // pool yet — Outlaws falls back to the clean gradient until it's scrapable.
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
