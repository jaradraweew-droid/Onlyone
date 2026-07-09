/// <reference types="vite/client" />
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Helper to read env vars that works in both Vite (browser) and Node.js (server)
const getEnvVar = (viteKey: string, nodeKey?: string): string | undefined => {
  // In browser (Vite build), import.meta.env is statically replaced at build time
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      const val = import.meta.env[viteKey];
      if (val) return val;
    }
  } catch (_) {}
  // In Node.js (server.cjs), fall back to process.env
  try {
    if (typeof process !== 'undefined' && process.env) {
      // Try the node-specific key first, then the VITE_ prefixed key
      const key = nodeKey || viteKey;
      const val = process.env[key] || process.env[viteKey];
      if (val) return val;
    }
  } catch (_) {}
  return undefined;
};

// Firebase public config — these values are safe to embed.
// The VITE_ vars are injected by Vite for the browser bundle.
// For the Node.js server bundle, we fall back to FIREBASE_* env vars
// (without VITE_ prefix) which are set in Cloud Run environment settings.
const firebaseConfig = {
  apiKey:      getEnvVar('VITE_FIREBASE_API_KEY',      'FIREBASE_API_KEY'),
  authDomain:  getEnvVar('VITE_FIREBASE_AUTH_DOMAIN',  'FIREBASE_AUTH_DOMAIN'),
  projectId:   getEnvVar('VITE_FIREBASE_PROJECT_ID',   'FIREBASE_PROJECT_ID'),
  appId:       getEnvVar('VITE_FIREBASE_APP_ID',       'FIREBASE_APP_ID'),
};

const requiredKeys = ['apiKey', 'authDomain', 'projectId', 'appId'] as const;
for (const key of requiredKeys) {
  if (!firebaseConfig[key]) {
    console.warn(`[Firebase] Missing config key: ${key}`);
  }
}

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(
  app,
  getEnvVar('VITE_FIREBASE_DATABASE', 'FIREBASE_DATABASE')
    || 'ai-studio-onlyoneyok1-bb467f00-23ec-47e6-a3b5-eaa3a4d2a337'
);
