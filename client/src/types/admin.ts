import type { BookingSummary } from './account'
import type { VendorProfile } from './vendor'
import type { Coupon } from './checkout'
import type { CanonicalCategory } from '@/lib/api/canonical-ids'

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

export type AdminOverviewStats = AdminOverviewKPIs

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

export type AdminDisputeItem = AdminDispute

export type AdminUserStatus = 'active' | 'deactivated'

export interface AdminUser {
  user_id: string
  name: string
  email: string
  role: 'customer' | 'vendor' | 'admin'
  email_verified: boolean
  status: AdminUserStatus
  joined_at: string
  last_login?: string
  bookings_count: number
  avatar_initials: string
  vendor_id?: string
}

export interface AdminVendorItem extends VendorProfile {
  equipment_count?: number
  total_revenue?: number
  status?: string
}

export interface AdminEquipmentItem {
  equipment_id: string
  id?: string
  vendor_id: string
  vendor_name: string
  category_id: string
  category_name: string
  name: string
  price_per_day: number
  security_deposit: number
  quantity: number
  status: string
  commission_rate?: number | null
  effective_commission_rate?: number
  commission_source?: string
  created_at: string
  photos?: string[]
}

export type AdminBookingItem = BookingSummary

export interface ManagedCategory extends Omit<Partial<CanonicalCategory>, 'description'> {
  id: string
  category_id?: string
  name: string
  parent_id?: string | null
  description?: string | null
  default_commission_rate?: number | null
  is_active: boolean
  equipment_count?: number
  subcategories?: ManagedCategory[]
  groupId?: string
  groupName?: string
  icon?: string
  image?: string
  starting_price?: number
}

export type AdminCategoryItem = ManagedCategory

export interface AdminCouponItem extends Coupon {
  id?: string
  coupon_id?: string
  status?: CouponDerivedStatus
}

export interface AdminPayoutItem {
  payout_id: string
  order_id: string
  vendor_id: string
  vendor_name: string
  customer_name: string
  gross_amount: number
  commission_amount: number
  net_amount: number
  status: string
  paid_at?: string | null
  created_at: string
}

export type AdminPayoutRow = AdminPayoutItem

export interface SystemCheckItem {
  check_id: string
  name: string
  status: 'pass' | 'fail'
  message: string
  violations_count: number
  offending_ids: string[]
}

export interface SystemChecksReport {
  passed: boolean
  total_checks: number
  passed_checks: number
  failed_checks: number
  timestamp: string
  checks: SystemCheckItem[]
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
