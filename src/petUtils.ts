import type { PetType, PetStatus, PetAction } from './types';
import {
  PET_HUNGER_DECAY_PER_HOUR,
  PET_LOVE_DECAY_PER_HOUR,
  PET_STAGES,
  CAT_SPRITES,
  DOG_SPRITES,
  PET_MAX_FEEDS_PER_DAY,
  PET_STAT_MAX,
  PET_STAT_MIN,
  MS_PER_HOUR,
  MS_PER_DAY,
  PET_STAT_CRITICAL,
  PET_STAT_HEALTHY,
} from './constants';

// ─── Age Calculation ────────────────────────────────────────────────

interface PetAge {
  days: number;
  stageIndex: number;
  stageLabel: string;
}

/** Calculates age in days and the current life stage from a birthday timestamp. */
export function calculatePetAge(birthday: number): PetAge {
  const now = Date.now();
  const diffMs = Math.max(now - birthday, 0);
  const days = Math.floor(diffMs / MS_PER_DAY);

  for (const stage of PET_STAGES) {
    if (days <= stage.maxDays) {
      return { days, stageIndex: stage.stageIndex, stageLabel: stage.label };
    }
  }

  const lastStage = PET_STAGES[PET_STAGES.length - 1];
  return { days, stageIndex: lastStage.stageIndex, stageLabel: lastStage.label };
}

/** Formats a pet age in days to a human-readable string like "2 months 5 days". */
export function formatPetAge(days: number): string {
  if (days < 1) return 'Just born';

  const months = Math.floor(days / 30);
  const remainingDays = days % 30;

  const parts: string[] = [];
  if (months > 0) {
    parts.push(`${months} ${months === 1 ? 'month' : 'months'}`);
  }
  if (remainingDays > 0 || parts.length === 0) {
    parts.push(`${remainingDays} ${remainingDays === 1 ? 'day' : 'days'}`);
  }

  return parts.join(' ');
}

// ─── Sprite Selection ───────────────────────────────────────────────

/** Returns the image path for the pet's current age stage. */
export function getPetSprite(type: PetType, ageDays: number): string {
  const sprites = type === 'cat' ? CAT_SPRITES : DOG_SPRITES;
  const { stageIndex } = calculatePetAge(Date.now() - ageDays * MS_PER_DAY);
  const clampedIndex = Math.min(stageIndex, sprites.length - 1);
  return sprites[clampedIndex];
}

/** Returns the image path for a given pet type and stage index. */
export function getPetSpriteByStage(type: PetType, stageIndex: number): string {
  const sprites = type === 'cat' ? CAT_SPRITES : DOG_SPRITES;
  const clampedIndex = Math.min(Math.max(stageIndex, 0), sprites.length - 1);
  return sprites[clampedIndex];
}

// ─── Status Decay ───────────────────────────────────────────────────

/** Clamps a numeric value between PET_STAT_MIN and PET_STAT_MAX. */
export function clampStat(value: number): number {
  return Math.max(PET_STAT_MIN, Math.min(PET_STAT_MAX, Math.round(value)));
}

/** Applies time-based hunger and love decay to a status snapshot. */
export function calculateDecayedStatus(status: PetStatus, lastUpdateTime: number): PetStatus {
  const now = Date.now();
  const hoursElapsed = Math.max(0, (now - lastUpdateTime) / MS_PER_HOUR);

  const hungerDecay = hoursElapsed * PET_HUNGER_DECAY_PER_HOUR;
  const loveDecay = hoursElapsed * PET_LOVE_DECAY_PER_HOUR;

  const hunger = clampStat(status.hunger - hungerDecay);
  const love = clampStat(status.love - loveDecay);
  const health = clampStat(Math.round((hunger + love) / 2));
  const energy = clampStat(status.energy);

  return { ...status, hunger, love, health, energy };
}

/** Creates the default status for a newly adopted pet. */
export function createDefaultPetStatus(): PetStatus {
  return {
    hunger: PET_STAT_MAX,
    love: PET_STAT_MAX,
    health: PET_STAT_MAX,
    energy: PET_STAT_MAX,
    lastFedBy: null,
    lastFedAt: null,
    lastLovedBy: null,
    lastLovedAt: null,
    feedingsToday: [],
  };
}

// ─── Daily Feed Limit ───────────────────────────────────────────────

/** Filters today's feedings from the action list. */
export function getTodaysFeedings(actions: PetAction[]): PetAction[] {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayMs = todayStart.getTime();

  return actions.filter((a) => a.type === 'feed' && a.timestamp >= todayMs);
}

/** Returns true if more feedings are allowed today. */
export function canFeedToday(feedingsToday: PetAction[]): boolean {
  return getTodaysFeedings(feedingsToday).length < PET_MAX_FEEDS_PER_DAY;
}

/** Returns the count of today's feedings. */
export function getTodaysFeedCount(feedingsToday: PetAction[]): number {
  return getTodaysFeedings(feedingsToday).length;
}

// ─── Status Level Helpers ───────────────────────────────────────────

export type StatLevel = 'critical' | 'warning' | 'healthy';

/** Determines the severity level of a stat value. */
export function getStatLevel(value: number): StatLevel {
  if (value < PET_STAT_CRITICAL) return 'critical';
  if (value >= PET_STAT_HEALTHY) return 'healthy';
  return 'warning';
}

/** Returns a CSS color class based on the stat level. */
export function getStatColor(level: StatLevel): string {
  switch (level) {
    case 'critical': return 'bg-red-400';
    case 'warning': return 'bg-amber-400';
    case 'healthy': return 'bg-emerald-400';
  }
}

/** Returns a background gradient class for a stat bar track. */
export function getStatTrackColor(level: StatLevel): string {
  switch (level) {
    case 'critical': return 'bg-red-100';
    case 'warning': return 'bg-amber-100';
    case 'healthy': return 'bg-emerald-100';
  }
}
