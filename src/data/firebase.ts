import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app'

/** The one Firebase app, shared by sign-in sync and "Listen together". Loaded only by those features. */
export function firebaseApp(): FirebaseApp {
  if (getApps().length) return getApp()
  return initializeApp({
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  })
}
