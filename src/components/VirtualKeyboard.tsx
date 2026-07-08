import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Delete, Heart, Globe } from 'lucide-react';
import './VirtualKeyboard.css';

// ═══════════════════════════════════════════════════════════════════════
//  Types
// ═══════════════════════════════════════════════════════════════════════

type Language = 'en' | 'th';
type InputMode = 'letters' | 'symbols1' | 'symbols2';
type ShiftState = 'off' | 'shift' | 'caps';

// ═══════════════════════════════════════════════════════════════════════
//  Layout Definitions
//
//  Each layout is an array of row-arrays.
//  • All rows EXCEPT the last are "pure" character rows (keys only).
//  • The LAST row is the "action" row: rendered with a left special key
//    (shift or mode toggle) and a right backspace.
//  Both EN and TH use 4 rows (3 pure + 1 action) with the same logic.
// ═══════════════════════════════════════════════════════════════════════

// ─── English Layouts (5-row, matching reference) ────────────────────
// Row structure: number-row + QWERTY-row + ASDF-row + ZXCV-row (action)

const EN_LOWER = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
];

const EN_UPPER = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
];

// English Symbol Page 1/2 (matching reference)
const EN_SYM1 = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
  ['+', '×', '÷', '=', '/', '_', '€', '£', '¥', '₩'],
  ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')'],
  ['-', "'", '"', ':', ';', ',', '?'],
];

// English Symbol Page 2/2 (matching reference)
const EN_SYM2 = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
  ['`', '~', '\\', '|', '<', '>', '{', '}', '[', ']'],
  ['°', '•', '○', '●', '□', '■', '♠', '♥', '♦', '♣'],
  ['☆', '▪', '¤', '《', '》', '¡', '¿'],
];

// ─── Thai Layouts (Kedmanee 5-row, matching reference) ──────────────
// Row structure: number-row + QWERTY-row + ASDF-row + ZXCV-row (action)

const TH_BASE = [
  ['ๅ', 'ภ', 'ถ', 'ุ', 'ึ', 'ค', 'ต', 'จ', 'ข', 'ช'],
  ['ๆ', 'ไ', 'ำ', 'พ', 'ะ', 'ั', 'ี', 'ร', 'น', 'ย', 'บ', 'ล'],
  ['ฟ', 'ห', 'ก', 'ด', 'เ', '้', '่', 'า', 'ส', 'ว', 'ง'],
  ['ผ', 'ป', 'แ', 'อ', 'ิ', 'ื', 'ท', 'ม', 'ใ', 'ฝ'],
];

const TH_SHIFT = [
  ['+', '๓', '๔', 'ู', '฿', '๕', '๖', '๗', '๘', '๙'],
  ['๐', '"', 'ฎ', 'ฑ', 'ธ', 'ํ', '๊', 'ณ', 'ฯ', 'ญ', 'ฐ', ','],
  ['ฤ', 'ฆ', 'ฏ', 'โ', 'ฌ', '็', '๋', 'ษ', 'ศ', 'ซ', '.'],
  ['(', ')', 'ฉ', 'ฮ', 'ฺ', '์', '?', 'ฒ', 'ฬ', 'ฦ'],
];

// Thai Symbol Page 1/2 (numbers + operators + punctuation)
const TH_SYM1 = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
  ['+', '×', '÷', '=', '/', '_', '€', '£', '¥', '฿'],
  ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')'],
  ['-', "'", '"', ':', ';', ',', '?'],
];

// Thai Symbol Page 2/2 (Thai numerals + brackets + shapes)
const TH_SYM2 = [
  ['๑', '๒', '๓', '๔', '๕', '๖', '๗', '๘', '๙', '๐'],
  ['`', '~', '\\', '|', '<', '>', '{', '}', '[', ']'],
  ['°', '•', '○', '●', '□', '■', '♠', '♥', '♦', '♣'],
  ['☆', 'ฃ', 'ฅ', '《', '》', '¡', '¿'],
];

