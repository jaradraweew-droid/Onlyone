import { useMemo } from 'react';
import { motion } from 'motion/react';
import type { PetType } from '../types';
import { PET_EXPRESSIONS, PET_STAT_CRITICAL, PET_STAT_HEALTHY } from '../constants';
import { calculatePetAge, formatPetAge, getPetSpriteByStage } from '../petUtils';

// ─── Named Constants ────────────────────────────────────────────────

const BOUNCE_AMPLITUDE = -6;
const BOUNCE_DURATION = 2;
const EXPRESSION_SIZE = 32;
const BASE_PET_SIZE = 160;
const STAGE_SCALE_INCREMENT = 0.1;
const LOVE_HUNGRY_THRESHOLD = 60;

/** Scale multipliers per stage index. */
const STAGE_SCALES: readonly number[] = [
  1,
  1 + STAGE_SCALE_INCREMENT,
  1 + STAGE_SCALE_INCREMENT * 2,
  1 + STAGE_SCALE_INCREMENT * 3,
];

// ─── Helpers ────────────────────────────────────────────────────────

type PetExpression = 'happy' | 'hungry' | 'sleepy' | 'loved';

function resolveExpression(hunger: number, love: number): PetExpression {
  if (hunger >= PET_STAT_HEALTHY && love >= PET_STAT_HEALTHY) return 'happy';
  if (hunger < PET_STAT_CRITICAL) return 'hungry';
  if (love < PET_STAT_CRITICAL) return 'sleepy';
  if (love > PET_STAT_HEALTHY && hunger >= LOVE_HUNGRY_THRESHOLD) return 'loved';
  return 'happy';
}

// ─── Props ──────────────────────────────────────────────────────────

interface PetDisplayProps {
  petType: PetType;
  birthday: number;
  hunger: number;
  love: number;
  petName?: string;
}

// ─── Component ──────────────────────────────────────────────────────

export default function PetDisplay({ petType, birthday, hunger, love, petName }: PetDisplayProps) {
  const age = useMemo(() => calculatePetAge(birthday), [birthday]);
  const sprite = useMemo(() => getPetSpriteByStage(petType, age.stageIndex), [petType, age.stageIndex]);
  const expression = resolveExpression(hunger, love);
  const expressionSrc = PET_EXPRESSIONS[expression];
  const scale = STAGE_SCALES[Math.min(age.stageIndex, STAGE_SCALES.length - 1)];
  const petSize = Math.round(BASE_PET_SIZE * scale);
  const ageText = formatPetAge(age.days);

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Bouncing pet container */}
      <motion.div
        animate={{ y: [0, BOUNCE_AMPLITUDE, 0] }}
        transition={{
          duration: BOUNCE_DURATION,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="relative"
        style={{ width: petSize, height: petSize }}
      >
        {/* Pet sprite */}
        <img
          src={sprite}
          alt={`${petName ?? petType} — ${age.stageLabel}`}
          aria-label={`${petName ?? petType} pet, ${age.stageLabel} stage`}
          className="w-full h-full object-contain drop-shadow-md"
          draggable={false}
        />

        {/* Expression overlay */}
        <motion.img
          key={expression}
          src={expressionSrc}
          alt={`${expression} expression`}
          aria-hidden="true"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          className="absolute -top-1 -right-1"
          style={{ width: EXPRESSION_SIZE, height: EXPRESSION_SIZE }}
        />
      </motion.div>

      {/* Name + age badge */}
      <div className="text-center">
        {petName && (
          <p className="text-sage-900 font-semibold text-lg leading-tight">{petName}</p>
        )}
        <span className="inline-flex items-center gap-1.5 mt-1 px-3 py-1 bg-amber-50 rounded-full text-xs font-medium text-amber-700">
          🐾 {age.stageLabel} · {ageText}
        </span>
      </div>
    </div>
  );
}
