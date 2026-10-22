import type { EquipmentImage, EquipmentStatus } from './index'

export type { EquipmentStatus, EquipmentImage }

export type VendorApprovalStatus = 'pending' | 'approved' | 'rejected' | 'suspended'

export type AvailabilityReason = 'maintenance' | 'vendor_blocked' | 'booked'

export type PayoutStatus = 'pending' | 'processing' | 'paid'

export type VendorDashboardTab = 'overview' | 'payouts' | 'reviews' | 'inbox' | 'profile'

export type OverviewRange = '7d' | '30d' | '90d' | 'ytd'

export interface VendorKpis {
  net_earnings: number
  net_earnings_delta?: string
  net_earnings_delta_percent: number
  pending_orders: number
  active_orders: number
  active_orders_today: number
  active_orders_delta?: string
  completed_orders: number
  completed_orders_delta?: string
  completed_orders_delta_percent: number
  equipment_listed: number
  avg_rating: number
  rating: number
  review_count: number
}

export interface EarningsDataPoint {
  date: string
  label: string
  gross: number
  commission: number
  net: number
  amount: number
}

export interface AttentionItem {
  id: string
  type?: 'order' | 'review' | 'stock' | 'return' | 'dispute'
  title?: string
  label?: string
  href: string
  count: number
  tone?: 'warning' | 'danger' | 'info' | 'neutral'
}

export interface VendorOrderSummary {
  order_id: string
  booking_id?: string
  order_number: string
  customer_name: string
  customer_initials?: string
  items_summary: string
  start_date?: string
  end_date?: string
  date_range?: string
  total_days: number
  rental_days?: number
  status: 'pending' | 'accepted' | 'rejected' | 'dispatched' | 'delivered' | 'returned' | 'completed' | 'cancelled'
  amount: number
}

export type VendorRecentOrder = VendorOrderSummary

export interface TopEquipmentItem {
  id: string
  equipment_id: string
  name: string
  category: string
  image: string
  rental_count: number
  rentals_count: number
  avg_rating: number
  rating: number
  total_revenue: number
  earnings: number
}

export interface ScheduleEvent {
  id: string
  type: 'delivery' | 'return' | 'pickup'
  time: string
  customer_name: string
  equipment_name: string
  location?: string
  order_id?: string
}

export interface ScheduleDayGroup {
  date: string
  day_label: string
  events: ScheduleEvent[]
}

export interface ScheduleItem {
  id: string
  type: 'delivery' | 'return' | 'pickup'
  time_label: string
  date_label: string
  customer_name: string
  city: string
  equipment_name: string
  order_id: string
}

export interface VendorOverview {
  range: OverviewRange
  kpis: VendorKpis
  earnings_series: EarningsDataPoint[]
  attention_items: AttentionItem[]
  attention: {
    new_orders_waiting: number
    returns_awaiting_inspection: number
    disputed_damage_reports: number
    reviews_needing_reply: number
    low_stock_items: number
  }
  recent_orders: VendorRecentOrder[]
  top_equipment: TopEquipmentItem[]
  schedule: ScheduleDayGroup[]
}

export interface PayoutLineItem {
  equipment_name: string
  quantity: number
  daily_rate: number
  days: number
  subtotal: number
  commission_rate?: number
  commission_amount?: number
}

export interface VendorPayout {
  payout_id: string
  order_id: string
  order_number: string
  booking_id: string
  customer_name: string
  items_summary: string
  rental_dates: string
  gross: number
  gross_amount: number
  commission_rate: number
  commission_amount: number
  net: number
  net_amount: number
  status: PayoutStatus
  paid_at: string | null
  created_at: string
  items: PayoutLineItem[]
  timeline: {
    status: PayoutStatus
    timestamp: string
    note: string
  }[]
}

export interface VendorPayoutTiles {
  total_earned_net: number
  pending: number
  processing: number
  paid_out: number
  commission_rate: number
}

export interface VendorPayoutsResult {
  payouts: VendorPayout[]
  items: VendorPayout[]
  total_count: number
  total: number
  page: number
  pageSize: number
  tiles: VendorPayoutTiles
  commission_rate: number
}

export interface VendorReview {
  review_id: string
  equipment_id: string
  equipment_name: string
  equipment_category?: string
  equipment_image?: string
  user_name: string
  customer_name: string
  user_avatar?: string
  rating: number
  comment: string
  review_date: string
  created_at: string
  verified_rental: boolean
  vendor_reply?: string | null
  replied_at?: string | null
}

export interface VendorReviewsResult {
  reviews: VendorReview[]
  items: VendorReview[]
  total: number
  total_count: number
  page: number
  pageSize: number
  summary: {
    avg: number
    average_rating: number
    count: number
    total_reviews: number
    distribution: Record<1 | 2 | 3 | 4 | 5, number>
    replied_count: number
    needs_reply_count: number
  }
}

export interface VendorProfile {
  vendor_id: string
  business_name: string
  description: string
  address: string
  city: string
  phone: string
  gst?: string
  gst_number: string
  logo?: string
  logo_url: string
  approval_status: VendorApprovalStatus
  member_since: string
  commission_rate: number
  owner_name: string
  owner_email: string
  email: string
  rating?: number
  review_count?: number
  rejection_reason?: string
  suspension_reason?: string
  approved_by?: string
  approved_at?: string
}

export interface AvailabilityBlock {
  id: string
  block_id?: string
  equipment_id: string
  start_date: string
  end_date: string
  reason: AvailabilityReason
  units?: number
  quantity: number
  note?: string
  order_number?: string
  order_id?: string
  created_at: string
}

export interface InventoryItem {
  id: string
  equipment_id: string
  vendor_id: string
  vendor_name: string
  name: string
  description: string
  category_id: string
  category_name: string
  category: string
  parent_category_id: string | null
  parent_category_name: string | null
  price_per_day: number
  price: number
  security_deposit: number
  deposit: number
  quantity: number
  stock: number
  min_rental_days: number
  delivery_available: boolean
  avg_rating: number
  rating: number
  review_count: number
  reviews: number
  status: EquipmentStatus
  primary_image_url: string
  image: string
  images: EquipmentImage[]
  includes: string[]
  included?: string[]
  specifications: Record<string, string | number>
  blocked_ranges: AvailabilityBlock[]
  commission_rate?: number | null
  updated_at: string
  updated: string
  created_at: string
}
