import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import type { PetType } from '../types';
import { PET_NAME_MAX_LENGTH, CAT_SPRITES, DOG_SPRITES } from '../constants';

// ─── Named Constants ────────────────────────────────────────────────

const NEWBORN_STAGE_INDEX = 0;
const BACKDROP_OPACITY = 0.35;
const BACKDROP_BLUR = 6;
const MODAL_SPRING_STIFFNESS = 300;
const MODAL_SPRING_DAMPING = 25;
const EXIT_DURATION = 0.15;

/** Pet type options for selection step. */
const PET_OPTIONS: { type: PetType; label: string; emoji: string }[] = [
  { type: 'cat', label: 'Cat 🐱', emoji: '🐱' },
  { type: 'dog', label: 'Dog 🐶', emoji: '🐶' },
];

// ─── Props ──────────────────────────────────────────────────────────

interface PetSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPropose: (pet: { type: PetType; name: string; birthday: number }) => void;
  anniversaryDate?: number | null;
}

// ─── Helpers ────────────────────────────────────────────────────────

function getNewbornSprite(type: PetType): string {
  const sprites = type === 'cat' ? CAT_SPRITES : DOG_SPRITES;
  return sprites[NEWBORN_STAGE_INDEX];
}

function formatDateForInput(timestamp: number): string {
  const d = new Date(timestamp);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateInput(value: string): number {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day).getTime();
}

// ─── Component ──────────────────────────────────────────────────────

