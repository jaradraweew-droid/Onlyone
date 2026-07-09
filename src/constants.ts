import type { CustomMood } from './types';

/** Default Mood options used in check-in and settings. */
export const DEFAULT_MOODS: CustomMood[] = [
  { id: 'm-great', value: 'great', color: '#4A5D4E', label: 'Great' },
  { id: 'm-good', value: 'good', color: '#7A8B7D', label: 'Good' },
  { id: 'm-okay', value: 'okay', color: '#A0B0A3', label: 'Okay' },
  { id: 'm-tired', value: 'tired', color: '#C3D5C5', label: 'Tired' },
];

/** Reaction emoji set used in chat and timeline. */
export const REACTIONS: { emoji: string; label: string }[] = [
  { emoji: '😃', label: 'Happy' },
  { emoji: '😢', label: 'Sad' },
  { emoji: '😠', label: 'Angry' },
  { emoji: '☺️', label: 'Gentle' },
  { emoji: '❤️', label: 'Love' },
  { emoji: '🥺', label: 'Missing you' },
  { emoji: '🤗', label: 'Comfort' },
];

/** Maximum image dimensions for upload compression. */
export const IMAGE_MAX_SIZE = 800;

/** JPEG compression quality for uploaded images. */
export const IMAGE_QUALITY = 0.6;

// ─── Pet Constants ──────────────────────────────────────────────────

/** Pet hunger decay rate: points lost per hour. */
export const PET_HUNGER_DECAY_PER_HOUR = 4;

/** Pet love decay rate: points lost per hour. */
export const PET_LOVE_DECAY_PER_HOUR = 2;

/** Maximum feeding actions per day. */
export const PET_MAX_FEEDS_PER_DAY = 6;

/** Hunger points restored per feed action. */
export const PET_FEED_RESTORE = 25;

/** Love points restored per love action. */
export const PET_LOVE_RESTORE = 20;

/** Energy points consumed per play action. */
export const PET_PLAY_ENERGY_COST = 15;

/** Love points restored per play action. */
export const PET_PLAY_LOVE_RESTORE = 15;

/** Maximum stat value for any status bar. */
export const PET_STAT_MAX = 100;

/** Minimum stat value for any status bar. */
export const PET_STAT_MIN = 0;

/** Threshold below which a stat is considered critical (red). */
export const PET_STAT_CRITICAL = 40;

/** Threshold above which a stat is considered healthy (green). */
export const PET_STAT_HEALTHY = 80;

/** Maximum character length for pet name input. */
export const PET_NAME_MAX_LENGTH = 20;

/** Milliseconds per hour — used for decay calculations. */
export const MS_PER_HOUR = 3_600_000;

/** Milliseconds per day — used for daily feed reset. */
export const MS_PER_DAY = 86_400_000;

/** Pet age stage breakpoints in days, with labels and image paths. */
export const PET_STAGES = [
  { maxDays: 7, label: 'Newborn', stageIndex: 0 },
  { maxDays: 30, label: 'Kitten / Puppy', stageIndex: 1 },
  { maxDays: 90, label: 'Young', stageIndex: 2 },
  { maxDays: Infinity, label: 'Adult', stageIndex: 3 },
] as const;

/** Cat image paths indexed by stage. */
export const CAT_SPRITES: readonly string[] = [
  '/assets/pets/cat_newborn.png',
  '/assets/pets/cat_kitten.png',
  '/assets/pets/cat_young.png',
  '/assets/pets/cat_adult.png',
];

/** Dog image paths indexed by stage. */
export const DOG_SPRITES: readonly string[] = [
  '/assets/pets/dog_newborn.png',
  '/assets/pets/dog_puppy.png',
  '/assets/pets/dog_young.png',
  '/assets/pets/dog_adult.png',
];

/** Pet expression image paths. */
export const PET_EXPRESSIONS = {
  happy: '/assets/pets/pet_happy.png',
  hungry: '/assets/pets/pet_hungry.png',
  sleepy: '/assets/pets/pet_sleepy.png',
  loved: '/assets/pets/pet_loved.png',
} as const;

