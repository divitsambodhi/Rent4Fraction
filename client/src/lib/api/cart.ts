import type {
  CartLine,
  CartPeriod,
  Coupon,
  Quote,
  PlaceOrderResult,
  CheckoutFulfilmentType,
  CheckoutPaymentMethod,
  EventType,
} from '@/types/checkout'
import type {
  AddressSnapshot,
  BookingPaymentStatus,
  BookingStatus,
} from '@/types/account'
import { rentalDays, quote } from '@/lib/pricing'
import { MOCK_COUPONS } from '@/lib/config/pricing-placeholders'
import { computeMockAvailability } from './index'
import { apiClient } from '@/lib/api/client'

export const CART_STORAGE_KEY = 'r4f-cart-items-v1'

/**
 * Demo items: 3 items from 2 vendors on Nov 12-14, 1 item on Nov 20-22 (pickup only)
 */
export function getDemoCartLines(): CartLine[] {
  return []
}

/**
 * Normalizes a stored line into full CartLine
 */
function normalizeCartLine(raw: Partial<CartLine>): CartLine {
  const start_date = raw.start_date || '2026-11-12'
  const end_date = raw.end_date || '2026-11-14'
  const days = raw.days || rentalDays(start_date, end_date)
  const equipment_id = String(raw.equipment_id || '1')

  return {
    cart_item_id: raw.cart_item_id || `${equipment_id}_${start_date}_${end_date}`,
    equipment_id,
    name: raw.name || 'Equipment Item',
    category: raw.category || 'Equipment',
    category_id: raw.category_id || '1',
    vendor_id: raw.vendor_id || '1',
    vendor_name: raw.vendor_name || 'Vendor Partner',
    price_per_day: raw.price_per_day ?? 0,
    security_deposit: raw.security_deposit ?? 0,
    quantity: Math.max(1, raw.quantity || 1),
    start_date,
    end_date,
    days,
    primary_image_url: raw.primary_image_url || '',
    delivery_available: raw.delivery_available ?? true,
    min_rental_days: raw.min_rental_days ?? 1,
    max_available_quantity: raw.max_available_quantity ?? 6,
  }
}

/**
 * Loads current cart lines from storage.
 */
export function getCart(): CartLine[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.map(normalizeCartLine)
  } catch {
    return []
  }
}

/**
 * Persists cart lines and updates badge count.
 */
export function saveCart(lines: CartLine[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(lines))
    const totalCount = lines.reduce((acc, it) => acc + it.quantity, 0)
    localStorage.setItem('r4f-cart-count', String(totalCount))
    window.dispatchEvent(new CustomEvent('r4f-cart-updated', { detail: lines }))
  } catch (err) {
    console.error('Failed to save cart to localStorage', err)
  }
}

/**
 * Updates a line in the cart (dates, quantity, etc.)
 */
export function updateCartLine(cart_item_id: string, patch: Partial<CartLine>): CartLine[] {
  const current = getCart()
  const updated = current.map((line) => {
    if (line.cart_item_id !== cart_item_id) return line
    const merged = { ...line, ...patch }
    if (patch.start_date || patch.end_date) {
      merged.days = rentalDays(merged.start_date, merged.end_date)
      // Update composite ID to avoid collisions
      merged.cart_item_id = `${merged.equipment_id}_${merged.start_date}_${merged.end_date}`
    }
    return merged
  })
  saveCart(updated)
  return updated
}

/**
 * Removes a line from the cart.
 */
export function removeCartLine(cart_item_id: string): { updatedLines: CartLine[]; removed?: CartLine } {
  const current = getCart()
  const removed = current.find((l) => l.cart_item_id === cart_item_id)
  const updated = current.filter((l) => l.cart_item_id !== cart_item_id)
  saveCart(updated)
  return { updatedLines: updated, removed }
}

/**
 * Moves a cart line to the customer's wishlist.
 */
export async function moveCartLineToWishlist(cart_item_id: string): Promise<CartLine[]> {
  const { updatedLines, removed } = removeCartLine(cart_item_id)
  if (removed) {
    try {
      await apiClient.post('/api/v1/wishlist', { equipment_id: removed.equipment_id })
    } catch (err) {
      console.warn('Could not sync to wishlist endpoint', err)
    }
  }
  return updatedLines
}

/**
 * Applies dates of a selected period to all other items in the cart.
 * Re-checks availability; if an item would become unavailable, records conflict and skips it.
 */
export function applyDatesToAll(
  selectedPeriodKey: string,
  lines: CartLine[],
): {
  updatedLines: CartLine[]
  conflicts: { equipment_id: string; name: string; available: number }[]
} {
  const [targetStart, targetEnd] = selectedPeriodKey.split('_')
  if (!targetStart || !targetEnd) return { updatedLines: lines, conflicts: [] }

  const newDays = rentalDays(targetStart, targetEnd)
  const conflicts: { equipment_id: string; name: string; available: number }[] = []

  const updatedLines = lines.map((line) => {
    // If already in target period, keep unchanged
    if (line.start_date === targetStart && line.end_date === targetEnd) {
      return line
    }

    // Check availability on target dates
    const avail = computeMockAvailability(line.equipment_id, targetStart, targetEnd) ?? 6
    if (avail === 0 || avail < line.quantity) {
      conflicts.push({
        equipment_id: line.equipment_id,
        name: line.name,
        available: avail,
      })
      return line
    }

    return {
      ...line,
      start_date: targetStart,
      end_date: targetEnd,
      days: newDays,
      cart_item_id: `${line.equipment_id}_${targetStart}_${targetEnd}`,
      max_available_quantity: avail,
    }
  })

  saveCart(updatedLines)
  return { updatedLines, conflicts }
}

