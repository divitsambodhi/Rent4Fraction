import type { BookingSummary } from './account'
import type { VendorProfile } from './vendor'
import type { Coupon } from './checkout'

export type AdminSection =
  | 'overview'
  | 'vendors'
  | 'equipment'
  | 'disputes'
  | 'payouts'
  | 'categories'
  | 'coupons'
  | 'users'
  | 'bookings'

export interface AdminOverviewKPIs {
  grossBookingValue: number
  bookingsCount: number
  bookingsDelta: string
  activeVendorsCount: number
  pendingApplicationsCount: number
  openDisputesCount: number
  platformCommissionEarned: number
  chartData: { date: string; bookings: number; bookingValue: number }[]
  attentionItems: { id: string; label: string; count: number; href: string }[]
  recentBookings: BookingSummary[]
  recentApplications: VendorProfile[]
}

export interface AdminDispute {
  dispute_id: string
  booking_id: string
  vendor_order_id: string
  customer_name: string
  customer_email: string
  vendor_name: string
  vendor_id: string
  equipment_name: string
  equipment_id: string
  claimed_amount: number
  deducted_from_deposit: number
  status: 'reported' | 'disputed' | 'resolved'
  description: string
  dispute_reason?: string
  filed_at: string
  resolved_at?: string
  resolved_by?: string
  resolution_note?: string
  deposit_held: number
}

export type AdminUserStatus = 'active' | 'deactivated'

export interface AdminUser {
  user_id: string
  name: string
  email: string
  role: 'customer' | 'vendor' | 'admin'
  email_verified: boolean
  status: AdminUserStatus
  joined_at: string
  last_login: string
  bookings_count: number
  avatar_initials: string
  vendor_id?: string
}

export type CouponDerivedStatus = 'active' | 'scheduled' | 'expired' | 'inactive' | 'limit_reached'

export function deriveCouponStatus(coupon: Coupon, now = new Date()): CouponDerivedStatus {
  if (!coupon.is_active) {
    return 'inactive'
  }
  if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
    return 'limit_reached'
  }
  const nowDate = now.toISOString()
  if (coupon.valid_from && coupon.valid_from > nowDate) {
    return 'scheduled'
  }
  const expiry = coupon.valid_to || coupon.expires_at
  if (expiry && expiry < nowDate) {
    return 'expired'
  }
  return 'active'
}
