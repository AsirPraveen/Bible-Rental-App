// src/config/firebaseConfig.js
// Firebase is used for Google Authentication only.
// All other app data stays in our own MongoDB backend.

import { initializeApp, getApps } from 'firebase/app';
import { initializeAuth, getAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

// EXPO_PUBLIC_ prefix makes these vars available directly via process.env
// in Expo (Metro bundler inlines them automatically — no Constants needed).
const firebaseConfig = {
  apiKey:            process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Prevent "duplicate app" error on hot-reload
const app = getApps().length === 0
  ? initializeApp(firebaseConfig)
  : getApps()[0];

// Use AsyncStorage for auth persistence so the session survives app restarts.
// Guard against "auth/already-initialized" on hot-reload / fast-refresh.
let firebaseAuth;
try {
  firebaseAuth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (e) {
  // If initializeAuth was already called for this app, fall back to getAuth
  firebaseAuth = getAuth(app);
}

export { firebaseAuth };
export default app;
