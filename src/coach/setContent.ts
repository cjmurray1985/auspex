import { canonicalPair } from './context';

/**
 * Set-tailored coaching content (PRE-43 · Sprint 4, Pillar B)
 * ==========================================================
 * Format-specific knowledge the coach layers on top of the deterministic
 * engines: a one-line format primer, the mechanics to watch, and a
 * strategic archetype label + note per color pair.
 *
 * This is *content*, not decision logic — the engines still grade decisions;
 * this only sharpens how advice is phrased so it reads like the actual format
 * instead of generic limited. Unknown sets fall back cleanly to color-name
 * archetypes with no note (see `setArchetypeFor` / `setPrimer` returning
 * undefined).
 *
 * Archetype keys are canonical WUBRG pairs, e.g. "WU", "BR".
 */

export interface SetArchetype {
  /** Strategic archetype label, e.g. "Aggro Speed". */
  name: string;
  /** One-line "how to draft this pair in this set" note. */
  note: string;
}

export interface SetCoaching {
  code: string;
  /** One or two sentences on the format's speed and what to prioritize. */
  primer: string;
  /** Signature mechanics/keywords a drafter should watch for. */
  mechanics: string[];
  /** Per color-pair archetype guidance (canonical pair keys). */
  archetypes: Record<string, SetArchetype>;
}

