import React, { createContext, useContext, useEffect, useState, useMemo } from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile as updateFirebaseProfile,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  type User as FirebaseUser,
} from 'firebase/auth'
import { auth, googleProvider } from '@/lib/firebase'
import { apiClient } from '@/lib/api/client'
import type {
  AuthUser,
  CustomerSignUpData,
  VendorSignUpData,
} from '@/types/auth'
import type { UserRole } from '@/types'
import { toast } from 'sonner'
import { CompleteProfileDialog } from '@/components/auth/complete-profile-dialog'

export interface CompleteRegistrationData {
  role: 'customer' | 'vendor'
  name: string
  phone: string
  business?: {
    business_name: string
    business_address: string
    city: string
    gst_number?: string
    description?: string
  }
}

interface AuthContextType {
  user: AuthUser | null
  role: UserRole
  status: 'loading' | 'ready'
  login: (email: string, password?: string, rememberMe?: boolean) => Promise<AuthUser>
  loginWithGoogle: (initialRole?: 'customer' | 'vendor') => Promise<AuthUser | { needsProfile: true; email: string; name: string }>
  signupCustomer: (data: CustomerSignUpData) => Promise<AuthUser>
  signupVendor: (data: VendorSignUpData) => Promise<AuthUser>
  needsProfileUser: { email: string; name: string; initialRole?: 'customer' | 'vendor' } | null
  setNeedsProfileUser: (user: { email: string; name: string; initialRole?: 'customer' | 'vendor' } | null) => void
  completeRegistration: (data: CompleteRegistrationData) => Promise<AuthUser>
  updateProfile: (data: { name: string; phone?: string | null }) => Promise<AuthUser>
  logout: () => void
}

const AUTH_STORAGE_KEY = 'r4f-auth-user-v1'

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    if (typeof window === 'undefined') return null
    try {
      const cached = localStorage.getItem(AUTH_STORAGE_KEY)
      return cached ? JSON.parse(cached) : null
    } catch {
      return null
    }
  })

  const [status, setStatus] = useState<'loading' | 'ready'>('loading')
  const [needsProfileUser, setNeedsProfileUser] = useState<{ email: string; name: string; initialRole?: 'customer' | 'vendor' } | null>(null)

  // Fetch verified profile from backend database
  const fetchBackendUserProfile = async (fbUser: FirebaseUser): Promise<AuthUser | null> => {
    try {
      const token = await fbUser.getIdToken()
      return await apiClient.get<AuthUser>('/api/v1/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
    } catch {
      return null
    }
  }

  // Firebase auth state subscription
  useEffect(() => {
    let mounted = true

    // Check redirect result from Google Social Sign-In
    getRedirectResult(auth)
      .then(async (result) => {
        if (result && result.user && mounted) {
          const profile = await fetchBackendUserProfile(result.user)
          if (profile) {
            setUser(profile)
            localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(profile))
          } else {
            setNeedsProfileUser({
              email: result.user.email || '',
              name: result.user.displayName || '',
            })
          }
        }
      })
      .catch((err) => {
        console.warn('Redirect sign-in resolution error:', err)
      })

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (!mounted) return

      if (fbUser) {
        const profile = await fetchBackendUserProfile(fbUser)
        if (mounted) {
          if (profile) {
            setUser(profile)
            try {
              localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(profile))
            } catch {
              // Ignore
            }
          } else {
            setUser(null)
            setNeedsProfileUser({
              email: fbUser.email || '',
              name: fbUser.displayName || '',
            })
          }
          setStatus('ready')
        }
      } else {
        if (mounted) {
          setUser(null)
          try {
            localStorage.removeItem(AUTH_STORAGE_KEY)
          } catch {
            // Ignore
          }
          setStatus('ready')
        }
      }
    })

    return () => {
      mounted = false
      unsubscribe()
    }
  }, [])

  // Derived role: strictly from the server user record, or 'visitor'
  const role: UserRole = useMemo(() => {
    if (!user) return 'visitor'
    return (user.role as UserRole) || 'customer'
  }, [user])

  // Login
  const login = async (email: string, password?: string, rememberMe = true): Promise<AuthUser> => {
    await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence)
    const cred = await signInWithEmailAndPassword(auth, email, password || '')
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
  }

  // Google Social Sign-In
  const loginWithGoogle = async (initialRole: 'customer' | 'vendor' = 'customer'): Promise<AuthUser | { needsProfile: true; email: string; name: string }> => {
    let cred
    try {
      cred = await signInWithPopup(auth, googleProvider)
    } catch (popupErr: unknown) {
      const errCode = (popupErr as { code?: string })?.code
      if (errCode === 'auth/popup-blocked' || errCode === 'auth/cancelled-popup-request') {
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

    setNeedsProfileUser({
      email: cred.user.email || '',
      name: cred.user.displayName || '',
      initialRole,
    })

    return {
      needsProfile: true,
      email: cred.user.email || '',
      name: cred.user.displayName || '',
    }
  }

  // Customer Signup
  const signupCustomer = async (data: CustomerSignUpData): Promise<AuthUser> => {
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
  }

  // Vendor Signup
  const signupVendor = async (data: VendorSignUpData): Promise<AuthUser> => {
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
  }

  // Logout
  const logout = () => {
    setUser(null)
    setNeedsProfileUser(null)
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY)
    } catch {
      // Ignore
    }
    firebaseSignOut(auth).catch(() => {})
    toast.info("You've been logged out", {
      description: 'Your session has ended.',
    })
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        status,
        login,
        loginWithGoogle,
        signupCustomer,
        signupVendor,
        needsProfileUser,
        setNeedsProfileUser,
        completeRegistration,
        updateProfile,
        logout,
      }}
    >
      {children}

      {needsProfileUser && <CompleteProfileDialog />}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
