import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import type { Pet, PetStatus } from '../types';
import { PET_MAX_FEEDS_PER_DAY, PET_STAT_MAX } from '../constants';
import { getTodaysFeedCount, getStatLevel, getStatColor, getStatTrackColor } from '../petUtils';

// ─── Named Constants ────────────────────────────────────────────────

const HUNGER_BAR_HEIGHT = 'h-2';
const PERCENTAGE_MULTIPLIER = 100;
const NOTIFICATION_DURATION = 4;
const NOTIFICATION_SLIDE_Y = -10;

// ─── Props ──────────────────────────────────────────────────────────

interface PetLiveActivityProps {
  pet: Pet;
  status: PetStatus;
  onFeed: () => void;
  onMissYou: () => void;
  lastAction?: { userName: string; type: string; timestamp: number } | null;
  onDismiss: () => void;
}

// ─── Helpers ────────────────────────────────────────────────────────

function getActionNotificationText(userName: string, type: string, petName: string): string {
  if (type === 'feed') return `${userName} ให้อาหาร ${petName} แล้ว! 🍖`;
  if (type === 'love') return `${userName} กอด ${petName} แล้ว! ❤️`;
  return `${userName} เล่นกับ ${petName} แล้ว! 🎾`;
}

function getPetEmoji(petType: 'cat' | 'dog'): string {
  return petType === 'cat' ? '🐱' : '🐶';
}

// ─── Component ──────────────────────────────────────────────────────

export default function PetLiveActivity({
  pet,
  status,
  onFeed,
  onMissYou,
  lastAction,
  onDismiss,
}: PetLiveActivityProps) {
  const feedCount = getTodaysFeedCount(status.feedingsToday);
  const hungerPercentage = Math.round((status.hunger / PET_STAT_MAX) * PERCENTAGE_MULTIPLIER);
  const hungerLevel = getStatLevel(status.hunger);
  const fillColor = getStatColor(hungerLevel);
  const trackColor = getStatTrackColor(hungerLevel);

  return (
    <div className="relative mx-2 sm:mx-4 mb-2">
      {/* Main banner */}
      <div className="bg-gradient-to-r from-amber-50 via-pink-50 to-emerald-50 rounded-2xl px-4 py-3 sm:px-5 sm:py-4 shadow-sm border border-sage-100">
        <div className="flex items-start gap-3">
          {/* Pet emoji */}
          <span className="text-2xl flex-shrink-0 mt-0.5" aria-hidden="true">
            {getPetEmoji(pet.type)}
          </span>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Title */}
            <p className="text-sm font-semibold text-sage-900 leading-tight mb-1.5">
              ภารกิจดูแล{pet.name}ร่วมกัน
            </p>

            {/* Hunger status */}
            <p className="text-xs text-sage-600 mb-2">
              {pet.name} ได้กินข้าวไปแล้ว {feedCount}/{PET_MAX_FEEDS_PER_DAY} ชาม 🍖
            </p>

            {/* Mini hunger bar */}
            <div
              role="progressbar"
              aria-label="Hunger level"
              aria-valuenow={status.hunger}
              aria-valuemin={0}
              aria-valuemax={PET_STAT_MAX}
              className={`${HUNGER_BAR_HEIGHT} ${trackColor} rounded-full overflow-hidden mb-3 max-w-48`}
            >
              <div
                className={`${HUNGER_BAR_HEIGHT} ${fillColor} rounded-full transition-all duration-500`}
                style={{ width: `${hungerPercentage}%` }}
              />
            </div>

            {/* Quick action buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onFeed}
                aria-label="ให้อาหาร (Feed pet)"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 hover:bg-amber-200 rounded-full text-xs font-semibold text-amber-800 transition-colors active:scale-95"
              >
                🍖 ให้อาหาร
              </button>
              <button
                type="button"
                onClick={onMissYou}
                aria-label="คิดถึงนะ (Miss you)"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-pink-100 hover:bg-pink-200 rounded-full text-xs font-semibold text-pink-800 transition-colors active:scale-95"
              >
                💕 คิดถึงนะ
              </button>
            </div>
          </div>

          {/* Dismiss button */}
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss pet activity banner"
            className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-sage-400 hover:text-sage-700 hover:bg-white/60 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Toast notification for partner actions */}
      <div aria-live="polite" aria-atomic="true" className="mt-1.5">
        <AnimatePresence>
          {lastAction && (
            <motion.div
              key={lastAction.timestamp}
              initial={{ opacity: 0, y: NOTIFICATION_SLIDE_Y }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: NOTIFICATION_SLIDE_Y }}
              transition={{
                type: 'spring',
                stiffness: 400,
                damping: 20,
                duration: NOTIFICATION_DURATION,
              }}
              className="bg-white rounded-xl px-4 py-2.5 shadow-sm border border-sage-100 flex items-center gap-2"
            >
              <span className="text-xs text-sage-700 font-medium">
                {getActionNotificationText(lastAction.userName, lastAction.type, pet.name)}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