const SET_COACHING: Record<string, SetCoaching> = {
  // Marvel team-up set (Universes Beyond) — keep guidance at the limited-
  // fundamentals level; powerful named characters swing games.
  MSH: {
    code: 'MSH',
    primer:
      'A Marvel team-up set where powerful characters swing games. Prioritize ' +
      'bombs and efficient removal, then assemble a coherent two-color team with a clear plan.',
    mechanics: ['team-up', 'powerful characters', 'go-wide'],
    archetypes: {
      WU: { name: 'Team-Up Tempo', note: 'Cheap evasive characters plus interaction to protect the tempo lead.' },
      WB: { name: 'Attrition Heroes', note: 'Removal, lifegain, and recursion to grind the long game.' },
      WR: { name: 'Go-Wide Aggro', note: 'Flood the board early and finish with team-wide pumps.' },
      WG: { name: 'Assemble the Team', note: 'Wide boards and midrange payoffs that reward creature count.' },
      UB: { name: 'Control Value', note: 'Trade one-for-one, then win with card advantage and a bomb.' },
      UR: { name: 'Spells & Tempo', note: 'Cheap interaction and reach; keep the curve low and pressure up.' },
      UG: { name: 'Ramp Bombs', note: 'Accelerate into your strongest characters ahead of curve.' },
      BR: { name: 'Sacrifice Aggro', note: 'Trade resources aggressively for tempo and reach.' },
      BG: { name: 'Midrange Value', note: 'Removal plus resilient threats that out-value the opponent.' },
      RG: { name: 'Big Threats', note: 'Curve into oversized attackers and push combat damage.' },
    },
  },

  // Return to Lorwyn — creature-type (typal) synergies reward tribal density.
  ECL: {
    code: 'ECL',
    primer:
      'A return to Lorwyn: creature-type synergies reward tribal density. Commit ' +
      'to a tribe early, prioritize your payoffs, and keep the curve low.',
    mechanics: ['tribal / typal', 'go-wide', 'evasion'],
    archetypes: {
      WU: { name: 'Kithkin & Faeries Tempo', note: 'Small evasive creatures and flash tricks to win the tempo race.' },
      WB: { name: 'Kithkin Go-Wide', note: 'Swarm with tokens and anthems, then grind with removal.' },
      WR: { name: 'Aggro Tribes', note: 'Cheap tribal aggression — density over raw power.' },
      WG: { name: 'Go-Wide Typal', note: 'Elves/Kithkin bodies with payoffs that scale on board width.' },
      UB: { name: 'Faeries Control', note: 'Flash Faeries for tempo, then bury them in card advantage.' },
      UR: { name: 'Spellslinger Tempo', note: 'Cheap spells and Faeries to chip in and finish with reach.' },
      UG: { name: 'Elemental Ramp', note: 'Ramp into oversized tribal payoffs and evasive top-end.' },
      BR: { name: 'Goblins Aggro', note: 'Go wide, sacrifice for value, and close before they stabilize.' },
      BG: { name: 'Elves Midrange', note: 'Mana Elves into bombs; grind with recursion and removal.' },
      RG: { name: 'Beasts & Elementals', note: 'Ramp and fatties — win the top of the curve.' },
    },
  },

  // Aetherdrift — a race. Vehicles, Mounts, Start your Engines!, and Exhaust.
  DFT: {
    code: 'DFT',
    primer:
      "Aetherdrift is a race: Vehicles, Mounts, and 'Start your Engines!' reward " +
      "reaching max speed. Value crew/pilots and cheap interaction — don't get left at the line.",
    mechanics: ['Vehicles / crew', 'Mounts / saddle', 'Start your Engines!', 'Exhaust'],
    archetypes: {
      WU: { name: 'Artifacts & Vehicles', note: 'Efficient Vehicles with cheap pilots; crew reliably every turn.' },
      WB: { name: 'Grindy Mounts', note: 'Saddle payoffs and lifegain to survive and out-attrition the race.' },
      WR: { name: 'Aggro Speed', note: 'Hit max speed fast — cheap attackers and combat tricks.' },
      WG: { name: 'Go-Wide Vehicles', note: 'Token pilots to crew big Vehicles and flood the board.' },
      UB: { name: 'Artifact Value', note: 'Exhaust engines and card advantage to win the long race.' },
      UR: { name: 'Spells & Speed', note: 'Cheap interaction to reach max speed and finish with reach.' },
      UG: { name: 'Ramp Payoffs', note: 'Accelerate into powerful Vehicles and Mounts ahead of curve.' },
      BR: { name: 'Sacrifice Aggro', note: 'Trade resources for tempo; pressure before they stabilize.' },
      BG: { name: 'Midrange Mounts', note: 'Big Mounts plus removal to grind the race in your favor.' },
      RG: { name: 'Big Vehicles', note: 'Top-end Vehicles and Mounts that brawl through combat.' },
    },
  },

  // Outlaws of Thunder Junction — Crime, Plot, Outlaws, Mounts, Spree.
  OTJ: {
    code: 'OTJ',
    primer:
      'Outlaws of Thunder Junction rewards committing Crimes and Plotting cheap threats. ' +
      'Outlaw creatures fuel your synergies — draft an aggressive-to-midrange plan.',
    mechanics: ['Crime', 'Plot', 'Outlaws', 'Saddle / Mounts', 'Spree'],
    archetypes: {
      WU: { name: 'Plot Tempo', note: 'Plot cheap threats and press an evasive tempo advantage.' },
      WB: { name: 'Outlaws Midrange', note: 'Commit Crimes and grind with lifegain and removal.' },
      WR: { name: 'Aggro Outlaws', note: 'Cheap Outlaws, go wide, and close the game quickly.' },
      WG: { name: 'Mounts & Plot', note: 'Saddle payoffs plus midrange value and plotted threats.' },
      UB: { name: 'Crime Value', note: 'Trigger Crimes for card advantage and grind to the late game.' },
      UR: { name: 'Spells & Plot', note: 'Plot spells with cheap interaction and a burn finish.' },
      UG: { name: 'Ramp Mounts', note: 'Accelerate into big Mounts and bombs.' },
      BR: { name: 'Outlaws Aggro/Sac', note: 'The crime-fueled aggressive core — pressure and reach.' },
      BG: { name: 'Graveyard Crime', note: 'Value from Crimes and recursion; out-grind the table.' },
      RG: { name: 'Big Mounts', note: 'Ramp and saddle the biggest threats on the plains.' },
    },
  },
};

/** Full coaching content for a set code, or undefined for unknown sets. */
export function setCoaching(code?: string): SetCoaching | undefined {
  if (!code) return undefined;
  return SET_COACHING[code.toUpperCase()];
}

/** Set-tailored archetype for a color pair, or null to fall back to generic. */
export function setArchetypeFor(code: string | undefined, colors: string[]): SetArchetype | null {
  const sc = setCoaching(code);
  if (!sc) return null;
  return sc.archetypes[canonicalPair(colors)] ?? null;
}

/** One-line format primer for a set, or undefined for unknown sets. */
export function setPrimer(code?: string): string | undefined {
  return setCoaching(code)?.primer;
}