// ═══════════════════════════════════════════════════════════════════════
//  Helpers
// ═══════════════════════════════════════════════════════════════════════

function getRows(
  language: Language,
  inputMode: InputMode,
  shiftState: ShiftState,
): string[][] {
  if (inputMode === 'symbols1') {
    return language === 'th' ? TH_SYM1 : EN_SYM1;
  }
  if (inputMode === 'symbols2') {
    return language === 'th' ? TH_SYM2 : EN_SYM2;
  }
  if (language === 'th') {
    return shiftState !== 'off' ? TH_SHIFT : TH_BASE;
  }
  return shiftState !== 'off' ? EN_UPPER : EN_LOWER;
}

/** Thai combining characters (above/below vowels + tone marks + special marks) */
const COMBINING_CHARS = new Set([
  'ั', 'ิ', 'ี', 'ึ', 'ื', 'ุ', 'ู',
  '้', '่', '๊', '๋',
  '็', '์', 'ํ', 'ฺ',
]);

function displayKey(key: string): string {
  return COMBINING_CHARS.has(key) ? '◌' + key : key;
}

function isCombining(key: string): boolean {
  return COMBINING_CHARS.has(key);
}

// ═══════════════════════════════════════════════════════════════════════
//  Component
// ═══════════════════════════════════════════════════════════════════════

interface VirtualKeyboardProps {
  isOpen: boolean;
  onKeyPress: (key: string) => void;
  onBackspace: () => void;
  onEnter: () => void;
}

