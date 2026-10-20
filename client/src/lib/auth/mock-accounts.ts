import type { AuthUser } from '@/types/auth'
import type { AdminUser, AdminUserStatus } from '@/types/admin'

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

export function getAllMockUsers(): AdminUser[] {
  const accounts = getStoredAccounts()
  return Object.values(accounts).map((acc) => ({
    user_id: String(acc.user.user_id),
    name: acc.user.name,
    email: acc.user.email,
    role: acc.user.role,
    email_verified: acc.user.email_verified,
    status: (acc.user.status as AdminUserStatus) || 'active',
    joined_at: acc.user.joined_at || '12 Jan 2026',
    last_login: acc.user.last_login || 'Today, 2:45 PM',
    bookings_count: acc.user.bookings_count ?? (acc.user.role === 'customer' ? 3 : 0),
    avatar_initials: acc.user.avatarInitials,
    vendor_id: acc.user.vendor ? String(acc.user.vendor.vendor_id) : undefined,
  }))
}

export function toggleMockUserStatus(userId: string): AdminUser {
  const accounts = getStoredAccounts()
  const entry = Object.entries(accounts).find(([_, acc]) => String(acc.user.user_id) === userId)
  if (!entry) {
    throw new Error(`User with ID ${userId} not found`)
  }
  const [email, record] = entry
  if (record.user.role === 'admin') {
    throw new Error('Administrators cannot deactivate their own or other administrator accounts')
  }

  const currentStatus = record.user.status || 'active'
  const nextStatus = currentStatus === 'active' ? 'deactivated' : 'active'
  record.user.status = nextStatus
  accounts[email] = record

  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_ACCOUNTS_KEY, JSON.stringify(accounts))
  }

  return {
    user_id: String(record.user.user_id),
    name: record.user.name,
    email: record.user.email,
    role: record.user.role,
    email_verified: record.user.email_verified,
    status: nextStatus,
    joined_at: record.user.joined_at || '12 Jan 2026',
    last_login: record.user.last_login || 'Today, 2:45 PM',
    bookings_count: record.user.bookings_count ?? (record.user.role === 'customer' ? 3 : 0),
    avatar_initials: record.user.avatarInitials,
    vendor_id: record.user.vendor ? String(record.user.vendor.vendor_id) : undefined,
  }
}
