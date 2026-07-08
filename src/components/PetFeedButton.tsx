import { motion } from 'motion/react';
import type { PetAction } from '../types';
import { PET_MAX_FEEDS_PER_DAY, PET_PLAY_ENERGY_COST } from '../constants';
import { getTodaysFeedCount, canFeedToday } from '../petUtils';

// ─── Named Constants ────────────────────────────────────────────────

const TAP_SCALE = 0.92;
const HOVER_SCALE = 1.05;
const SPRING_STIFFNESS = 400;
const SPRING_DAMPING = 17;

/** Action button configuration. */
const ACTIONS = [
  {
    key: 'feed' as const,
    icon: '🍖',
    label: 'Feed',
    bgClass: 'bg-amber-100 hover:bg-amber-200',
    disabledClass: 'bg-gray-100 opacity-50 cursor-not-allowed',
    textClass: 'text-amber-800',
  },
  {
    key: 'love' as const,
    icon: '❤️',
    label: 'Love',
    bgClass: 'bg-pink-100 hover:bg-pink-200',
    disabledClass: 'bg-gray-100 opacity-50 cursor-not-allowed',
    textClass: 'text-pink-800',
  },
  {
    key: 'play' as const,
    icon: '🎾',
    label: 'Play',
    bgClass: 'bg-emerald-100 hover:bg-emerald-200',
    disabledClass: 'bg-gray-100 opacity-50 cursor-not-allowed',
    textClass: 'text-emerald-800',
  },
] as const;

// ─── Props ──────────────────────────────────────────────────────────

interface PetFeedButtonProps {
  onFeed: () => void;
  onLove: () => void;
  onPlay: () => void;
  feedingsToday: PetAction[];
  energy: number;
}

// ─── Helpers ────────────────────────────────────────────────────────

function getActionHandler(
  key: 'feed' | 'love' | 'play',
  onFeed: () => void,
  onLove: () => void,
  onPlay: () => void,
): () => void {
  if (key === 'feed') return onFeed;
  if (key === 'love') return onLove;
  return onPlay;
}

function isActionDisabled(
  key: 'feed' | 'love' | 'play',
  feedingsToday: PetAction[],
  energy: number,
): boolean {
  if (key === 'feed') return !canFeedToday(feedingsToday);
  if (key === 'play') return energy < PET_PLAY_ENERGY_COST;
  return false;
}

function getStatusText(
  key: 'feed' | 'love' | 'play',
  feedingsToday: PetAction[],
  energy: number,
): string {
  if (key === 'feed') {
    const count = getTodaysFeedCount(feedingsToday);
    return `${count}/${PET_MAX_FEEDS_PER_DAY}`;
  }
  if (key === 'play') {
    return energy < PET_PLAY_ENERGY_COST ? 'Tired' : 'Ready';
  }
  return '∞';
}

// ─── Component ──────────────────────────────────────────────────────

export default function PetFeedButton({
  onFeed,
  onLove,
  onPlay,
  feedingsToday,
  energy,
}: PetFeedButtonProps) {
  return (
    <div className="flex items-center justify-center gap-3 sm:gap-4">
      {ACTIONS.map(({ key, icon, label, bgClass, disabledClass, textClass }) => {
        const disabled = isActionDisabled(key, feedingsToday, energy);
        const handler = getActionHandler(key, onFeed, onLove, onPlay);
        const statusText = getStatusText(key, feedingsToday, energy);

        return (
          <motion.button
            key={key}
            type="button"
            onClick={disabled ? undefined : handler}
            disabled={disabled}
            aria-disabled={disabled}
            aria-label={`${label} — ${statusText}`}
            whileHover={disabled ? undefined : { scale: HOVER_SCALE }}
            whileTap={disabled ? undefined : { scale: TAP_SCALE }}
            transition={{ type: 'spring', stiffness: SPRING_STIFFNESS, damping: SPRING_DAMPING }}
            className={`flex flex-col items-center gap-1.5 px-5 py-3 sm:px-6 sm:py-4 rounded-2xl font-medium transition-colors ${
              disabled ? disabledClass : bgClass
            }`}
          >
            <span className="text-2xl" aria-hidden="true">{icon}</span>
            <span className={`text-xs font-semibold ${disabled ? 'text-gray-400' : textClass}`}>
              {label}
            </span>
            <span className={`text-[10px] tabular-nums ${disabled ? 'text-gray-400' : 'text-sage-500'}`}>
              {statusText}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
