// ─── OnlyOne Notification Sound Synthesizer ─────────────────────────
// Generates 6 custom notification sounds using the Web Audio API.
// Each sound is a short (1–2 second), cute/lovely chime.

export interface NotificationSound {
  id: string;
  name: string;
  description: string;
  emoji: string;
}

export const NOTIFICATION_SOUNDS: NotificationSound[] = [
  { id: 'gentle_bloom',  name: 'Gentle Bloom',  description: 'Soft ascending chime',      emoji: '🌸' },
  { id: 'sweet_whisper',  name: 'Sweet Whisper',  description: 'Delicate bell harmony',     emoji: '🌙' },
  { id: 'honey_drop',    name: 'Honey Drop',    description: 'Warm descending droplet',    emoji: '🍯' },
  { id: 'starlight',     name: 'Starlight',     description: 'Bright twinkling sparkle',   emoji: '✨' },
  { id: 'cozy_chime',    name: 'Cozy Chime',    description: 'Mellow wind-chime blend',    emoji: '🎐' },
  { id: 'love_ping',     name: 'Love Ping',     description: 'Playful bouncy ping',        emoji: '💕' },
];

// ─── Audio Context Singleton ────────────────────────────────────────

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  // Resume if suspended (browser autoplay policy)
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// ─── Sound Generators ───────────────────────────────────────────────

function createNote(
  ctx: AudioContext,
  frequency: number,
  startTime: number,
  duration: number,
  type: OscillatorType = 'sine',
  gain: number = 0.3,
  attack: number = 0.01,
  decay: number = 0.15,
): { osc: OscillatorNode; gainNode: GainNode } {
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, startTime);

  // ADSR-ish envelope: attack → sustain → decay
  gainNode.gain.setValueAtTime(0, startTime);
  gainNode.gain.linearRampToValueAtTime(gain, startTime + attack);
  gainNode.gain.setValueAtTime(gain, startTime + duration - decay);
  gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  osc.connect(gainNode);
  osc.start(startTime);
  osc.stop(startTime + duration);

  return { osc, gainNode };
}

/** Gentle Bloom — Soft ascending C major arpeggio, music box tone */
function playGentleBloom(ctx: AudioContext, dest: AudioNode): number {
  // C5 → E5 → G5 → C6 with sparkle overtone
  const notes = [523.25, 659.25, 783.99, 1046.5];
  const t = ctx.currentTime;
  const totalDuration = 1.4;

  notes.forEach((freq, i) => {
    const start = t + i * 0.18;
    const { gainNode } = createNote(ctx, freq, start, 0.6 - i * 0.05, 'sine', 0.25, 0.01, 0.3);
    gainNode.connect(dest);

    // Add sparkle harmonic
    const { gainNode: sparkle } = createNote(ctx, freq * 3, start + 0.02, 0.3, 'sine', 0.06, 0.005, 0.15);
    sparkle.connect(dest);
  });

  return totalDuration;
}

/** Sweet Whisper — Delicate two-note bell (perfect fifth) */
function playSweetWhisper(ctx: AudioContext, dest: AudioNode): number {
  const t = ctx.currentTime;
  const totalDuration = 1.2;

  // E5 → B5 (perfect fifth)
  const { gainNode: g1 } = createNote(ctx, 659.25, t, 0.8, 'sine', 0.3, 0.005, 0.5);
  g1.connect(dest);
  // Bell harmonic
  const { gainNode: h1 } = createNote(ctx, 659.25 * 2.76, t, 0.4, 'sine', 0.05, 0.002, 0.2);
  h1.connect(dest);

  const { gainNode: g2 } = createNote(ctx, 987.77, t + 0.25, 0.7, 'sine', 0.25, 0.005, 0.4);
  g2.connect(dest);
  // Bell harmonic
  const { gainNode: h2 } = createNote(ctx, 987.77 * 2.76, t + 0.25, 0.35, 'sine', 0.04, 0.002, 0.18);
  h2.connect(dest);

  // Soft sub tone for warmth
  const { gainNode: sub } = createNote(ctx, 329.63, t, 1.0, 'sine', 0.08, 0.02, 0.6);
  sub.connect(dest);

  return totalDuration;
}