export default function VirtualKeyboard({
  isOpen,
  onKeyPress,
  onBackspace,
  onEnter,
}: VirtualKeyboardProps) {
  const [language, setLanguage] = useState<Language>('en');
  const [inputMode, setInputMode] = useState<InputMode>('letters');
  const [shiftState, setShiftState] = useState<ShiftState>('off');

  // ─── Handlers ──────────────────────────────────────────────────

  const handleKeyPress = useCallback(
    (key: string) => {
      onKeyPress(key);
      if (shiftState === 'shift') {
        setShiftState('off');
      }
    },
    [onKeyPress, shiftState],
  );

  const handleShift = useCallback(() => {
    setShiftState((prev) => {
      if (prev === 'off') return 'shift';
      if (prev === 'shift') return 'caps';
      return 'off';
    });
  }, []);

  const cycleLanguage = useCallback(() => {
    setLanguage((prev) => (prev === 'en' ? 'th' : 'en'));
    setShiftState('off');
    setInputMode('letters');
  }, []);

  const toggleSymbols = useCallback(() => {
    setInputMode((prev) => (prev === 'letters' ? 'symbols1' : 'letters'));
    setShiftState('off');
  }, []);

  const toggleSymbolPage = useCallback(() => {
    setInputMode((prev) => (prev === 'symbols1' ? 'symbols2' : 'symbols1'));
  }, []);

  // ─── Derived state ────────────────────────────────────────────

  const rows = getRows(language, inputMode, shiftState);
  const pureRows = rows.slice(0, -1);
  const actionRowChars = rows[rows.length - 1];

  const isLetters = inputMode === 'letters';
  const isSymbols1 = inputMode === 'symbols1';

  const shiftLabel = shiftState === 'caps' ? '⇪' : '⇧';
  const shiftClass =
    shiftState === 'caps'
      ? 'vk-key--caps-active'
      : shiftState === 'shift'
        ? 'vk-key--shift-active'
        : '';
  const shiftAriaLabel =
    shiftState === 'caps'
      ? 'Caps lock on'
      : shiftState === 'shift'
        ? 'Shift on'
        : 'Shift';

  // Labels matching the reference keyboard (unified for EN & TH)
  const returnLabel = language === 'th' ? 'กขค' : 'ABC';
  const symbolModeLabel = '!#1';
  const symbolToggleLabel = isSymbols1 ? '1/2' : '2/2';
  const spaceLabel = language === 'th' ? 'ไทย' : 'English (US)';

  // ─── Render ────────────────────────────────────────────────────

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="vk-container"
          role="group"
          aria-label="Virtual keyboard"
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 26, stiffness: 300 }}
          data-testid="virtual-keyboard"
        >
          {/* Language Indicator */}
          <div className="vk-lang-indicator">
            <span className={`vk-lang-badge ${language === 'en' && isLetters ? 'vk-lang-badge--active' : ''}`}>
              EN
            </span>
            <span className={`vk-lang-badge ${language === 'th' && isLetters ? 'vk-lang-badge--active' : ''}`}>
              TH
            </span>
            <span className={`vk-lang-badge ${!isLetters ? 'vk-lang-badge--active' : ''}`}>
              !#1
            </span>
          </div>

          {/* Pure character rows (all rows except the last) */}
          {pureRows.map((row, rowIdx) => (
            <div className="vk-row" key={`pure-${rowIdx}`}>
              {row.map((key, i) => (
                <button
                  key={`pr${rowIdx}-${i}-${key}`}
                  type="button"
                  className={`vk-key vk-key--char${isCombining(key) ? ' vk-key--combining' : ''}`}
                  onClick={() => handleKeyPress(key)}
                >
                  {displayKey(key)}
                </button>
              ))}
            </div>
          ))}

          {/* Action row (shift/toggle + chars + backspace) */}
          <div className="vk-row">
            {/* Left special key */}
            {isLetters ? (
              <button
                type="button"
                className={`vk-key vk-key--action ${shiftClass}`}
                onClick={handleShift}
                aria-label={shiftAriaLabel}
              >
                {shiftLabel}
              </button>
            ) : (
              <button
                type="button"
                className="vk-key vk-key--mode-toggle"
                onClick={toggleSymbolPage}
                aria-label={isSymbols1 ? 'More symbols' : 'Back to numbers'}
              >
                {symbolToggleLabel}
              </button>
            )}

            {/* Character keys */}
            {actionRowChars.map((key, i) => (
              <button
                key={`ar-${i}-${key}`}
                type="button"
                className={`vk-key vk-key--char${isCombining(key) ? ' vk-key--combining' : ''}`}
                onClick={() => handleKeyPress(key)}
              >
                {displayKey(key)}
              </button>
            ))}

            {/* Backspace */}
            <button
              type="button"
              className="vk-key vk-key--action"
              onClick={onBackspace}
              aria-label="Backspace"
            >
              <Delete size={18} />
            </button>
          </div>

          {/* Utility row */}
          <div className="vk-row">
            {/* Symbol mode / return to letters */}
            <button
              type="button"
              className="vk-key vk-key--util"
              onClick={toggleSymbols}
            >
              {isLetters ? symbolModeLabel : returnLabel}
            </button>

            {/* Globe — language switch */}
            <button
              type="button"
              className="vk-key vk-key--util"
              onClick={cycleLanguage}
              aria-label="Switch language"
            >
              <Globe size={16} />
            </button>

            {/* Comma */}
            <button
              type="button"
              className="vk-key vk-key--char"
              onClick={() => handleKeyPress(',')}
            >
              ,
            </button>

            {/* Space bar */}
            <button
              type="button"
              className="vk-key vk-key--space"
              onClick={() => handleKeyPress(' ')}
            >
              {spaceLabel}
            </button>

            {/* Period */}
            <button
              type="button"
              className="vk-key vk-key--char"
              onClick={() => handleKeyPress('.')}
            >
              .
            </button>

            {/* Enter — heart icon */}
            <button
              type="button"
              className="vk-key vk-key--enter"
              onClick={onEnter}
              aria-label="Enter"
            >
              <Heart size={18} fill="currentColor" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
