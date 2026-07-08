import { useMemo } from 'react';
import { motion } from 'motion/react';
import type { PetStatus } from '../types';
import { PET_STAT_MAX, PET_STAT_MIN } from '../constants';
import { calculateDecayedStatus, getStatLevel, getStatColor, getStatTrackColor } from '../petUtils';

// ─── Named Constants ────────────────────────────────────────────────

const BAR_HEIGHT_CLASS = 'h-3';
const FILL_ANIMATION_DURATION = 0.6;
const PERCENTAGE_MULTIPLIER = 100;

/** Configuration for each status bar. */
const STAT_BARS = [
  { key: 'hunger' as const, icon: '🍖', label: 'Hunger' },
  { key: 'love' as const, icon: '❤️', label: 'Love' },
  { key: 'health' as const, icon: '💚', label: 'Health' },
  { key: 'energy' as const, icon: '⚡', label: 'Energy' },
] as const;

// ─── Props ──────────────────────────────────────────────────────────

interface PetStatusBarsProps {
  status: PetStatus;
  lastUpdateTime: number;
}

// ─── Component ──────────────────────────────────────────────────────

export default function PetStatusBars({ status, lastUpdateTime }: PetStatusBarsProps) {
  const decayed = useMemo(
    () => calculateDecayedStatus(status, lastUpdateTime),
    [status, lastUpdateTime],
  );

  return (
    <div
      className="grid grid-cols-1 md:grid-cols-2 gap-3"
      aria-label="Pet status bars"
    >
      {STAT_BARS.map(({ key, icon, label }) => {
        const value = Math.round(decayed[key]);
        const level = getStatLevel(value);
        const fillColor = getStatColor(level);
        const trackColor = getStatTrackColor(level);
        const percentage = Math.round((value / PET_STAT_MAX) * PERCENTAGE_MULTIPLIER);

        return (
          <div key={key} className="flex items-center gap-2.5">
            {/* Icon */}
            <span className="text-base w-6 text-center flex-shrink-0" aria-hidden="true">
              {icon}
            </span>

            {/* Label + bar */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-sage-700">{label}</span>
                <span className="text-xs font-semibold text-sage-900 tabular-nums">
                  {percentage}%
                </span>
              </div>

              {/* Progress bar */}
              <div
                role="progressbar"
                aria-label={`${label} level`}
                aria-valuenow={value}
                aria-valuemin={PET_STAT_MIN}
                aria-valuemax={PET_STAT_MAX}
                className={`${BAR_HEIGHT_CLASS} ${trackColor} rounded-full overflow-hidden`}
              >
                <motion.div
                  className={`${BAR_HEIGHT_CLASS} ${fillColor} rounded-full`}
                  initial={false}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: FILL_ANIMATION_DURATION, ease: 'easeOut' }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
