/**
 * Authoritative Typed Environment Configuration Module (`src/lib/config/env.ts`)
 * Validates and exposes frontend environment variables.
 * Fails loudly on missing critical variables in 'real' API mode.
 */

export interface AppEnv {
  API_MODE: 'real' | 'mock'
  API_BASE_URL: string
  FIREBASE_API_KEY: string
  FIREBASE_AUTH_DOMAIN: string
  FIREBASE_PROJECT_ID: string
  FIREBASE_STORAGE_BUCKET: string
  FIREBASE_MESSAGING_SENDER_ID: string
  FIREBASE_APP_ID: string
  USE_AUTH_EMULATOR: boolean
  DEV_TOOLS: boolean
  IS_DEV: boolean
  IS_PROD: boolean
}

function parseBoolean(val: string | boolean | undefined, defaultValue = false): boolean {
  if (typeof val === 'boolean') return val
  if (typeof val === 'string') {
    return val.toLowerCase() === 'true' || val === '1'
  }
  return defaultValue
}

function validateEnv(): AppEnv {
  const isDev = import.meta.env.DEV
  const isProd = import.meta.env.PROD
  const mode = (import.meta.env.VITE_API_MODE || 'real').toLowerCase()
  const apiMode: 'real' | 'mock' = mode === 'mock' ? 'mock' : 'real'

  const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? (isDev ? '' : '')).replace(/\/+$/, '')

  const firebaseApiKey = import.meta.env.VITE_FIREBASE_API_KEY || ''
  const firebaseAuthDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || ''
  const firebaseProjectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || ''
  const firebaseStorageBucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || ''
  const firebaseMessagingSenderId = import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || ''
  const firebaseAppId = import.meta.env.VITE_FIREBASE_APP_ID || ''

  const useAuthEmulator = parseBoolean(import.meta.env.VITE_USE_AUTH_EMULATOR, false)
  const devTools = parseBoolean(import.meta.env.VITE_DEV_TOOLS, isDev)

  if (apiMode === 'real') {
    const missing: string[] = []
    if (!useAuthEmulator && !firebaseApiKey) missing.push('VITE_FIREBASE_API_KEY')
    if (!useAuthEmulator && !firebaseProjectId) missing.push('VITE_FIREBASE_PROJECT_ID')

    if (missing.length > 0) {
      const msg = `[CRITICAL ENV ERROR] Real API mode requires: ${missing.join(', ')}. Please configure .env.local or check .env.example.`
      console.error(msg)
      if (isProd) {
        throw new Error(msg)
      }
    }
  }

  return {
    API_MODE: apiMode,
    API_BASE_URL: apiBaseUrl,
    FIREBASE_API_KEY: firebaseApiKey,
    FIREBASE_AUTH_DOMAIN: firebaseAuthDomain,
    FIREBASE_PROJECT_ID: firebaseProjectId,
    FIREBASE_STORAGE_BUCKET: firebaseStorageBucket,
    FIREBASE_MESSAGING_SENDER_ID: firebaseMessagingSenderId,
    FIREBASE_APP_ID: firebaseAppId,
    USE_AUTH_EMULATOR: useAuthEmulator,
    DEV_TOOLS: devTools,
    IS_DEV: isDev,
    IS_PROD: isProd,
  }
}

export const env: AppEnv = validateEnv()

