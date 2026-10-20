import type { AuthUser } from '@/types/auth'

export interface MockAccountRecord {
  user: AuthUser
  password: string
}

// DEV ONLY: Default mock accounts for local development and verification
export const INITIAL_MOCK_ACCOUNTS: Record<string, MockAccountRecord> = {
  'aarav@example.com': {
    password: 'Customer@123',
    user: {
      user_id: 1,
      firebase_uid: 'demo-customer-aarav',
      name: 'Aarav Mehta',
      email: 'aarav@example.com',
      phone: '9876543210',
      role: 'customer',
      avatarInitials: 'AM',
      email_verified: true,
    },
  },
  'sargam@example.com': {
    password: 'Vendor@123',
    user: {
      user_id: 2,
      firebase_uid: 'demo-vendor-sargam',
      name: 'Sargam Sound Systems',
      email: 'sargam@example.com',
      phone: '9845012345',
      role: 'vendor',
      avatarInitials: 'SS',
      email_verified: true,
      vendor: {
        vendor_id: 1,
        business_name: 'Sargam Sound Systems',
        approval_status: 'approved',
      },
    },
  },
  'newvendor@example.com': {
    password: 'Vendor@123',
    user: {
      user_id: 3,
      firebase_uid: 'demo-vendor-pending',
      name: 'New Vendor Enterprises',
      email: 'newvendor@example.com',
      phone: '9123456789',
      role: 'vendor',
      avatarInitials: 'NV',
      email_verified: false,
      vendor: {
        vendor_id: 2,
        business_name: 'New Vendor Enterprises',
        approval_status: 'pending',
      },
    },
  },
  'admin@example.com': {
    password: 'Admin@123',
    user: {
      user_id: 4,
      firebase_uid: 'demo-admin-super',
      name: 'Superadmin User',
      email: 'admin@example.com',
      phone: null,
      role: 'admin',
      avatarInitials: 'AD',
      email_verified: true,
    },
  },
}

const STORAGE_ACCOUNTS_KEY = 'r4f-mock-accounts-v1'

// Load persisted accounts or fallback to initial
export function getStoredAccounts(): Record<string, MockAccountRecord> {
  if (typeof window === 'undefined') return INITIAL_MOCK_ACCOUNTS
  try {
    const raw = localStorage.getItem(STORAGE_ACCOUNTS_KEY)
    if (!raw) return { ...INITIAL_MOCK_ACCOUNTS }
    const parsed = JSON.parse(raw)
    return { ...INITIAL_MOCK_ACCOUNTS, ...parsed }
  } catch {
    return { ...INITIAL_MOCK_ACCOUNTS }
  }
}

// Save newly registered account
export function saveStoredAccount(email: string, record: MockAccountRecord) {
  if (typeof window === 'undefined') return
  try {
    const current = getStoredAccounts()
    current[email.toLowerCase()] = record
    localStorage.setItem(STORAGE_ACCOUNTS_KEY, JSON.stringify(current))
  } catch {
    // Ignore quota issues in mock
  }
}

// Consecutive failed login rate limiting: 5 attempts per email, 2 minutes reset
interface AttemptTracker {
  count: number
  firstFailedAt: number
}

const failedAttemptsMap = new Map<string, AttemptTracker>()
const LOCKOUT_DURATION_MS = 2 * 60 * 1000 // 2 minutes
const MAX_CONSECUTIVE_FAILURES = 5

export function checkRateLimit(email: string): boolean {
  const norm = email.toLowerCase()
  const tracker = failedAttemptsMap.get(norm)
  if (!tracker) return true

  const now = Date.now()
  if (now - tracker.firstFailedAt > LOCKOUT_DURATION_MS) {
    // Lockout expired, reset
    failedAttemptsMap.delete(norm)
    return true
  }

  return tracker.count < MAX_CONSECUTIVE_FAILURES
}

export function recordFailedAttempt(email: string) {
  const norm = email.toLowerCase()
  const now = Date.now()
  const tracker = failedAttemptsMap.get(norm)

  if (!tracker || now - tracker.firstFailedAt > LOCKOUT_DURATION_MS) {
    failedAttemptsMap.set(norm, { count: 1, firstFailedAt: now })
  } else {
    tracker.count += 1
  }
}

export function resetFailedAttempts(email: string) {
  failedAttemptsMap.delete(email.toLowerCase())
}
