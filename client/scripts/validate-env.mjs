// client/scripts/validate-env.mjs
// Validates frontend build-time environment variables.
// In production builds, missing variables will fail the build immediately.

const requiredProdVars = [
  'VITE_API_BASE_URL',
  'VITE_CLOUDINARY_CLOUD_NAME',
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_APP_ID',
]

const isProd = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1'

console.log('🔍 Validating frontend environment variables...')

const missing = []
for (const varName of requiredProdVars) {
  const val = process.env[varName]
  if (!val || val.trim() === '') {
    missing.push(varName)
  }
}

if (missing.length > 0) {
  if (isProd) {
    console.error('❌ FATAL: Missing required production environment variables:')
    for (const v of missing) {
      console.error(`   - ${v}`)
    }
    process.exit(1)
  } else {
    console.warn('⚠️ Development warning: The following env vars are not set (local fallbacks will be used):')
    for (const v of missing) {
      console.warn(`   - ${v}`)
    }
  }
}

// Additional sanity checks
if (process.env.VITE_DEV_TOOLS === 'true' && isProd) {
  console.error('❌ FATAL: VITE_DEV_TOOLS cannot be true in production build!')
  process.exit(1)
}

if (process.env.VITE_USE_AUTH_EMULATOR === 'true' && isProd) {
  console.error('❌ FATAL: VITE_USE_AUTH_EMULATOR cannot be true in production build!')
  process.exit(1)
}

console.log('✅ Frontend environment validation passed.')

