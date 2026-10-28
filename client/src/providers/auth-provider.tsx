import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  signInWithPopup,
  signInWithRedirect,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  updateProfile as updateFirebaseProfile,
  type User as FirebaseUser,
} from 'firebase/auth'
import type {
  AuthStatus,
  AuthUser,
  CustomerSignUpData,
  UserRole,
  VendorSignUpData,
} from '@/types/auth'
import { env } from '@/lib/config/env'
import { auth, googleProvider } from '@/lib/firebase'
import { apiClient, ApiError } from '@/lib/api/client'
import { INITIAL_MOCK_ACCOUNTS } from '@/lib/auth/mock-accounts'
import { mockAuthService } from '@/lib/auth/auth-service'
import { CompleteProfileDialog } from '@/components/auth/complete-profile-dialog'

export interface CompleteRegistrationData {
  role: 'customer' | 'vendor'
  name: string
  phone: string
  business?: VendorSignUpData
}

export interface AuthContextType {
  role: UserRole
  user: AuthUser | null
  status: AuthStatus
  login: (
    emailOrUser: string | AuthUser,
    password?: string,
    rememberMe?: boolean
  ) => Promise<AuthUser>
  loginWithGoogle: () => Promise<AuthUser | { needsProfile: true; email: string; name: string }>
  signupCustomer: (data: CustomerSignUpData) => Promise<AuthUser>
  signupVendor: (data: VendorSignUpData) => Promise<AuthUser>
  completeRegistration: (data: CompleteRegistrationData) => Promise<AuthUser>
  updateProfile: (data: { name: string; phone?: string | null }) => Promise<AuthUser>
  logout: () => void
  setRole: (role: UserRole) => void
  needsProfileUser: { email: string; name: string } | null
  setNeedsProfileUser: (user: { email: string; name: string } | null) => void
}

