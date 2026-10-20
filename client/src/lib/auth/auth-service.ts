import type {
  AuthUser,
  CustomerSignUpData,
  VendorSignUpData,
} from '@/types/auth'
import { AuthError } from './auth-errors'
import {
  checkRateLimit,
  getStoredAccounts,
  recordFailedAttempt,
  resetFailedAttempts,
  saveStoredAccount,
} from './mock-accounts'

const delay = (ms = 600) => new Promise((resolve) => setTimeout(resolve, ms))

function shouldSimulateNetworkError(): boolean {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search)
    return params.get('simulate') === 'network'
  }
  return false
}

function getInitials(name: string): string {
  const parts = name.trim().split(' ')
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

export interface AuthService {
  signInWithEmail: (email: string, password: string) => Promise<AuthUser>
  signUpCustomer: (data: CustomerSignUpData) => Promise<AuthUser>
  signUpVendor: (data: VendorSignUpData) => Promise<AuthUser>
  sendPasswordReset: (email: string) => Promise<void>
  sendEmailVerification: () => Promise<void>
  reloadUser: () => Promise<void>
  signOut: () => Promise<void>
  getCurrentUser: () => AuthUser | null
  updateProfile: (data: { name: string; phone?: string | null }) => Promise<AuthUser>
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>
  reauthenticate: (password: string) => Promise<boolean>
}

let activeUser: AuthUser | null = null

export const mockAuthService: AuthService = {
  getCurrentUser(): AuthUser | null {
    if (activeUser) return activeUser
    try {
      const raw = localStorage.getItem('r4f-auth-user-v1')
      if (raw) {
        activeUser = JSON.parse(raw) as AuthUser
        return activeUser
      }
    } catch {
      // Ignore
    }
    return null
  },

  async signInWithEmail(rawEmail: string, password: string): Promise<AuthUser> {
    await delay(650)

    if (shouldSimulateNetworkError()) {
      throw new AuthError('auth/network-request-failed')
    }

    const email = rawEmail.trim().toLowerCase()
    if (!email || !email.includes('@')) {
      throw new AuthError('auth/invalid-email')
    }

    // Rate limiting: 5 consecutive failures = 2 minute lockout
    if (!checkRateLimit(email)) {
      throw new AuthError('auth/too-many-requests')
    }

    const accounts = getStoredAccounts()
    const record = accounts[email]

    if (!record || record.password !== password) {
      recordFailedAttempt(email)
      throw new AuthError('auth/invalid-credential')
    }

    if (record.user.status === 'deactivated') {
      throw new AuthError('auth/user-disabled')
    }

    // Reset rate limit on success
    resetFailedAttempts(email)
    activeUser = record.user
    return record.user
  },

  async signUpCustomer(data: CustomerSignUpData): Promise<AuthUser> {
    await delay(750)

    if (shouldSimulateNetworkError()) {
      throw new AuthError('auth/network-request-failed')
    }

    const email = data.email.trim().toLowerCase()
    if (!email || !email.includes('@')) {
      throw new AuthError('auth/invalid-email')
    }

    const accounts = getStoredAccounts()
    if (accounts[email]) {
      throw new AuthError('auth/email-already-in-use')
    }

    if (data.password.length < 8) {
      throw new AuthError('auth/weak-password')
    }

    const newUser: AuthUser = {
      user_id: Date.now(),
      firebase_uid: `demo-customer-${Date.now()}`,
      name: data.name.trim(),
      email,
      phone: data.phone?.trim() || null,
      role: 'customer',
      avatarInitials: getInitials(data.name),
      email_verified: false,
    }

    saveStoredAccount(email, {
      user: newUser,
      password: data.password,
    })

    activeUser = newUser
    return newUser
  },

  async signUpVendor(data: VendorSignUpData): Promise<AuthUser> {
    await delay(850)

    if (shouldSimulateNetworkError()) {
      throw new AuthError('auth/network-request-failed')
    }

    const email = data.email.trim().toLowerCase()
    if (!email || !email.includes('@')) {
      throw new AuthError('auth/invalid-email')
    }

    const accounts = getStoredAccounts()
    if (accounts[email]) {
      throw new AuthError('auth/email-already-in-use')
    }

    if (data.password.length < 8) {
      throw new AuthError('auth/weak-password')
    }

    const newUser: AuthUser = {
      user_id: Date.now(),
      firebase_uid: `demo-vendor-${Date.now()}`,
      name: data.name.trim(),
      email,
      phone: data.phone.trim(),
      role: 'vendor',
      avatarInitials: getInitials(data.business_name || data.name),
      email_verified: false,
      vendor: {
        vendor_id: Date.now(),
        business_name: data.business_name.trim(),
        approval_status: 'pending',
      },
    }

    saveStoredAccount(email, {
      user: newUser,
      password: data.password,
    })

    activeUser = newUser
    return newUser
  },

  async sendPasswordReset(rawEmail: string): Promise<void> {
    await delay(500)

    if (shouldSimulateNetworkError()) {
      throw new AuthError('auth/network-request-failed')
    }

    const email = rawEmail.trim().toLowerCase()
    if (!email || !email.includes('@')) {
      throw new AuthError('auth/invalid-email')
    }

    // Always resolves without revealing whether account exists (Security standard)
  },

  async sendEmailVerification(): Promise<void> {
    await delay(500)

    if (shouldSimulateNetworkError()) {
      throw new AuthError('auth/network-request-failed')
    }
  },

  async reloadUser(): Promise<void> {
    await delay(400)
    if (activeUser) {
      activeUser.email_verified = true
      try {
        localStorage.setItem('r4f-auth-user-v1', JSON.stringify(activeUser))
      } catch {
        // Ignore
      }
    }
  },

  async signOut(): Promise<void> {
    await delay(300)
    activeUser = null
    try {
      localStorage.removeItem('r4f-auth-user-v1')
    } catch {
      // Ignore
    }
  },

  async updateProfile(data: { name: string; phone?: string | null }): Promise<AuthUser> {
    await delay(400)
    if (shouldSimulateNetworkError()) {
      throw new AuthError('auth/network-request-failed')
    }

    const current = this.getCurrentUser()
    if (!current) {
      throw new AuthError('auth/user-not-found')
    }

    const updated: AuthUser = {
      ...current,
      name: data.name.trim(),
      phone: data.phone !== undefined ? (data.phone ? data.phone.trim() : null) : current.phone,
      avatarInitials: getInitials(data.name.trim()),
    }

    activeUser = updated
    try {
      localStorage.setItem('r4f-auth-user-v1', JSON.stringify(updated))
      const accounts = getStoredAccounts()
      const record = accounts[current.email.toLowerCase()]
      if (record) {
        saveStoredAccount(current.email.toLowerCase(), {
          ...record,
          user: updated,
        })
      }
    } catch {
      // Ignore
    }

    return updated
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await delay(500)
    if (shouldSimulateNetworkError()) {
      throw new AuthError('auth/network-request-failed')
    }

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (params.get('simulate') === 'reauth') {
        throw new AuthError('auth/requires-recent-login')
      }
    }

    const current = this.getCurrentUser()
    if (!current) {
      throw new AuthError('auth/user-not-found')
    }

    const accounts = getStoredAccounts()
    const record = accounts[current.email.toLowerCase()]
    const expectedPassword = record ? record.password : 'Customer@123'

    if (currentPassword !== expectedPassword) {
      throw new AuthError('auth/wrong-password')
    }

    if (newPassword.length < 8) {
      throw new AuthError('auth/weak-password')
    }

    if (record) {
      saveStoredAccount(current.email.toLowerCase(), {
        ...record,
        password: newPassword,
      })
    }
  },

  async reauthenticate(password: string): Promise<boolean> {
    await delay(400)
    if (shouldSimulateNetworkError()) {
      throw new AuthError('auth/network-request-failed')
    }

    const current = this.getCurrentUser()
    if (!current) {
      throw new AuthError('auth/user-not-found')
    }

    const accounts = getStoredAccounts()
    const record = accounts[current.email.toLowerCase()]
    const expectedPassword = record ? record.password : 'Customer@123'

    if (password !== expectedPassword) {
      throw new AuthError('auth/wrong-password')
    }

    return true
  },
}
