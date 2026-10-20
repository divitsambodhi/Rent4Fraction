import React, { createContext, useContext, useEffect, useState } from 'react'
import { toast } from 'sonner'
import type {
  AuthStatus,
  AuthUser,
  CustomerSignUpData,
  UserRole,
  VendorSignUpData,
} from '@/types/auth'
import { INITIAL_MOCK_ACCOUNTS } from '@/lib/auth/mock-accounts'
import { mockAuthService } from '@/lib/auth/auth-service'

export interface AuthContextType {
  role: UserRole
  user: AuthUser | null
  status: AuthStatus
  login: (
    emailOrUser: string | AuthUser,
    password?: string,
    rememberMe?: boolean
  ) => Promise<AuthUser>
  signupCustomer: (data: CustomerSignUpData) => Promise<AuthUser>
  signupVendor: (data: VendorSignUpData) => Promise<AuthUser>
  updateProfile: (data: { name: string; phone?: string | null }) => Promise<AuthUser>
  logout: () => void
  setRole: (role: UserRole) => void
}

const AUTH_STORAGE_KEY = 'r4f-auth-user-v1'

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function MockAuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [realUser, setRealUser] = useState<AuthUser | null>(null)
  const [devRole, setDevRole] = useState<UserRole>('visitor')

  // Load persistent session on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(AUTH_STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as AuthUser
        setRealUser(parsed)
      }
    } catch {
      // Ignore
    } finally {
      setStatus('ready')
    }
  }, [])

  // Login handler supporting either email/password or AuthUser object
  const login = async (
    emailOrUser: string | AuthUser,
    password?: string,
    _rememberMe?: boolean
  ): Promise<AuthUser> => {
    if (typeof emailOrUser === 'string') {
      const user = await mockAuthService.signInWithEmail(emailOrUser, password || '')
      setRealUser(user)
      try {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user))
      } catch {
        // Ignore
      }
      return user
    } else {
      setRealUser(emailOrUser)
      try {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(emailOrUser))
      } catch {
        // Ignore
      }
      return emailOrUser
    }
  }

  const signupCustomer = async (data: CustomerSignUpData): Promise<AuthUser> => {
    const user = await mockAuthService.signUpCustomer(data)
    setRealUser(user)
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user))
    } catch {
      // Ignore
    }
    return user
  }

  const signupVendor = async (data: VendorSignUpData): Promise<AuthUser> => {
    const user = await mockAuthService.signUpVendor(data)
    setRealUser(user)
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user))
    } catch {
      // Ignore
    }
    return user
  }

  const updateProfile = async (data: { name: string; phone?: string | null }): Promise<AuthUser> => {
    const user = await mockAuthService.updateProfile(data)
    setRealUser(user)
    return user
  }

  const logout = () => {
    setRealUser(null)
    setDevRole('visitor')
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY)
    } catch {
      // Ignore
    }
    mockAuthService.signOut().catch(() => {})
    toast.info("You've been logged out", {
      description: 'Your session has ended.',
    })
  }

  // Dev role switcher override: only active when no real user is logged in
  const setRole = (newRole: UserRole) => {
    if (newRole === 'visitor') {
      setRealUser(null)
      try {
        localStorage.removeItem(AUTH_STORAGE_KEY)
      } catch {
        // Ignore
      }
      setDevRole('visitor')
    } else {
      // Pick preview account from mock
      const mockKey =
        newRole === 'customer'
          ? 'aarav@eventpro.in'
          : newRole === 'vendor'
          ? 'sargam@eventpro.in'
          : 'admin@eventpro.in'
      const acc = INITIAL_MOCK_ACCOUNTS[mockKey]
      if (acc) {
        login(acc.user)
      } else {
        setDevRole(newRole)
      }
    }
  }

  // Computed active role: realUser has priority, fallback to devRole
  const activeRole: UserRole = realUser ? realUser.role : devRole

  return (
    <AuthContext.Provider
      value={{
        role: activeRole,
        user: realUser,
        status,
        login,
        signupCustomer,
        signupVendor,
        updateProfile,
        logout,
        setRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within a MockAuthProvider')
  }
  return context
}
