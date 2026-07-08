import { describe, it, expect } from 'vitest';
import {
  calculatePetAge,
  formatPetAge,
  getPetSpriteByStage,
  clampStat,
  calculateDecayedStatus,
  createDefaultPetStatus,
  canFeedToday,
  getTodaysFeedCount,
  getStatLevel,
  getStatColor,
  getStatTrackColor,
} from '../petUtils';
import { PET_STAT_MAX, MS_PER_DAY, MS_PER_HOUR } from '../constants';
import type { PetAction, PetStatus } from '../types';

describe('petUtils', () => {
  // ─── calculatePetAge ──────────────────────────────────────────
  describe('calculatePetAge', () => {
    it('should return 0 days for a birthday set to now', () => {
      const result = calculatePetAge(Date.now());
      expect(result.days).toBe(0);
      expect(result.stageLabel).toBe('Newborn');
      expect(result.stageIndex).toBe(0);
    });

    it('should return correct days and Kitten stage for 10-day-old pet', () => {
      const tenDaysAgo = Date.now() - 10 * MS_PER_DAY;
      const result = calculatePetAge(tenDaysAgo);
      expect(result.days).toBe(10);
      expect(result.stageLabel).toBe('Kitten / Puppy');
      expect(result.stageIndex).toBe(1);
    });

    it('should return Young stage for 60-day-old pet', () => {
      const sixtyDaysAgo = Date.now() - 60 * MS_PER_DAY;
      const result = calculatePetAge(sixtyDaysAgo);
      expect(result.days).toBe(60);
      expect(result.stageLabel).toBe('Young');
      expect(result.stageIndex).toBe(2);
    });

    it('should return Adult stage for 100-day-old pet', () => {
      const hundredDaysAgo = Date.now() - 100 * MS_PER_DAY;
      const result = calculatePetAge(hundredDaysAgo);
      expect(result.days).toBe(100);
      expect(result.stageLabel).toBe('Adult');
      expect(result.stageIndex).toBe(3);
    });

    it('should handle future birthday gracefully (0 days)', () => {
      const future = Date.now() + 5 * MS_PER_DAY;
      const result = calculatePetAge(future);
      expect(result.days).toBe(0);
    });
  });

  // ─── formatPetAge ─────────────────────────────────────────────
  describe('formatPetAge', () => {
    it('should return "Just born" for 0 days', () => {
      expect(formatPetAge(0)).toBe('Just born');
    });

    it('should return "1 day" for 1 day', () => {
      expect(formatPetAge(1)).toBe('1 day');
    });

    it('should return "5 days" for 5 days', () => {
      expect(formatPetAge(5)).toBe('5 days');
    });

    it('should return "1 month 5 days" for 35 days', () => {
      expect(formatPetAge(35)).toBe('1 month 5 days');
    });

    it('should return "2 months" for 60 days', () => {
      expect(formatPetAge(60)).toBe('2 months');
    });
  });

  // ─── getPetSpriteByStage ──────────────────────────────────────
  describe('getPetSpriteByStage', () => {
    it('should return cat newborn sprite for stage 0', () => {
      expect(getPetSpriteByStage('cat', 0)).toBe('/assets/pets/cat_newborn.png');
    });

    it('should return dog puppy sprite for stage 1', () => {
      expect(getPetSpriteByStage('dog', 1)).toBe('/assets/pets/dog_puppy.png');
    });

    it('should clamp negative stage index to 0', () => {
      expect(getPetSpriteByStage('cat', -1)).toBe('/assets/pets/cat_newborn.png');
    });

    it('should clamp excessive stage index to last sprite', () => {
      expect(getPetSpriteByStage('dog', 99)).toBe('/assets/pets/dog_adult.png');
    });
  });

  // ─── clampStat ────────────────────────────────────────────────
  describe('clampStat', () => {
    it('should return 0 for negative values', () => {
      expect(clampStat(-10)).toBe(0);
    });

    it('should return 100 for values above max', () => {
      expect(clampStat(150)).toBe(PET_STAT_MAX);
    });

    it('should round values', () => {
      expect(clampStat(50.7)).toBe(51);
    });
  });

  // ─── calculateDecayedStatus ───────────────────────────────────
  describe('calculateDecayedStatus', () => {
    it('should decay hunger and love over time', () => {
      const status = createDefaultPetStatus();
      const twoHoursAgo = Date.now() - 2 * MS_PER_HOUR;
      const decayed = calculateDecayedStatus(status, twoHoursAgo);

      // Hunger decays at 4/hr -> 8 points over 2 hours
      expect(decayed.hunger).toBeLessThan(PET_STAT_MAX);
      expect(decayed.hunger).toBeGreaterThan(0);

      // Love decays at 2/hr -> 4 points over 2 hours
      expect(decayed.love).toBeLessThan(PET_STAT_MAX);
    });

    it('should not go below 0', () => {
      const status = { ...createDefaultPetStatus(), hunger: 5, love: 5 };
      const longAgo = Date.now() - 24 * MS_PER_HOUR;
      const decayed = calculateDecayedStatus(status, longAgo);

      expect(decayed.hunger).toBe(0);
      expect(decayed.love).toBe(0);
    });
  });

  // ─── canFeedToday / getTodaysFeedCount ────────────────────────
  describe('canFeedToday', () => {
    const makeAction = (timestamp: number): PetAction => ({
      id: 'test',
      userId: 'u1',
      userName: 'Test',
      type: 'feed',
      timestamp,
    });

    it('should return true when no feedings today', () => {
      expect(canFeedToday([])).toBe(true);
    });

    it('should return true when below limit', () => {
      const now = Date.now();
      const actions = [makeAction(now)];
      expect(canFeedToday(actions)).toBe(true);
    });

    it('should return false when at limit', () => {
      const now = Date.now();
      const actions = Array.from({ length: 6 }, () => makeAction(now));
      expect(canFeedToday(actions)).toBe(false);
    });

    it('should not count yesterday feedings', () => {
      const yesterday = Date.now() - 2 * MS_PER_DAY;
      const actions = Array.from({ length: 6 }, () => makeAction(yesterday));
      expect(canFeedToday(actions)).toBe(true);
      expect(getTodaysFeedCount(actions)).toBe(0);
    });
  });

  // ─── getStatLevel / getStatColor / getStatTrackColor ──────────
  describe('stat level helpers', () => {
    it('should return critical for values below 40', () => {
      expect(getStatLevel(20)).toBe('critical');
      expect(getStatColor('critical')).toBe('bg-red-400');
      expect(getStatTrackColor('critical')).toBe('bg-red-100');
    });

    it('should return warning for values 40-79', () => {
      expect(getStatLevel(60)).toBe('warning');
      expect(getStatColor('warning')).toBe('bg-amber-400');
    });

    it('should return healthy for values 80+', () => {
      expect(getStatLevel(90)).toBe('healthy');
      expect(getStatColor('healthy')).toBe('bg-emerald-400');
      expect(getStatTrackColor('healthy')).toBe('bg-emerald-100');
    });
  });
});
