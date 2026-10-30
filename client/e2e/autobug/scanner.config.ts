// client/e2e/autobug/scanner.config.ts
// Configuration for the autonomous scanner, supporting local and staging environments.

export const BASE_URL = process.env.BASE_URL || process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173'
export const API_URL = process.env.API_URL || 'http://localhost:8000'
export const IS_PRODUCTION = Boolean(process.env.IS_PRODUCTION === 'true' || process.env.ENV === 'prod')

export const TEST_USERS = {
  customer: {
    user_id: 101,
    firebase_uid: 'fb-autobug-customer',
    name: 'Autobug Customer',
    email: 'autobug.cust@example.com',
    phone: '9820011223',
    role: 'customer',
    email_verified: true,
  },
  vendor: {
    user_id: 202,
    firebase_uid: 'fb-autobug-vendor',
    name: 'Autobug Vendor Pro',
    email: 'autobug.vendor@example.com',
    phone: '9845099887',
    role: 'vendor',
    email_verified: true,
    vendor: {
      vendor_id: 1,
      business_name: 'Autobug Sound & Light',
      approval_status: 'approved',
    },
  },
  admin: {
    user_id: 303,
    firebase_uid: 'fb-autobug-admin',
    name: 'Autobug Admin',
    email: 'autobug.admin@example.com',
    phone: '9811122334',
    role: 'admin',
    email_verified: true,
  },
}

export const ROUTES_BY_ROLE: Record<string, string[]> = {
  visitor: ['/', '/catalog', '/help', '/auth'],
  customer: ['/', '/catalog', '/cart', '/checkout', '/account'],
  vendor: ['/vendor', '/vendor/orders', '/vendor/inventory'],
  admin: ['/admin'],
}

export const VIEWPORTS = {
  mobile: { width: 375, height: 667 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1280, height: 800 },
}

