/// <reference types="vite/client" />
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const getEnvVar = (key: string): string | undefined => {
  // Vite client build will replace import.meta.env.KEY with the static value
  // In Node environment, we fallback to process.env.KEY
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
      return import.meta.env[key];
    }
  } catch (_) {}
  try {
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key];
    }
  } catch (_) {}
  return undefined;
};

const firebaseConfig = {
  apiKey: getEnvVar('VITE_FIREBASE_API_KEY'),
  authDomain: getEnvVar('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: getEnvVar('VITE_FIREBASE_PROJECT_ID'),
  appId: getEnvVar('VITE_FIREBASE_APP_ID'),
};

const requiredKeys = ['apiKey', 'authDomain', 'projectId', 'appId'] as const;
for (const key of requiredKeys) {
  if (!firebaseConfig[key]) {
    console.warn(`Missing Firebase config: VITE_FIREBASE_${key.replace(/([A-Z])/g, '_$1').toUpperCase()}`);
  }
}

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, getEnvVar('VITE_FIREBASE_DATABASE') || "ai-studio-onlyoneyok1-bb467f00-23ec-47e6-a3b5-eaa3a4d2a337");
