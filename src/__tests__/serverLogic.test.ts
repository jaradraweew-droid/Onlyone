import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── getEnvVar logic tests ─────────────────────────────────────────────────────
// We test the pure getEnvVar function logic directly (without importing firebase.ts
// which calls initializeApp at module level and would cause duplicate-app errors).

function getEnvVar(viteKey: string, nodeKey?: string): string | undefined {
  // Browser / Vite build path — statically replaced at build time (always undefined in tests)
  const viteMeta = (typeof import.meta !== 'undefined' && import.meta?.env)
    ? import.meta.env[viteKey]
    : undefined;
  if (viteMeta) return viteMeta;

  // Node.js / server path
  if (typeof process !== 'undefined' && process?.env) {
    return process.env[nodeKey ?? viteKey] ?? process.env[viteKey];
  }
  return undefined;
}

describe('getEnvVar', () => {
  const ORIGINAL_ENV = { ...process.env };

  afterEach(() => {
    // Restore process.env after each test
    Object.keys(process.env).forEach((key) => {
      if (!(key in ORIGINAL_ENV)) delete process.env[key];
    });
    Object.assign(process.env, ORIGINAL_ENV);
  });

  it('should return the nodeKey value from process.env when set', () => {
    process.env['TEST_FIREBASE_KEY'] = 'test-node-key';
    expect(getEnvVar('TEST_VITE_FIREBASE_KEY', 'TEST_FIREBASE_KEY')).toBe('test-node-key');
  });

  it('should fall back to viteKey in process.env when nodeKey is not set', () => {
    delete process.env['TEST_FIREBASE_KEY'];
    process.env['TEST_VITE_FIREBASE_KEY'] = 'test-vite-key';
    expect(getEnvVar('TEST_VITE_FIREBASE_KEY', 'TEST_FIREBASE_KEY')).toBe('test-vite-key');
  });

  it('should return undefined when neither key is set', () => {
    delete process.env['TEST_FIREBASE_KEY'];
    delete process.env['TEST_VITE_FIREBASE_KEY'];
    expect(getEnvVar('TEST_VITE_FIREBASE_KEY', 'TEST_FIREBASE_KEY')).toBeUndefined();
  });

  it('should use viteKey as nodeKey when nodeKey param is omitted', () => {
    process.env['TEST_VITE_DB'] = 'my-db';
    expect(getEnvVar('TEST_VITE_DB')).toBe('my-db');
  });
});

// ─── isTimeBetween logic tests ────────────────────────────────────────────────
// Extracted as a pure-function test — mirrors server.ts logic without
// importing the whole Express server.

function isTimeBetween(current: string, start: string, end: string): boolean {
  if (start <= end) {
    return current >= start && current <= end;
  }
  return current >= start || current <= end;
}

describe('isTimeBetween (quiet hours helper)', () => {
  it('should return true when current time is within a same-day range', () => {
    expect(isTimeBetween('14:00', '09:00', '18:00')).toBe(true);
  });

  it('should return false when current time is outside a same-day range', () => {
    expect(isTimeBetween('08:00', '09:00', '18:00')).toBe(false);
    expect(isTimeBetween('19:00', '09:00', '18:00')).toBe(false);
  });

  it('should return true when current time is within an overnight range (e.g., 22:00–07:00)', () => {
    expect(isTimeBetween('23:00', '22:00', '07:00')).toBe(true);
    expect(isTimeBetween('03:00', '22:00', '07:00')).toBe(true);
  });

  it('should return false when current time is outside an overnight range', () => {
    expect(isTimeBetween('12:00', '22:00', '07:00')).toBe(false);
  });

  it('should return true at the exact start boundary', () => {
    expect(isTimeBetween('09:00', '09:00', '18:00')).toBe(true);
  });

  it('should return true at the exact end boundary', () => {
    expect(isTimeBetween('18:00', '09:00', '18:00')).toBe(true);
  });

  it('should handle midnight boundary (00:00) correctly', () => {
    // Overnight range: 23:30 to 00:30
    expect(isTimeBetween('00:00', '23:30', '00:30')).toBe(true);
    expect(isTimeBetween('23:45', '23:30', '00:30')).toBe(true);
    expect(isTimeBetween('01:00', '23:30', '00:30')).toBe(false);
  });
});

// ─── getPairId logic tests ────────────────────────────────────────────────────
// Mirrors the server.ts getPairId function.

function getPairId(code1: string, code2: string): string {
  return [code1, code2].sort().join('_');
}

describe('getPairId', () => {
  it('should always return the same pair ID regardless of argument order', () => {
    expect(getPairId('Alice', 'Bob')).toBe(getPairId('Bob', 'Alice'));
  });

  it('should join sorted codes with an underscore', () => {
    expect(getPairId('Quiet-Willow-657', 'Calm-Meadow-408')).toBe(
      'Calm-Meadow-408_Quiet-Willow-657'
    );
  });

  it('should handle identical codes', () => {
    expect(getPairId('Same-Code-000', 'Same-Code-000')).toBe('Same-Code-000_Same-Code-000');
  });
});

// ─── Pet action label map tests ───────────────────────────────────────────────
// Tests the lookup table logic we added to replace nested ternaries.

const ACTION_LABEL_MAP: Record<string, string> = {
  feed: 'fed',
  love: 'loved',
  play: 'played with',
};

function getActionLabel(actionType: string | undefined): string {
  if (!actionType) return 'interacted with';
  return ACTION_LABEL_MAP[actionType] ?? actionType;
}

describe('getActionLabel (pet action map)', () => {
  it('should return "fed" for feed action', () => {
    expect(getActionLabel('feed')).toBe('fed');
  });

  it('should return "loved" for love action', () => {
    expect(getActionLabel('love')).toBe('loved');
  });

  it('should return "played with" for play action', () => {
    expect(getActionLabel('play')).toBe('played with');
  });

  it('should return "interacted with" for undefined action type', () => {
    expect(getActionLabel(undefined)).toBe('interacted with');
  });

  it('should return the raw action type for unknown actions (future-proof)', () => {
    expect(getActionLabel('bathe')).toBe('bathe');
  });
});
