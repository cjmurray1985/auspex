import type { ColorPairStat, DraftRecord } from './types';
import { colorPairsOf } from './profile';
import { SET_ACHIEVEMENTS } from '../data/achievements';
import { cardArtUrl } from '../data/sets';

/**
 * Set mastery
 * ===========
 * Per-set progression = color-pair mastery + achievements. Achievements earned
 * by a single draft are stamped on the record (`earnedAchievements`); longevity
 * ("history") achievements are evaluated live over the set's records. The ring
 * fills as you earn achievements AND grow color pairs to proficient or better.
 */
export interface SetAchievementStatus {
  id: string;
  name: string;
  description: string;
  unique: boolean;
  earned: boolean;
  /** Scryfall art-crop URL fronting the earned tile (null if none assigned). */
  art: string | null;
}

export interface SetMastery {
  setCode: string;
  drafts: number;
  colorPairs: ColorPairStat[];
  achievements: SetAchievementStatus[];
  achievementsEarned: number;
  achievementsTotal: number;
  pairsMastered: number;
  /** Overall mastery 0..1 (achievements + mastered pairs / totals). */
  pct: number;
}

export function setMastery(records: DraftRecord[], setCode: string): SetMastery {
  const setRecords = records.filter((r) => r.set === setCode);
  const colorPairs = colorPairsOf(setRecords);
  const defs = SET_ACHIEVEMENTS[setCode] ?? [];

  const earnedIds = new Set<string>();
  for (const r of setRecords) for (const id of r.earnedAchievements ?? []) earnedIds.add(id);

  const achievements: SetAchievementStatus[] = defs.map((d) => ({
    id: d.id,
    name: d.name,
    description: d.description,
    unique: !!d.unique,
    earned: earnedIds.has(d.id) || (d.fromHistory ? d.fromHistory(setRecords) : false),
    art: d.art ? cardArtUrl(setCode, d.art.cn) : null,
  }));

  const achievementsEarned = achievements.filter((a) => a.earned).length;
  const pairsMastered = colorPairs.filter(
    (p) => p.level === 'proficient' || p.level === 'mastered',
  ).length;

  const achievementsTotal = defs.length;
  const totalCount = achievementsTotal + colorPairs.length; // achievements + 10 pairs
  const earnedCount = achievementsEarned + pairsMastered;
  const pct = totalCount ? earnedCount / totalCount : 0;

  return {
    setCode,
    drafts: setRecords.length,
    colorPairs,
    achievements,
    achievementsEarned,
    achievementsTotal,
    pairsMastered,
    pct,
  };
}
