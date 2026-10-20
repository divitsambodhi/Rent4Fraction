import type { BookingStatus, BookingPaymentStatus } from './account'

export type CheckoutStep = 'cart' | 'details' | 'payment' | 'result'

export type CheckoutPaymentMethod = 'upi' | 'card' | 'netbanking' | 'wallet' | 'cod'

export type CheckoutFulfilmentType = 'delivery' | 'pickup'

export type EventType =
  | 'Wedding'
  | 'Birthday'
  | 'Corporate event'
  | 'Concert'
  | 'Festival'
  | 'Other'

export interface CartLine {
  cart_item_id: string
  equipment_id: string
  name: string
  category: string
  category_id?: string
  vendor_id: string
  vendor_name: string
  price_per_day: number
  security_deposit: number
  quantity: number
  start_date: string
  end_date: string
  days: number
  primary_image_url: string
  delivery_available: boolean
  min_rental_days?: number
  max_available_quantity?: number
}

export interface CartVendorGroup {
  vendor_id: string
  vendor_name: string
  lines: CartLine[]
  subtotal: number
  deposit_total: number
  delivery_available: boolean
}

export interface CartPeriod {
  period_key: string // e.g. "2026-11-12_2026-11-14"
  start_date: string
  end_date: string
  days: number
  lines: CartLine[]
  vendor_groups: CartVendorGroup[]
}

export interface Coupon {
  code: string
  type: 'flat' | 'percent'
  value: number
  min_order_amount: number
  usage_limit?: number
  used_count: number
  valid_from?: string
  valid_to?: string
  expires_at?: string
  is_active: boolean
  description?: string
}

export interface Quote {
  subtotal: number
  discount: number
  tax: number
  delivery_fee: number
  security_deposit: number
  total: number
  applied_coupon?: Coupon
  vendor_subtotals: Record<string, number>
  vendor_delivery_fees: Record<string, number>
}

export interface CheckoutDraft {
  period_key: string
  address_id: string | null
  fulfilment_by_vendor: Record<string, CheckoutFulfilmentType>
  event_name?: string
  event_type: EventType
  event_date: string
  venue_address: string
  same_as_delivery: boolean
  notes?: string
  payment_method: CheckoutPaymentMethod
  terms_agreed: boolean
}

export interface PlaceOrderResult {
  success: boolean
  booking_id: string
  total: number
  status: BookingStatus
  payment_status: BookingPaymentStatus
  error_message?: string
  unavailable_lines?: { equipment_id: string; name: string; reason: string }[]
}
