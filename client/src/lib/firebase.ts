import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import {
  getAuth,
  GoogleAuthProvider,
  connectAuthEmulator,
  type Auth,
} from 'firebase/auth'
import { env } from './config/env'

const firebaseConfig = {
  apiKey: env.FIREBASE_API_KEY,
  authDomain: env.FIREBASE_AUTH_DOMAIN,
  projectId: env.FIREBASE_PROJECT_ID,
  storageBucket: env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.FIREBASE_MESSAGING_SENDER_ID,
  appId: env.FIREBASE_APP_ID,
}

export const firebaseApp: FirebaseApp =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]

export const auth: Auth = getAuth(firebaseApp)

export const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({
  prompt: 'select_account',
})

if (env.USE_AUTH_EMULATOR) {
  try {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  } catch {
    // Already connected or unsupported
  }
}

/**
 * Returns a fresh or cached Firebase ID token for the authenticated user.
 */
export async function getCurrentFirebaseToken(forceRefresh = false): Promise<string | null> {
  const currentUser = auth.currentUser
  if (!currentUser) return null
  try {
    return await currentUser.getIdToken(forceRefresh)
  } catch (err) {
    console.warn('[Firebase] Failed to fetch ID token:', err)
    return null
  }
}