export default function PetSetupModal({
  isOpen,
  onClose,
  onPropose,
  anniversaryDate,
}: PetSetupModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedType, setSelectedType] = useState<PetType | null>(null);
  const [petName, setPetName] = useState('');
  const [birthday, setBirthday] = useState(() =>
    anniversaryDate ? formatDateForInput(anniversaryDate) : formatDateForInput(Date.now()),
  );

  const modalRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setSelectedType(null);
      setPetName('');
      setBirthday(
        anniversaryDate ? formatDateForInput(anniversaryDate) : formatDateForInput(Date.now()),
      );
    }
  }, [isOpen, anniversaryDate]);

  // Focus trap: focus the name input on step 2
  useEffect(() => {
    if (step === 2 && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [step]);

  // Escape key closes modal
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  const handleNextStep = () => {
    if (selectedType) {
      setStep(2);
    }
  };

  const handleConfirm = () => {
    if (!selectedType || petName.trim().length === 0) return;

    onPropose({
      type: selectedType,
      name: petName.trim(),
      birthday: parseDateInput(birthday),
    });
  };

  const isNameValid = petName.trim().length > 0 && petName.length <= PET_NAME_MAX_LENGTH;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: EXIT_DURATION } }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0"
            style={{
              backgroundColor: `rgba(0, 0, 0, ${BACKDROP_OPACITY})`,
              backdropFilter: `blur(${BACKDROP_BLUR}px)`,
              WebkitBackdropFilter: `blur(${BACKDROP_BLUR}px)`,
            }}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Modal panel */}
          <motion.div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-label="Adopt a pet"
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{
              type: 'spring',
              stiffness: MODAL_SPRING_STIFFNESS,
              damping: MODAL_SPRING_DAMPING,
            }}
            className="relative w-full max-w-md bg-white rounded-3xl shadow-xl p-6 sm:p-8 z-10"
          >
            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close adopt pet dialog"
              className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-sage-400 hover:text-sage-700 hover:bg-sage-50 transition-colors"
            >
              <X size={18} />
            </button>

            {/* Step 1: Choose pet type */}
            {step === 1 && (
              <div>
                <h2 className="font-serif text-xl sm:text-2xl text-sage-900 mb-1">
                  🐾 Choose Your Pet
                </h2>
                <p className="text-sm text-sage-500 mb-6">
                  Pick a furry friend to raise together!
                </p>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  {PET_OPTIONS.map(({ type, label }) => {
                    const isSelected = selectedType === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setSelectedType(type)}
                        aria-label={`Select ${label}`}
                        aria-pressed={isSelected}
                        className={`flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all ${
                          isSelected
                            ? 'border-sage-500 ring-4 ring-sage-200 bg-sage-50 shadow-md'
                            : 'border-sage-100 hover:border-sage-300 bg-white'
                        }`}
                      >
                        <img
                          src={getNewbornSprite(type)}
                          alt={`${label} newborn`}
                          className="w-20 h-20 sm:w-24 sm:h-24 object-contain"
                          draggable={false}
                        />
                        <span className="text-sm font-semibold text-sage-700">{label}</span>
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={handleNextStep}
                  disabled={!selectedType}
                  aria-disabled={!selectedType}
                  className={`w-full py-3 rounded-2xl font-medium transition-colors text-sm ${
                    selectedType
                      ? 'bg-sage-500 text-white hover:bg-sage-600 active:scale-[0.98]'
                      : 'bg-sage-100 text-sage-400 cursor-not-allowed'
                  }`}
                >
                  Next →
                </button>
              </div>
            )}

            {/* Step 2: Name & birthday */}
            {step === 2 && selectedType && (
              <div>
                <h2 className="font-serif text-xl sm:text-2xl text-sage-900 mb-1">
                  ✨ Name Your Pet
                </h2>
                <p className="text-sm text-sage-500 mb-6">
                  Give your {selectedType === 'cat' ? 'kitty' : 'puppy'} a cute name!
                </p>

                {/* Pet preview */}
                <div className="flex justify-center mb-5">
                  <img
                    src={getNewbornSprite(selectedType)}
                    alt={`${selectedType} preview`}
                    aria-label={`Your new ${selectedType}`}
                    className="w-24 h-24 object-contain drop-shadow-md"
                    draggable={false}
                  />
                </div>

                {/* Name input */}
                <div className="mb-4">
                  <label htmlFor="pet-name" className="block text-xs font-semibold text-sage-500 uppercase tracking-wide mb-1.5">
                    Pet Name
                  </label>
                  <input
                    ref={nameInputRef}
                    id="pet-name"
                    type="text"
                    value={petName}
                    onChange={(e) => setPetName(e.target.value.slice(0, PET_NAME_MAX_LENGTH))}
                    maxLength={PET_NAME_MAX_LENGTH}
                    placeholder={selectedType === 'cat' ? 'e.g. Mochi 🍡' : 'e.g. Brownie 🍫'}
                    className="w-full bg-mint/50 border border-sage-200 rounded-xl px-4 py-3 text-sage-900 placeholder:text-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-400 transition-all"
                  />
                  <p className="text-[10px] text-sage-400 mt-1 text-right tabular-nums">
                    {petName.length}/{PET_NAME_MAX_LENGTH}
                  </p>
                </div>

                {/* Birthday input */}
                <div className="mb-6">
                  <label htmlFor="pet-birthday" className="block text-xs font-semibold text-sage-500 uppercase tracking-wide mb-1.5">
                    Birthday 🎂
                  </label>
                  <input
                    id="pet-birthday"
                    type="date"
                    value={birthday}
                    onChange={(e) => setBirthday(e.target.value)}
                    className="w-full bg-mint/50 border border-sage-200 rounded-xl px-4 py-3 text-sage-900 focus:outline-none focus:ring-2 focus:ring-sage-400 transition-all"
                  />
                </div>

                {/* Action buttons */}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 py-3 rounded-2xl font-medium text-sm bg-sage-50 text-sage-600 hover:bg-sage-100 transition-colors"
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={!isNameValid}
                    aria-disabled={!isNameValid}
                    className={`flex-1 py-3 rounded-2xl font-medium text-sm transition-colors ${
                      isNameValid
                        ? 'bg-sage-500 text-white hover:bg-sage-600 active:scale-[0.98]'
                        : 'bg-sage-100 text-sage-400 cursor-not-allowed'
                    }`}
                  >
                    Adopt! 🎉
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