const AUTH_STORAGE_KEY = 'r4f-auth-user-v1'

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [user, setUser] = useState<AuthUser | null>(null)
  const [devRole, setDevRole] = useState<UserRole>('visitor')
  const [needsProfileUser, setNeedsProfileUser] = useState<{ email: string; name: string } | null>(null)

  // Fetch backend user profile for authenticated Firebase session
  const fetchBackendUserProfile = useCallback(async (fbUser: FirebaseUser): Promise<AuthUser | null> => {
    try {
      const backendUser = await apiClient.get<AuthUser>('/api/v1/auth/me')
      return backendUser
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 403 && err.code === 'user_not_registered') {
        // User is logged into Firebase but not registered in backend database
        setNeedsProfileUser({
          email: fbUser.email || '',
          name: fbUser.displayName || '',
        })
        return null
      }
      console.warn('[Auth] Failed to fetch backend profile:', err)
      return null
    }
  }, [])

  // Listen to Firebase Auth state in real mode or localStorage in mock mode
  useEffect(() => {
    if (env.API_MODE === 'real') {
      const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
        if (fbUser) {
          const profile = await fetchBackendUserProfile(fbUser)
          if (profile) {
            setUser(profile)
            try {
              localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(profile))
            } catch {
              // Ignore
            }
          }
        } else {
          setUser(null)
          try {
            localStorage.removeItem(AUTH_STORAGE_KEY)
          } catch {
            // Ignore
          }
        }
        setStatus('ready')
      })

      return () => unsubscribe()
    } else {
      // Mock mode: restore local session
      try {
        const raw = localStorage.getItem(AUTH_STORAGE_KEY)
        if (raw) {
          const parsed = JSON.parse(raw) as AuthUser
          setUser(parsed)
        }
      } catch {
        // Ignore
      } finally {
        setStatus('ready')
      }
    }
  }, [fetchBackendUserProfile])

  // Email/Password login
  const login = async (
    emailOrUser: string | AuthUser,
    password?: string,
    rememberMe = false
  ): Promise<AuthUser> => {
    if (typeof emailOrUser !== 'string') {
      setUser(emailOrUser)
      try {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(emailOrUser))
      } catch {
        // Ignore
      }
      return emailOrUser
    }

    if (env.API_MODE === 'real') {
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence)
      const cred = await signInWithEmailAndPassword(auth, emailOrUser, password || '')
      const profile = await fetchBackendUserProfile(cred.user)
      if (!profile) {
        throw new Error('Account exists in Firebase but not registered in database. Please complete registration.')
      }
      setUser(profile)
      try {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(profile))
      } catch {
        // Ignore
      }
      return profile
    } else {
      const mockUser = await mockAuthService.signInWithEmail(emailOrUser, password || '')
      setUser(mockUser)
      try {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(mockUser))
      } catch {
        // Ignore
      }
      return mockUser
    }
  }

  // Google Social Sign-In
  const loginWithGoogle = async (): Promise<AuthUser | { needsProfile: true; email: string; name: string }> => {
    if (env.API_MODE === 'real') {
      let cred
      try {
        cred = await signInWithPopup(auth, googleProvider)
      } catch (popupErr: unknown) {
        const errCode = (popupErr as { code?: string })?.code
        if (errCode === 'auth/popup-blocked' || errCode === 'auth/cancelled-popup-request') {
          // Fallback to redirect
          await signInWithRedirect(auth, googleProvider)
          return { needsProfile: true, email: '', name: '' }
        }
        throw popupErr
      }

      const profile = await fetchBackendUserProfile(cred.user)
      if (profile) {
        setUser(profile)
        try {
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(profile))
        } catch {
          // Ignore
        }
        return profile
      }

      return {
        needsProfile: true,
        email: cred.user.email || '',
        name: cred.user.displayName || '',
      }
    } else {
      // Mock mode Google login
      const mockCustomer = INITIAL_MOCK_ACCOUNTS['aarav@eventpro.in'].user
      setUser(mockCustomer)
      return mockCustomer
    }
  }

  // Customer Signup
  const signupCustomer = async (data: CustomerSignUpData): Promise<AuthUser> => {
    if (env.API_MODE === 'real') {
      const cred = await createUserWithEmailAndPassword(auth, data.email, data.password)
      await updateFirebaseProfile(cred.user, { displayName: data.name })

      const newProfile = await apiClient.post<AuthUser>('/api/v1/auth/register', {
        role: 'customer',
        profile: {
          name: data.name,
          phone: data.phone || '',
        },
      })
      setUser(newProfile)
      try {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newProfile))
      } catch {
        // Ignore
      }
      return newProfile
    } else {
      const mockUser = await mockAuthService.signUpCustomer(data)
      setUser(mockUser)
      try {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(mockUser))
      } catch {
        // Ignore
      }
      return mockUser
    }
  }

  // Vendor Signup
  const signupVendor = async (data: VendorSignUpData): Promise<AuthUser> => {
    if (env.API_MODE === 'real') {
      const cred = await createUserWithEmailAndPassword(auth, data.email, data.password)
      await updateFirebaseProfile(cred.user, { displayName: data.name })

      const newProfile = await apiClient.post<AuthUser>('/api/v1/auth/register', {
        role: 'vendor',
        profile: {
          name: data.name,
          phone: data.phone,
        },
        business: {
          business_name: data.business_name,
          address: data.business_address,
          city: data.city,
          phone: data.phone,
          gst_number: data.gst_number || undefined,
          description: data.description || undefined,
        },
      })
      setUser(newProfile)
      try {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newProfile))
      } catch {
        // Ignore
      }
      return newProfile
    } else {
      const mockUser = await mockAuthService.signUpVendor(data)
      setUser(mockUser)
      try {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(mockUser))
      } catch {
        // Ignore
      }
      return mockUser
    }
  }

  // Complete profile after first Google Sign-In
  const completeRegistration = async (data: CompleteRegistrationData): Promise<AuthUser> => {
    const payload: Record<string, unknown> = {
      role: data.role,
      profile: {
        name: data.name,
        phone: data.phone,
      },
    }

    if (data.role === 'vendor' && data.business) {
      payload.business = {
        business_name: data.business.business_name,
        address: data.business.business_address,
        city: data.business.city,
        phone: data.phone,
        gst_number: data.business.gst_number || undefined,
        description: data.business.description || undefined,
      }
    }

    const newProfile = await apiClient.post<AuthUser>('/api/v1/auth/register', payload)
    setUser(newProfile)
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newProfile))
    } catch {
      // Ignore
    }
    return newProfile
  }

  // Update profile
  const updateProfile = async (data: { name: string; phone?: string | null }): Promise<AuthUser> => {
    if (env.API_MODE === 'real') {
      await apiClient.patch('/api/v1/auth/profile', data)
      if (auth.currentUser && data.name) {
        await updateFirebaseProfile(auth.currentUser, { displayName: data.name })
      }
      if (user) {
        const updated = { ...user, name: data.name, phone: data.phone || null }
        setUser(updated)
        try {
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updated))
        } catch {
          // Ignore
        }
        return updated
      }
      throw new Error('No user is currently logged in')
    } else {
      const updated = await mockAuthService.updateProfile(data)
      setUser(updated)
      return updated
    }
  }

  // Logout
  const logout = () => {
    setUser(null)
    setDevRole('visitor')
    setNeedsProfileUser(null)
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY)
    } catch {
      // Ignore
    }
    if (env.API_MODE === 'real') {
      firebaseSignOut(auth).catch(() => {})
    } else {
      mockAuthService.signOut().catch(() => {})
    }
    toast.info("You've been logged out", {
      description: 'Your session has ended.',
    })
  }

  // Dev role switcher (only active in dev mode when in mock mode or for role switching preview)
  const setRole = (newRole: UserRole) => {
    if (newRole === 'visitor') {
      setUser(null)
      try {
        localStorage.removeItem(AUTH_STORAGE_KEY)
      } catch {
        // Ignore
      }
      setDevRole('visitor')
    } else {
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

  const activeRole: UserRole = user ? user.role : devRole

  return (
    <AuthContext.Provider
      value={{
        role: activeRole,
        user,
        status,
        login,
        loginWithGoogle,
        signupCustomer,
        signupVendor,
        completeRegistration,
        updateProfile,
        logout,
        setRole,
        needsProfileUser,
        setNeedsProfileUser,
      }}
    >
      {children}
      <CompleteProfileDialog />
    </AuthContext.Provider>
  )
}

// Backwards-compatible alias
export const MockAuthProvider = AuthProvider

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
