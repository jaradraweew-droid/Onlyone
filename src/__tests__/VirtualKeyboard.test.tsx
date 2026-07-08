import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import VirtualKeyboard from '../components/VirtualKeyboard';

// ─── Mock motion/react ──────────────────────────────────────────────────
vi.mock('motion/react', () => ({
  motion: {
    div: React.forwardRef(({ children, ...props }: any, ref: any) => (
      <div ref={ref} {...props}>{children}</div>
    )),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// ─── Helpers ────────────────────────────────────────────────────────────

const setup = (overrides: Partial<Parameters<typeof VirtualKeyboard>[0]> = {}) => {
  const props = {
    isOpen: true,
    onKeyPress: vi.fn(),
    onBackspace: vi.fn(),
    onEnter: vi.fn(),
    ...overrides,
  };
  const result = render(<VirtualKeyboard {...props} />);
  return { ...result, props };
};

/** Combining Thai chars displayed with dotted circle prefix on keys */
const COMBINING = new Set([
  'ั', 'ิ', 'ี', 'ึ', 'ื', 'ุ', 'ู',
  '้', '่', '๊', '๋',
  '็', '์', 'ํ', 'ฺ',
]);
const displayChar = (ch: string) => (COMBINING.has(ch) ? '◌' + ch : ch);

/** Click the !#1 button in the utility row. Filters out the badge span. */
const clickSymbolButton = () => {
  const btns = screen.getAllByText('!#1').filter((el) => el.tagName === 'BUTTON');
  if (btns[0]) fireEvent.click(btns[0]);
};

// ═══════════════════════════════════════════════════════════════════════
//  Tests
// ═══════════════════════════════════════════════════════════════════════

describe('VirtualKeyboard', () => {
  // ─── 1. Visibility ────────────────────────────────────────────────

  describe('Visibility', () => {
    it('renders when isOpen is true', () => {
      setup();
      expect(screen.getByTestId('virtual-keyboard')).toBeDefined();
    });

    it('does not render when isOpen is false', () => {
      setup({ isOpen: false });
      expect(screen.queryByTestId('virtual-keyboard')).toBeNull();
    });
  });

  // ─── 2. English Layout (5-row with number row) ───────────────────

  describe('English Layout', () => {
    it('renders number row 1-0 on top', () => {
      setup();
      for (const n of '1234567890'.split('')) {
        expect(screen.getByText(n)).toBeDefined();
      }
    });

    it('renders all 26 QWERTY lowercase keys', () => {
      setup();
      for (const ch of 'qwertyuiopasdfghjklzxcvbnm') {
        expect(screen.getByText(ch)).toBeDefined();
      }
    });

    it('fires onKeyPress with the correct English character', () => {
      const { props } = setup();
      fireEvent.click(screen.getByText('q'));
      expect(props.onKeyPress).toHaveBeenCalledWith('q');
    });

    it('fires onKeyPress with number from top row', () => {
      const { props } = setup();
      fireEvent.click(screen.getByText('5'));
      expect(props.onKeyPress).toHaveBeenCalledWith('5');
    });

    it('shows English (US) on space bar', () => {
      setup();
      expect(screen.getByText('English (US)')).toBeDefined();
    });

    it('fires onKeyPress with space when space bar is pressed', () => {
      const { props } = setup();
      fireEvent.click(screen.getByText('English (US)'));
      expect(props.onKeyPress).toHaveBeenCalledWith(' ');
    });

    it('fires onKeyPress with comma when comma key is pressed', () => {
      const { props } = setup();
      const commas = screen.getAllByText(',');
      fireEvent.click(commas[0]);
      expect(props.onKeyPress).toHaveBeenCalledWith(',');
    });

    it('fires onKeyPress with period when period key is pressed', () => {
      const { props } = setup();
      const dots = screen.getAllByText('.');
      fireEvent.click(dots[0]);
      expect(props.onKeyPress).toHaveBeenCalledWith('.');
    });

    it('shows !#1 button in utility row', () => {
      setup();
      const btns = screen.getAllByText('!#1').filter((el) => el.tagName === 'BUTTON');
      expect(btns.length).toBeGreaterThan(0);
    });
  });

  // ─── 3. Shift & Caps Lock ────────────────────────────────────────

  describe('Shift & Caps Lock', () => {
    it('switches to uppercase after pressing Shift (numbers stay)', () => {
      setup();
      fireEvent.click(screen.getByLabelText('Shift'));
      expect(screen.getByText('Q')).toBeDefined();
      expect(screen.getByText('M')).toBeDefined();
      // Numbers stay visible
      expect(screen.getByText('1')).toBeDefined();
      expect(screen.getByText('0')).toBeDefined();
    });

    it('auto-releases Shift after pressing a key', () => {
      const { props } = setup();
      fireEvent.click(screen.getByLabelText('Shift'));
      fireEvent.click(screen.getByText('A'));
      expect(props.onKeyPress).toHaveBeenCalledWith('A');
      expect(screen.getByText('a')).toBeDefined();
    });

    it('cycles: off → shift → caps → off', () => {
      setup();
      expect(screen.getByText('q')).toBeDefined();
      fireEvent.click(screen.getByLabelText('Shift'));
      expect(screen.getByLabelText('Shift on')).toBeDefined();
      fireEvent.click(screen.getByLabelText('Shift on'));
      expect(screen.getByLabelText('Caps lock on')).toBeDefined();
      fireEvent.click(screen.getByLabelText('Caps lock on'));
      expect(screen.getByText('q')).toBeDefined();
    });

    it('keeps Caps Lock active after pressing a key', () => {
      const { props } = setup();
      fireEvent.click(screen.getByLabelText('Shift'));
      fireEvent.click(screen.getByLabelText('Shift on'));
      fireEvent.click(screen.getByText('A'));
      expect(props.onKeyPress).toHaveBeenCalledWith('A');
      expect(screen.getByText('Q')).toBeDefined();
    });
  });

  // ─── 4. English Symbol Page 1/2 ──────────────────────────────────

  describe('English Symbol Page 1/2', () => {
    it('shows numbers 1-0 on top row', () => {
      setup();
      clickSymbolButton();
      for (const n of '1234567890'.split('')) {
        expect(screen.getByText(n)).toBeDefined();
      }
    });

    it('shows math operators (+ × ÷ =)', () => {
      setup();
      clickSymbolButton();
      expect(screen.getByText('×')).toBeDefined();
      expect(screen.getByText('÷')).toBeDefined();
    });

    it('shows currency symbols (€ £ ¥ ₩)', () => {
      setup();
      clickSymbolButton();
      expect(screen.getByText('€')).toBeDefined();
      expect(screen.getByText('£')).toBeDefined();
      expect(screen.getByText('¥')).toBeDefined();
      expect(screen.getByText('₩')).toBeDefined();
    });

    it('shows punctuation (! @ # $ % ^ & *)', () => {
      setup();
      clickSymbolButton();
      expect(screen.getByText('!')).toBeDefined();
      expect(screen.getByText('@')).toBeDefined();
      expect(screen.getByText('#')).toBeDefined();
      expect(screen.getByText('$')).toBeDefined();
    });

    it('shows 1/2 toggle button', () => {
      setup();
      clickSymbolButton();
      expect(screen.getByText('1/2')).toBeDefined();
    });

    it('shows ABC label to return to letters', () => {
      setup();
      clickSymbolButton();
      expect(screen.getByText('ABC')).toBeDefined();
    });

    it('returns to EN letters when ABC is pressed', () => {
      setup();
      clickSymbolButton();
      fireEvent.click(screen.getByText('ABC'));
      expect(screen.getByText('q')).toBeDefined();
    });

    it('fires onKeyPress with a symbol', () => {
      const { props } = setup();
      clickSymbolButton();
      fireEvent.click(screen.getByText('@'));
      expect(props.onKeyPress).toHaveBeenCalledWith('@');
    });
  });

  // ─── 5. English Symbol Page 2/2 ──────────────────────────────────

  describe('English Symbol Page 2/2', () => {
    const goToEnSym2 = () => {
      clickSymbolButton();
      fireEvent.click(screen.getByText('1/2'));
    };

    it('shows numbers 1-0 on top row', () => {
      setup();
      goToEnSym2();
      for (const n of '1234567890'.split('')) {
        expect(screen.getByText(n)).toBeDefined();
      }
    });

    it('shows brackets and special chars (` ~ \\ | < > { } [ ])', () => {
      setup();
      goToEnSym2();
      expect(screen.getByText('{')).toBeDefined();
      expect(screen.getByText('}')).toBeDefined();
      expect(screen.getByText('[')).toBeDefined();
      expect(screen.getByText(']')).toBeDefined();
      expect(screen.getByText('~')).toBeDefined();
    });

    it('shows card suit symbols (♠ ♥ ♦ ♣)', () => {
      setup();
      goToEnSym2();
      expect(screen.getByText('♠')).toBeDefined();
      expect(screen.getByText('♥')).toBeDefined();
      expect(screen.getByText('♦')).toBeDefined();
      expect(screen.getByText('♣')).toBeDefined();
    });

    it('shows geometric shapes (° • ○ ● □ ■)', () => {
      setup();
      goToEnSym2();
      expect(screen.getByText('°')).toBeDefined();
      expect(screen.getByText('○')).toBeDefined();
      expect(screen.getByText('□')).toBeDefined();
      expect(screen.getByText('■')).toBeDefined();
    });

    it('shows 2/2 toggle button', () => {
      setup();
      goToEnSym2();
      expect(screen.getByText('2/2')).toBeDefined();
    });

    it('toggles back to page 1/2 when 2/2 is pressed', () => {
      setup();
      goToEnSym2();
      fireEvent.click(screen.getByText('2/2'));
      expect(screen.getByText('@')).toBeDefined();
    });

    it('shows English (US) on space bar in symbol mode', () => {
      setup();
      goToEnSym2();
      expect(screen.getByText('English (US)')).toBeDefined();
    });
  });

  // ─── 6. Thai Layout (5-row Kedmanee) ─────────────────────────────

  describe('Thai Layout', () => {
    it('switches to Thai when Globe is pressed', () => {
      setup();
      fireEvent.click(screen.getByLabelText('Switch language'));
      expect(screen.getByText('ก')).toBeDefined();
      expect(screen.getByText('ฟ')).toBeDefined();
    });

    it('renders Thai number-row (ๅ ภ ถ ค ต จ ข ช)', () => {
      setup();
      fireEvent.click(screen.getByLabelText('Switch language'));
      for (const ch of ['ๅ', 'ภ', 'ถ', 'ค', 'ต', 'จ', 'ข', 'ช']) {
        expect(screen.getByText(ch)).toBeDefined();
      }
    });

    it('renders Thai combining chars ุ and ึ in number-row', () => {
      setup();
      fireEvent.click(screen.getByLabelText('Switch language'));
      expect(screen.getByText(displayChar('ุ'))).toBeDefined();
      expect(screen.getByText(displayChar('ึ'))).toBeDefined();
    });

    it('renders all Thai QWERTY-row characters (row 2)', () => {
      setup();
      fireEvent.click(screen.getByLabelText('Switch language'));
      const row = ['ๆ', 'ไ', 'ำ', 'พ', 'ะ', 'ั', 'ี', 'ร', 'น', 'ย', 'บ', 'ล'];
      for (const ch of row) {
        expect(screen.getByText(displayChar(ch))).toBeDefined();
      }
    });

    it('renders all Thai ASDF-row characters (row 3)', () => {
      setup();
      fireEvent.click(screen.getByLabelText('Switch language'));
      const row = ['ฟ', 'ห', 'ก', 'ด', 'เ', '้', '่', 'า', 'ส', 'ว', 'ง'];
      for (const ch of row) {
        expect(screen.getByText(displayChar(ch))).toBeDefined();
      }
    });

    it('renders all Thai ZXCV-row characters (row 4 action row)', () => {
      setup();
      fireEvent.click(screen.getByLabelText('Switch language'));
      const row = ['ผ', 'ป', 'แ', 'อ', 'ิ', 'ื', 'ท', 'ม', 'ใ', 'ฝ'];
      for (const ch of row) {
        expect(screen.getByText(displayChar(ch))).toBeDefined();
      }
    });

    it('fires onKeyPress with a Thai character', () => {
      const { props } = setup();
      fireEvent.click(screen.getByLabelText('Switch language'));
      fireEvent.click(screen.getByText('ก'));
      expect(props.onKeyPress).toHaveBeenCalledWith('ก');
    });

    it('shows Thai shift characters when Shift is active', () => {
      setup();
      fireEvent.click(screen.getByLabelText('Switch language'));
      fireEvent.click(screen.getByLabelText('Shift'));
      expect(screen.getByText('ฎ')).toBeDefined();
      expect(screen.getByText('ฑ')).toBeDefined();
      expect(screen.getByText('ษ')).toBeDefined();
      expect(screen.getByText('ฉ')).toBeDefined();
      expect(screen.getByText('ฮ')).toBeDefined();
      expect(screen.getByText('ฦ')).toBeDefined();
    });

    it('shows ไทย on space bar in Thai mode', () => {
      setup();
      fireEvent.click(screen.getByLabelText('Switch language'));
      expect(screen.getByText('ไทย')).toBeDefined();
    });

    it('cycles back to English when Globe is pressed again', () => {
      setup();
      fireEvent.click(screen.getByLabelText('Switch language'));
      expect(screen.getByText('ก')).toBeDefined();
      fireEvent.click(screen.getByLabelText('Switch language'));
      expect(screen.getByText('q')).toBeDefined();
    });
  });

  // ─── 7. Thai Symbol Page 1/2 ──────────────────────────────────

  describe('Thai Symbol Page 1/2', () => {
    const goToThSym1 = () => {
      fireEvent.click(screen.getByLabelText('Switch language'));
      clickSymbolButton();
    };

    it('shows numbers 1-0', () => {
      setup();
      goToThSym1();
      for (const n of '1234567890'.split('')) {
        expect(screen.getByText(n)).toBeDefined();
      }
    });

    it('shows ฿ (Baht) instead of ₩ (Won)', () => {
      setup();
      goToThSym1();
      expect(screen.getByText('฿')).toBeDefined();
    });

    it('shows 1/2 toggle button', () => {
      setup();
      goToThSym1();
      expect(screen.getByText('1/2')).toBeDefined();
    });

    it('shows กขค label to return to letters', () => {
      setup();
      goToThSym1();
      expect(screen.getByText('กขค')).toBeDefined();
    });

    it('returns to Thai letters when กขค is pressed', () => {
      setup();
      goToThSym1();
      fireEvent.click(screen.getByText('กขค'));
      expect(screen.getByText('ก')).toBeDefined();
    });

    it('shows ไทย on space bar in TH symbol mode', () => {
      setup();
      goToThSym1();
      expect(screen.getByText('ไทย')).toBeDefined();
    });
  });

  // ─── 8. Thai Symbol Page 2/2 ──────────────────────────────────

  describe('Thai Symbol Page 2/2', () => {
    const goToThSym2 = () => {
      fireEvent.click(screen.getByLabelText('Switch language'));
      clickSymbolButton();
      fireEvent.click(screen.getByText('1/2'));
    };

    it('shows Thai numerals ๑-๐', () => {
      setup();
      goToThSym2();
      for (const n of ['๑', '๒', '๓', '๔', '๕', '๖', '๗', '๘', '๙', '๐']) {
        expect(screen.getByText(n)).toBeDefined();
      }
    });

    it('shows card suit symbols (♠ ♥ ♦ ♣)', () => {
      setup();
      goToThSym2();
      expect(screen.getByText('♠')).toBeDefined();
      expect(screen.getByText('♥')).toBeDefined();
      expect(screen.getByText('♦')).toBeDefined();
      expect(screen.getByText('♣')).toBeDefined();
    });

    it('shows rare Thai consonants ฃ and ฅ', () => {
      setup();
      goToThSym2();
      expect(screen.getByText('ฃ')).toBeDefined();
      expect(screen.getByText('ฅ')).toBeDefined();
    });

    it('shows 2/2 toggle button', () => {
      setup();
      goToThSym2();
      expect(screen.getByText('2/2')).toBeDefined();
    });

    it('toggles back to page 1/2 when 2/2 is pressed', () => {
      setup();
      goToThSym2();
      fireEvent.click(screen.getByText('2/2'));
      expect(screen.getByText('@')).toBeDefined();
    });
  });

  // ─── 9. Language Indicator ────────────────────────────────────

  describe('Language Indicator', () => {
    it('shows EN badge active by default', () => {
      setup();
      const en = screen.getByText('EN');
      expect(en.className).toContain('vk-lang-badge--active');
    });

    it('shows TH badge active in Thai mode', () => {
      setup();
      fireEvent.click(screen.getByLabelText('Switch language'));
      const th = screen.getByText('TH');
      expect(th.className).toContain('vk-lang-badge--active');
    });

    it('shows !#1 badge active in symbol mode', () => {
      setup();
      clickSymbolButton();
      const badges = screen.getAllByText('!#1').filter(
        (el) => el.className.includes('vk-lang-badge'),
      );
      expect(badges[0].className).toContain('vk-lang-badge--active');
    });
  });

  // ─── 10. Backspace & Enter ─────────────────────────────────────

  describe('Backspace & Enter', () => {
    it('calls onBackspace when Backspace is pressed', () => {
      const { props } = setup();
      fireEvent.click(screen.getByLabelText('Backspace'));
      expect(props.onBackspace).toHaveBeenCalledOnce();
    });

    it('calls onEnter when Enter (heart) is pressed', () => {
      const { props } = setup();
      fireEvent.click(screen.getByLabelText('Enter'));
      expect(props.onEnter).toHaveBeenCalledOnce();
    });
  });

  // ─── 11. Full Typing Flows ────────────────────────────────────

  describe('Full Typing Flows', () => {
    it('EN → TH → back to EN', () => {
      const { props } = setup();
      fireEvent.click(screen.getByText('h'));
      fireEvent.click(screen.getByText('i'));
      fireEvent.click(screen.getByLabelText('Switch language'));
      fireEvent.click(screen.getByText('ก'));
      fireEvent.click(screen.getByLabelText('Switch language'));
      fireEvent.click(screen.getByText('a'));
      expect(props.onKeyPress).toHaveBeenCalledWith('h');
      expect(props.onKeyPress).toHaveBeenCalledWith('i');
      expect(props.onKeyPress).toHaveBeenCalledWith('ก');
      expect(props.onKeyPress).toHaveBeenCalledWith('a');
    });

    it('EN number row → letters without mode switch', () => {
      const { props } = setup();
      // Numbers are directly accessible in letters mode
      fireEvent.click(screen.getByText('5'));
      fireEvent.click(screen.getByText('h'));
      fireEvent.click(screen.getByText('e'));
      fireEvent.click(screen.getByText('l'));
      fireEvent.click(screen.getByText('l'));
      fireEvent.click(screen.getByText('o'));
      expect(props.onKeyPress).toHaveBeenCalledWith('5');
      expect(props.onKeyPress).toHaveBeenCalledWith('h');
    });

    it('EN letters → sym1 → sym2 → back to letters', () => {
      const { props } = setup();
      fireEvent.click(screen.getByText('q'));
      clickSymbolButton();
      fireEvent.click(screen.getByText('@'));
      fireEvent.click(screen.getByText('1/2'));
      fireEvent.click(screen.getByText('♥'));
      fireEvent.click(screen.getByText('ABC'));
      fireEvent.click(screen.getByText('z'));
      expect(props.onKeyPress).toHaveBeenCalledWith('q');
      expect(props.onKeyPress).toHaveBeenCalledWith('@');
      expect(props.onKeyPress).toHaveBeenCalledWith('♥');
      expect(props.onKeyPress).toHaveBeenCalledWith('z');
    });

    it('TH letters → TH sym1 → TH sym2 (Thai numerals) → back', () => {
      const { props } = setup();
      fireEvent.click(screen.getByLabelText('Switch language'));
      fireEvent.click(screen.getByText('ก'));
      clickSymbolButton();
      fireEvent.click(screen.getByText('3'));
      fireEvent.click(screen.getByText('1/2'));
      fireEvent.click(screen.getByText('๕'));
      fireEvent.click(screen.getByText('กขค'));
      fireEvent.click(screen.getByText('ฟ'));
      expect(props.onKeyPress).toHaveBeenCalledWith('ก');
      expect(props.onKeyPress).toHaveBeenCalledWith('3');
      expect(props.onKeyPress).toHaveBeenCalledWith('๕');
      expect(props.onKeyPress).toHaveBeenCalledWith('ฟ');
    });
  });

  // ─── 12. Complete Thai Consonant Coverage ─────────────────────

  describe('Thai Consonant Coverage (all 44)', () => {
    const ALL_44 = [
      'ก', 'ข', 'ฃ', 'ค', 'ฅ', 'ฆ', 'ง', 'จ', 'ฉ', 'ช', 'ซ',
      'ฌ', 'ญ', 'ฎ', 'ฏ', 'ฐ', 'ฑ', 'ฒ', 'ณ', 'ด', 'ต', 'ถ',
      'ท', 'ธ', 'น', 'บ', 'ป', 'ผ', 'ฝ', 'พ', 'ฟ', 'ภ', 'ม',
      'ย', 'ร', 'ล', 'ว', 'ศ', 'ษ', 'ส', 'ห', 'ฬ', 'อ', 'ฮ',
    ];

    const BASE_CONSONANTS = [
      'ภ', 'ถ', 'ค', 'ต', 'จ', 'ข', 'ช',
      'พ', 'ร', 'น', 'ย', 'บ', 'ล',
      'ฟ', 'ห', 'ก', 'ด', 'ส', 'ว', 'ง',
      'ผ', 'ป', 'อ', 'ท', 'ม', 'ฝ',
    ];

    it('has 26 consonants in TH base', () => {
      setup();
      fireEvent.click(screen.getByLabelText('Switch language'));
      for (const ch of BASE_CONSONANTS) {
        expect(screen.getByText(ch)).toBeDefined();
      }
      expect(BASE_CONSONANTS.length).toBe(26);
    });

    const SHIFT_CONSONANTS = [
      'ฎ', 'ฑ', 'ธ', 'ณ', 'ญ', 'ฐ',
      'ฆ', 'ฏ', 'ฌ', 'ษ', 'ศ', 'ซ',
      'ฉ', 'ฮ', 'ฒ', 'ฬ',
    ];

    it('has 16 consonants in TH shift', () => {
      setup();
      fireEvent.click(screen.getByLabelText('Switch language'));
      fireEvent.click(screen.getByLabelText('Shift'));
      for (const ch of SHIFT_CONSONANTS) {
        expect(screen.getByText(ch)).toBeDefined();
      }
      expect(SHIFT_CONSONANTS.length).toBe(16);
    });

    const SYM_CONSONANTS = ['ฃ', 'ฅ'];

    it('has 2 rare consonants (ฃ, ฅ) in TH symbol page 2', () => {
      setup();
      fireEvent.click(screen.getByLabelText('Switch language'));
      clickSymbolButton();
      fireEvent.click(screen.getByText('1/2'));
      for (const ch of SYM_CONSONANTS) {
        expect(screen.getByText(ch)).toBeDefined();
      }
    });

    it('covers all 44 consonants across base + shift + symbol pages', () => {
      const covered = new Set([...BASE_CONSONANTS, ...SHIFT_CONSONANTS, ...SYM_CONSONANTS]);
      for (const ch of ALL_44) {
        expect(covered.has(ch)).toBe(true);
      }
      expect(covered.size).toBe(44);
    });
  });

  // ─── 13. Comma Key ───────────────────────────────────────────

  describe('Comma Key', () => {
    it('has a comma key in the utility row', () => {
      const { props } = setup();
      const commas = screen.getAllByText(',');
      fireEvent.click(commas[0]);
      expect(props.onKeyPress).toHaveBeenCalledWith(',');
    });
  });
});