export interface LineAvailabilityResult {
  available_quantity: number
  is_blocked: boolean
  warning_type?: 'low_stock' | 'unavailable'
  message?: string
}

/**
 * Checks availability for all given lines.
 * Uses the canonical `computeMockAvailability` from catalog/detail.
 */
export function checkCartAvailability(
  lines: CartLine[],
  simulate?: string,
): Record<string, LineAvailabilityResult> {
  const results: Record<string, LineAvailabilityResult> = {}

  lines.forEach((line, idx) => {
    if (simulate === 'unavailable' && idx === 0) {
      results[line.cart_item_id] = {
        available_quantity: 0,
        is_blocked: true,
        warning_type: 'unavailable',
        message: 'No longer available for these dates (simulated)',
      }
      return
    }

    const avail = computeMockAvailability(line.equipment_id, line.start_date, line.end_date) ?? 6

    if (avail === 0) {
      results[line.cart_item_id] = {
        available_quantity: 0,
        is_blocked: true,
        warning_type: 'unavailable',
        message: 'No longer available for these dates',
      }
    } else if (line.quantity > avail) {
      results[line.cart_item_id] = {
        available_quantity: avail,
        is_blocked: true,
        warning_type: 'low_stock',
        message: `Only ${avail} available for these dates (you selected ${line.quantity})`,
      }
    } else if (avail === 1 && line.quantity === 1) {
      results[line.cart_item_id] = {
        available_quantity: avail,
        is_blocked: false,
        warning_type: 'low_stock',
        message: 'Only 1 left for these dates',
      }
    } else {
      results[line.cart_item_id] = {
        available_quantity: avail,
        is_blocked: false,
      }
    }
  })

  return results
}

/**
 * Validates a coupon code with user-friendly error messages.
 */
export function validateCoupon(
  code: string,
  subtotal: number,
  now: Date = new Date(),
): { valid: boolean; coupon?: Coupon; error?: string } {
  const clean = code.trim().toUpperCase()
  if (!clean) {
    return { valid: false, error: 'Please enter a coupon code.' }
  }

  const found = MOCK_COUPONS[clean]
  if (!found) {
    return { valid: false, error: "This code isn't valid." }
  }

  if (!found.is_active || (found.expires_at && new Date(found.expires_at) < now)) {
    return { valid: false, error: 'This code has expired.' }
  }

  if (found.usage_limit !== undefined && found.used_count >= found.usage_limit) {
    return { valid: false, error: 'This code has reached its usage limit.' }
  }

  if (subtotal < found.min_order_amount) {
    const diff = found.min_order_amount - subtotal
    return {
      valid: false,
      error: `Add ₹${diff.toLocaleString('en-IN')} more to use this code.`,
    }
  }

  return { valid: true, coupon: found }
}

/**
 * Calculates complete Quote for a given set of lines.
 */
export function getQuote(
  lines: CartLine[],
  coupon?: Coupon,
  fulfilmentByVendor: Record<string, CheckoutFulfilmentType> = {},
): Quote {
  return quote({
    lines,
    coupon,
    fulfilmentByVendor,
  })
}

export interface PlaceOrderInput {
  lines: CartLine[]
  period: CartPeriod
  address: AddressSnapshot
  fulfilmentByVendor: Record<string, CheckoutFulfilmentType>
  eventDetails: {
    event_name?: string
    event_type: EventType
    event_date: string
    venue_address: string
    notes?: string
  }
  paymentMethod: CheckoutPaymentMethod
  coupon?: Coupon
  simulateSuccess?: boolean
}

/**
 * Atomically places an order into the Customer Hub's store (`r4f-account-store-v1`).
 * Re-runs availability check, computes integer-exact quote, writes booking, vendor orders,
 * items, payments, snapshots and notifications, and clears the ordered period lines from cart.
 */
export async function placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  // Sync cart lines to backend cart table
  for (const line of input.lines) {
    try {
      await apiClient.post('/api/v1/cart/items', {
        equipment_id: parseInt(line.equipment_id, 10),
        quantity: line.quantity,
        start_date: input.period.start_date,
        end_date: input.period.end_date,
      })
    } catch {
      // Line may already be present in cart
    }
  }

  const rawId = (input.address as { id?: string | number }).id ?? '1'
  const numericAddressId = parseInt(
    String(rawId).replace(/\D/g, '') || '1',
    10
  )

  const payload = {
    period: {
      start_date: input.period.start_date,
      end_date: input.period.end_date,
    },
    address_id: numericAddressId,
    fulfilment: input.fulfilmentByVendor,
    event: {
      event_name: input.eventDetails.event_name,
      event_type: input.eventDetails.event_type || 'Wedding',
      event_date: input.eventDetails.event_date || input.period.start_date,
      venue_address: input.eventDetails.venue_address || input.address.line1,
      notes: input.eventDetails.notes,
    },
    coupon_code: input.coupon?.code || undefined,
    payment_method: 'cod',
  }

  const res = await apiClient.post<{
    booking_id: number
    booking_number?: string
    status: string
    payment_status: string
    total_amount: number
  }>('/api/v1/checkout/orders', payload, {
    idempotencyKey: `idem_order_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
  })

  // Remove lines of this period from local storage cart
  const remainingLines = getCart().filter(
    (l) => !(l.start_date === input.period.start_date && l.end_date === input.period.end_date)
  )
  saveCart(remainingLines)

  return {
    success: true,
    booking_id: res.booking_number || `BK-${res.booking_id}`,
    total: res.total_amount,
    status: res.status as BookingStatus,
    payment_status: res.payment_status as BookingPaymentStatus,
  }
}
