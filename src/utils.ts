import { IMAGE_MAX_SIZE, IMAGE_QUALITY, DEFAULT_MOODS } from './constants';

// ─── Seed Code Generation ───────────────────────────────────────────

const ADJECTIVES = ['Green', 'Quiet', 'Soft', 'Gentle', 'Calm', 'Sage'];
const NOUNS = ['Willow', 'Fern', 'Moss', 'Brook', 'Meadow', 'Leaf'];

/** Generates a random seed code like "Green-Willow-123". */
export function generateSeedCode(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = Math.floor(Math.random() * 900) + 100;
  return `${adj}-${noun}-${num}`;
}

/** Generates a short random ID. */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

// ─── Mood Helpers ───────────────────────────────────────────────────

/** Returns the hex color or Tailwind background color class for a mood string. */
export function getMoodColor(mood: string): string {
  const found = DEFAULT_MOODS.find((m) => m.value === mood);
  return found?.color || '#7A8B7D';
}

/** Returns a capitalized mood label. */
export function getMoodLabel(mood: string): string {
  if (!mood) return 'Unknown';
  return mood.charAt(0).toUpperCase() + mood.slice(1);
}

// ─── Anniversary Calculation ────────────────────────────────────────

/** Calculates the time elapsed since the anniversary date. Returns null if no date is set. */
export function calculateAnniversary(anniversaryDate: number | null | undefined): string | null {
  if (anniversaryDate == null) return null;

  const start = new Date(anniversaryDate);
  const now = new Date();

  let years = now.getFullYear() - start.getFullYear();
  let months = now.getMonth() - start.getMonth();
  let days = now.getDate() - start.getDate();

  if (days < 0) {
    months--;
    const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    days += prevMonth.getDate();
  }

  if (months < 0) {
    years--;
    months += 12;
  }

  const parts: string[] = [];
  if (years > 0) parts.push(`${years}y`);
  if (months > 0) parts.push(`${months}m`);
  if (days > 0 || (years === 0 && months === 0)) parts.push(`${days}d`);

  return parts.join(' ');
}

// ─── Image Compression ─────────────────────────────────────────────

/** Compresses an image file to a JPEG data URL with bounded dimensions. */
export function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error('Failed to read file'));

    reader.onload = (event) => {
      const img = new Image();

      img.onerror = () => reject(new Error('Failed to load image'));

      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > IMAGE_MAX_SIZE) {
            height *= IMAGE_MAX_SIZE / width;
            width = IMAGE_MAX_SIZE;
          }
        } else {
          if (height > IMAGE_MAX_SIZE) {
            width *= IMAGE_MAX_SIZE / height;
            height = IMAGE_MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas 2D context'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        resolve(canvas.toDataURL('image/jpeg', IMAGE_QUALITY));
      };

      const result = event.target?.result;
      if (typeof result !== 'string') {
        reject(new Error('FileReader result is not a string'));
        return;
      }
      img.src = result;
    };

    reader.readAsDataURL(file);
  });
}

// ─── Date / Time Formatting ─────────────────────────────────────────

const timeFormatter = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: 'numeric' });
const dateFormatter = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
const timeOnlyFormatter = new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

/** Formats a timestamp to a short time string like "3:45 PM". */
export function formatTime(timestamp: number): string {
  return timeFormatter.format(timestamp);
}

/** Formats a timestamp to "DD/MM/YYYY • HH:MM". */
export function formatDateTime(timestamp: number): string {
  return `${dateFormatter.format(timestamp)} • ${timeOnlyFormatter.format(timestamp)}`;
}

// ─── Base64 Utility ─────────────────────────────────────────────────

/** Converts a URL-safe Base64 string to a Uint8Array (for push notification keys). */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
