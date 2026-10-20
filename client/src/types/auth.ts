export type Role = 'customer' | 'vendor' | 'admin'
export type UserRole = 'visitor' | Role

export interface VendorBusiness {
  business_name: string
  address: string
  city: string
  gst_number?: string
  description?: string
}

export interface AuthUser {
  user_id: number | string
  firebase_uid: string
  name: string
  email: string
  phone: string | null
  role: Role
  avatarInitials: string
  email_verified: boolean
  vendor?: {
    vendor_id: number | string
    business_name: string
    approval_status: 'pending' | 'approved' | 'rejected' | 'suspended'
  }
}

export type AuthMode = 'login' | 'signup' | 'vendor'

export type AuthStatus = 'loading' | 'ready'

export interface CustomerSignUpData {
  name: string
  email: string
  phone?: string | null
  password: string
}

export interface VendorSignUpData {
  name: string
  email: string
  phone: string
  password: string
  business_name: string
  business_address: string
  city: string
  gst_number?: string
  description?: string
}
