/// <reference types="vite/client" />
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const requiredKeys = ['apiKey', 'authDomain', 'projectId', 'appId'] as const;
for (const key of requiredKeys) {
  if (!firebaseConfig[key]) {
    console.warn(`Missing Firebase config: VITE_FIREBASE_${key.replace(/([A-Z])/g, '_$1').toUpperCase()}`);
  }
}

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, import.meta.env.VITE_FIREBASE_DATABASE || "ai-studio-onlyoneyok1-bb467f00-23ec-47e6-a3b5-eaa3a4d2a337");
