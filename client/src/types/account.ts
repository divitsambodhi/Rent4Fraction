// Rent4Fraction Customer Hub Domain Types
// Exact alignments with database ENUMs and schemas

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'

export type BookingPaymentStatus =
  | 'unpaid'
  | 'partial'
  | 'paid'
  | 'refunded'

export type VendorOrderStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'dispatched'
  | 'delivered'
  | 'returned'
  | 'completed'
  | 'cancelled'

export type BookingItemStatus =
  | 'pending'
  | 'confirmed'
  | 'delivered'
  | 'returned'
  | 'cancelled'

export type PaymentType =
  | 'advance'
  | 'full'
  | 'deposit'
  | 'refund'
  | 'deposit_refund'

export type PaymentMethod =
  | 'upi'
  | 'card'
  | 'netbanking'
  | 'cod'
  | 'wallet'
  | 'original_method'
  | 'bank_transfer'

export type PaymentStatus =
  | 'pending'
  | 'success'
  | 'failed'
  | 'refunded'

export type DeliveryType = 'delivery' | 'pickup'

export type DeliveryStatus =
  | 'scheduled'
  | 'out_for_delivery'
  | 'delivered'
  | 'failed'

export type ReturnStatus =
  | 'scheduled'
  | 'returned'
  | 'late'
  | 'incomplete'

export type ItemCondition =
  | 'good'
  | 'minor_damage'
  | 'major_damage'
  | 'lost'
  | 'Good'
  | 'Minor damage'
  | 'Major damage'
  | 'Lost'

export type DamageReportStatus =
  | 'reported'
  | 'disputed'
  | 'resolved'

export type NotificationType =
  | 'booking_confirmed'
  | 'order_accepted'
  | 'order_rejected'
  | 'order_dispatched'
  | 'delivered'
  | 'return_scheduled'
  | 'return_inspected'
  | 'damage_report_filed'
  | 'payment_received'
  | 'refund_processed'
  | 'review_reminder'
  | 'message_received'
  | 'dispute_resolved'
  | 'payout_processed'
  | 'payout_paid'
  | 'vendor_approved'
  | 'new_order'

export type AddressLabel = 'Home' | 'Office' | 'Venue' | 'Other'

export interface AddressSnapshot {
  name: string
  line1: string
  line2?: string
  city: string
  state: string
  pincode: string
  country: string
}

export interface Address extends AddressSnapshot {
  id: string
  label: AddressLabel
  is_default: boolean
  used_in_bookings: number
  created_at: string
}

export interface ActivityTimelineEvent {
  id?: string
  title?: string
  description?: string
  timestamp: string
  type?: 'order' | 'delivery' | 'payment' | 'return' | 'inspection' | 'system'
  actor?: 'Customer' | 'You' | 'Admin' | 'System' | string
  event?: string
}

export interface DamageReport {
  report_id: string
  equipment_id: string
  equipment_name: string
  description: string
  repair_cost: number
  claimed_amount?: number
  damage_cost?: number
  deducted_from_deposit: number
  status: DamageReportStatus
  dispute_reason?: string
  filed_at: string
  resolved_at?: string
  resolved_by?: string
  resolution_note?: string
  resolution_notes?: string
  dispute_resolution?: string
}

export interface ItemReview {
  review_id: string
  booking_id: string
  equipment_id: string
  equipment_name: string
  rating: number
  comment: string
  vendor_reply?: string | null
  created_at: string
}

export interface DeliveryTrackerData {
  type: DeliveryType
  status: DeliveryStatus
  scheduled_window: string
  tracking_info?: string
  delivered_by?: string
  delivery_proof_url?: string
  failure_reason?: string
  updated_at: string
}

export interface ReturnInspectionData {
  status: ReturnStatus
  scheduled_window?: string
  returned_at?: string
  inspected_at?: string
  condition: ItemCondition
  notes?: string
}

export interface BookingItemDetail {
  item_id: string
  equipment_id: string
  name: string
  image_url: string
  unit_price: number
  quantity: number
  days: number
  total_price: number
  status: BookingItemStatus
  vendor_id: string
  vendor_name: string
  security_deposit?: number
  category?: string
  review: ItemReview | null
  damage_report: DamageReport | null
  commission_rate: number
  commission_amount: number
}

export interface VendorOrder {
  vendor_order_id: string
  vendor_id: string
  vendor_name: string
  vendor_initials: string
  vendor_phone?: string | null
  status: VendorOrderStatus
  rejection_reason?: string
  subtotal: number
  delivery_fee?: number
  item_ids: string[]
  delivery?: DeliveryTrackerData | null
  return?: ReturnInspectionData | null
  fulfilment_type?: 'delivery' | 'pickup'
}

export interface DepositSummaryData {
  held: number
  deducted: number
  refunded: number
  pending_refund: number
}

export interface PriceSummaryBreakdown {
  subtotal: number
  discount: number
  coupon_code?: string
  tax: number
  delivery_fee: number
  security_deposit: number
  total: number
}

export interface PaymentRecord {
  payment_id: string
  booking_id: string
  event_name?: string
  type: PaymentType
  method: PaymentMethod
  amount: number
  status: PaymentStatus
  created_at: string
  reference: string
  refund_reference?: string
}

export interface BookingSummary {
  booking_id: string
  event_name: string
  event_type: string
  status: BookingStatus
  payment_status: BookingPaymentStatus
  start_date: string
  end_date: string
  rental_days: number
  delivery_city: string
  vendor_count: number
  item_count: number
  vendor_avatars: { id: string; name: string; initials: string }[]
  total_amount: number
  action_needed: string[]
  created_at: string
}

export interface BookingDetail extends BookingSummary {
  delivery_address: AddressSnapshot
  vendor_orders: VendorOrder[]
  items: BookingItemDetail[]
  payments: PaymentRecord[]
  deposit: DepositSummaryData
  price_summary: PriceSummaryBreakdown
  activity: ActivityTimelineEvent[]
}

export interface Message {
  message_id: string
  conversation_id: string
  sender: 'customer' | 'vendor'
  text: string
  created_at: string
  status: 'sending' | 'sent' | 'seen' | 'failed'
}

export interface Conversation {
  conversation_id: string
  vendor_id: string
  vendor_name: string
  vendor_initials: string
  equipment_id: string
  equipment_name: string
  equipment_image: string
  last_message: string
  last_message_time: string
  unread_count: number
}

export interface AppNotificationTarget {
  tab?: 'bookings' | 'inbox' | 'wishlist' | 'addresses' | 'profile' | 'payments' | 'reviews' | string
  booking_id?: string
  thread_id?: string
  address_id?: string
}

export interface AppNotification {
  id: string
  type: NotificationType
  title: string
  message: string
  created_at: string
  read: boolean
  target: AppNotificationTarget
  user_id?: string
  link?: string
}

export interface ReviewToWrite {
  booking_id: string
  equipment_id: string
  equipment_name: string
  equipment_image: string
  vendor_name: string
  returned_date: string
}

export interface MyReview {
  review_id: string
  booking_id: string
  equipment_id: string
  equipment_name: string
  equipment_image: string
  vendor_name: string
  rating: number
  comment: string
  vendor_reply?: string | null
  created_at: string
}

export interface AccountBadges {
  active_bookings_count: number
  unread_inbox_count: number
  wishlist_count: number
}

export interface PaymentSummaryTilesData {
  total_paid: number
  deposits_held: number
  deductions: number
  refunded: number
}

export type AccountTabKey =
  | 'bookings'
  | 'inbox'
  | 'wishlist'
  | 'addresses'
  | 'profile'
  | 'payments'
  | 'reviews'
