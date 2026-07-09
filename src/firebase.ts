/// <reference types="vite/client" />
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

/**
 * Reads an environment variable that works in both:
 *  - Vite (browser build): `import.meta.env` is statically replaced at build time
 *  - Node.js (server.cjs): falls back to `process.env` using an optional node-specific key
 */
function getEnvVar(viteKey: string, nodeKey?: string): string | undefined {
  // Browser / Vite build path — import.meta.env values are inlined at build time
  const viteMeta = (typeof import.meta !== 'undefined' && import.meta?.env)
    ? import.meta.env[viteKey]
    : undefined;
  if (viteMeta) return viteMeta;

  // Node.js / server path — prefer nodeKey, fall back to viteKey
  if (typeof process !== 'undefined' && process?.env) {
    return process.env[nodeKey ?? viteKey] ?? process.env[viteKey];
  }

  return undefined;
}

const firebaseConfig = {
  apiKey:     getEnvVar('VITE_FIREBASE_API_KEY',     'FIREBASE_API_KEY'),
  authDomain: getEnvVar('VITE_FIREBASE_AUTH_DOMAIN', 'FIREBASE_AUTH_DOMAIN'),
  projectId:  getEnvVar('VITE_FIREBASE_PROJECT_ID',  'FIREBASE_PROJECT_ID'),
  appId:      getEnvVar('VITE_FIREBASE_APP_ID',      'FIREBASE_APP_ID'),
};

const REQUIRED_CONFIG_KEYS = ['apiKey', 'authDomain', 'projectId', 'appId'] as const;
for (const key of REQUIRED_CONFIG_KEYS) {
  if (!firebaseConfig[key]) {
    console.warn(`[Firebase] Missing config key: ${key}`);
  }
}

const DEFAULT_DATABASE_ID = 'ai-studio-onlyoneyok1-bb467f00-23ec-47e6-a3b5-eaa3a4d2a337';

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(
  app,
  getEnvVar('VITE_FIREBASE_DATABASE', 'FIREBASE_DATABASE') ?? DEFAULT_DATABASE_ID,
);