/** Honey Drop — Warm descending droplet, pentatonic */
function playHoneyDrop(ctx: AudioContext, dest: AudioNode): number {
  // G5 → E5 → D5 → C5 — pentatonic descent
  const notes = [783.99, 659.25, 587.33, 523.25];
  const t = ctx.currentTime;
  const totalDuration = 1.3;

  notes.forEach((freq, i) => {
    const start = t + i * 0.14;
    // Mix sine + triangle for warmth
    const { gainNode: s } = createNote(ctx, freq, start, 0.5, 'sine', 0.2, 0.008, 0.25);
    s.connect(dest);
    const { gainNode: tr } = createNote(ctx, freq, start, 0.45, 'triangle', 0.1, 0.01, 0.2);
    tr.connect(dest);
  });

  // Warm resonance tail
  const { gainNode: tail } = createNote(ctx, 261.63, t + 0.3, 0.8, 'sine', 0.06, 0.1, 0.5);
  tail.connect(dest);

  return totalDuration;
}

/** Starlight — Bright twinkling sequence, celesta-like */
function playStarlight(ctx: AudioContext, dest: AudioNode): number {
  // High-register sparkle sequence
  const notes = [1318.51, 1567.98, 1760.0, 2093.0, 1760.0, 2093.0];
  const t = ctx.currentTime;
  const totalDuration = 1.5;

  notes.forEach((freq, i) => {
    const start = t + i * 0.12;
    const dur = i < 4 ? 0.25 : 0.45;
    const { gainNode } = createNote(ctx, freq, start, dur, 'sine', 0.15, 0.003, 0.12);
    gainNode.connect(dest);

    // Shimmer overtone
    const { gainNode: shimmer } = createNote(ctx, freq * 2, start + 0.005, dur * 0.6, 'sine', 0.03, 0.002, 0.08);
    shimmer.connect(dest);
  });

  return totalDuration;
}

/** Cozy Chime — Mellow wind-chime, Lydian mode with reverb-like tail */
function playCozyChime(ctx: AudioContext, dest: AudioNode): number {
  // F4 → A4 → B4 → E5 (Lydian feel)
  const notes = [349.23, 440.0, 493.88, 659.25];
  const t = ctx.currentTime;
  const totalDuration = 1.8;

  notes.forEach((freq, i) => {
    const start = t + i * 0.22;
    // Soft attack wind-chime character
    const { gainNode: s } = createNote(ctx, freq, start, 0.9 - i * 0.1, 'sine', 0.2, 0.04, 0.5);
    s.connect(dest);

    // Detuned pair for chorus/warmth
    const { gainNode: d } = createNote(ctx, freq * 1.003, start + 0.01, 0.8 - i * 0.1, 'sine', 0.08, 0.05, 0.4);
    d.connect(dest);
  });

  // Reverb-like tail (low octave)
  const { gainNode: tail } = createNote(ctx, 174.61, t + 0.5, 1.2, 'sine', 0.04, 0.2, 0.8);
  tail.connect(dest);

  return totalDuration;
}

/** Love Ping — Playful bouncy notification, rising major third */
function playLovePing(ctx: AudioContext, dest: AudioNode): number {
  const t = ctx.currentTime;
  const totalDuration = 1.0;

  // Bouncy: C5 → E5 → C5 → E5 → G5 (staccato)
  const notes = [523.25, 659.25, 523.25, 659.25, 783.99];
  const durations = [0.1, 0.1, 0.1, 0.1, 0.35];

  let offset = 0;
  notes.forEach((freq, i) => {
    const start = t + offset;
    const { gainNode } = createNote(ctx, freq, start, durations[i], 'sine', 0.25, 0.005, durations[i] * 0.4);
    gainNode.connect(dest);

    // Playful overtone
    const { gainNode: ot } = createNote(ctx, freq * 2, start, durations[i] * 0.6, 'sine', 0.06, 0.003, durations[i] * 0.3);
    ot.connect(dest);

    offset += durations[i] + 0.04;
  });

  return totalDuration;
}

// ─── Sound Map ──────────────────────────────────────────────────────

const SOUND_PLAYERS: Record<string, (ctx: AudioContext, dest: AudioNode) => number> = {
  gentle_bloom: playGentleBloom,
  sweet_whisper: playSweetWhisper,
  honey_drop: playHoneyDrop,
  starlight: playStarlight,
  cozy_chime: playCozyChime,
  love_ping: playLovePing,
};

// ─── Public API ─────────────────────────────────────────────────────

/** Preview a notification sound by ID. Returns the duration in seconds. */
export function playNotificationSound(soundId: string): number {
  const ctx = getAudioContext();
  const player = SOUND_PLAYERS[soundId];

  if (!player) {
    console.warn(`Unknown sound ID: ${soundId}`);
    return 0;
  }

  // Create a master gain for overall volume
  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0.7, ctx.currentTime);
  masterGain.connect(ctx.destination);

  return player(ctx, masterGain);
}

/** Check if Web Audio API is supported */
export function isAudioSupported(): boolean {
  return !!(window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
}
