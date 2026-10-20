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
  BookingDetail,
  BookingItemDetail,
  VendorOrder,
  AppNotification,
} from '@/types/account'
import { rentalDays, lineTotal, quote } from '@/lib/pricing'
import { MOCK_COUPONS } from '@/lib/config/pricing-placeholders'
import { computeMockAvailability } from './index'
import { MOCK_EQUIPMENT } from './mock-data'
import { loadAccountState, saveAccountState } from './account-store'

export const CART_STORAGE_KEY = 'r4f-cart-items-v1'

/**
 * Demo items: 3 items from 2 vendors on Nov 12-14, 1 item on Nov 20-22 (pickup only)
 */
export function getDemoCartLines(): CartLine[] {
  return [
    {
      cart_item_id: 'demo_line_1_2026-11-12_2026-11-14',
      equipment_id: '1',
      name: 'Pro Line-Array Speaker Pair',
      category: 'Speakers',
      category_id: '1',
      vendor_id: '1',
      vendor_name: 'Sargam Sound Systems',
      price_per_day: 2500,
      security_deposit: 10000,
      quantity: 2,
      start_date: '2026-11-12',
      end_date: '2026-11-14',
      days: 3,
      primary_image_url: '/images/equipment/line-array-speaker.svg',
      delivery_available: true,
      min_rental_days: 1,
      max_available_quantity: 6,
    },
    {
      cart_item_id: 'demo_line_7_2026-11-12_2026-11-14',
      equipment_id: '7',
      name: 'Moving Head Light (Pair)',
      category: 'Stage lights',
      category_id: '4',
      vendor_id: '2',
      vendor_name: 'Lumina Lighting Co.',
      price_per_day: 2800,
      security_deposit: 7000,
      quantity: 1,
      start_date: '2026-11-12',
      end_date: '2026-11-14',
      days: 3,
      primary_image_url: '/images/equipment/stage-lights.svg',
      delivery_available: true,
      min_rental_days: 1,
      max_available_quantity: 6,
    },
    {
      cart_item_id: 'demo_line_9_2026-11-12_2026-11-14',
      equipment_id: '9',
      name: 'Warm White Fairy Light Curtain',
      category: 'Fairy lights',
      category_id: '5',
      vendor_id: '2',
      vendor_name: 'Lumina Lighting Co.',
      price_per_day: 600,
      security_deposit: 2000,
      quantity: 2,
      start_date: '2026-11-12',
      end_date: '2026-11-14',
      days: 3,
      primary_image_url: '/images/equipment/fairy-lights.svg',
      delivery_available: true,
      min_rental_days: 1,
      max_available_quantity: 6,
    },
    {
      cart_item_id: 'demo_line_10_2026-11-20_2026-11-22',
      equipment_id: '10',
      name: 'Banquet Chair (Set of 50)',
      category: 'Chairs',
      category_id: '6',
      vendor_id: '3',
      vendor_name: 'RoyalSeat Furniture',
      price_per_day: 1500,
      security_deposit: 5000,
      quantity: 1,
      start_date: '2026-11-20',
      end_date: '2026-11-22',
      days: 3,
      primary_image_url: '/images/equipment/banquet-chairs.svg',
      delivery_available: false, // Pickup only to test fulfilment disabled state
      min_rental_days: 1,
      max_available_quantity: 6,
    },
  ]
}

/**
 * Normalizes a stored line into full CartLine
 */
function normalizeCartLine(raw: Partial<CartLine>): CartLine {
  const start_date = raw.start_date || '2026-11-12'
  const end_date = raw.end_date || '2026-11-14'
  const days = raw.days || rentalDays(start_date, end_date)
  const equipment_id = String(raw.equipment_id || '1')

  const mock = MOCK_EQUIPMENT.find((e) => String(e.equipment_id) === equipment_id)

  return {
    cart_item_id: raw.cart_item_id || `${equipment_id}_${start_date}_${end_date}`,
    equipment_id,
    name: raw.name || mock?.name || 'Equipment Item',
    category: raw.category || mock?.category_name || 'Equipment',
    category_id: raw.category_id || mock?.category_id || '1',
    vendor_id: raw.vendor_id || mock?.vendor_id || '1',
    vendor_name: raw.vendor_name || mock?.vendor_name || 'Vendor Partner',
    price_per_day: raw.price_per_day ?? mock?.price_per_day ?? 1000,
    security_deposit: raw.security_deposit ?? mock?.security_deposit ?? 2000,
    quantity: Math.max(1, raw.quantity || 1),
    start_date,
    end_date,
    days,
    primary_image_url: raw.primary_image_url || mock?.primary_image_url || '/images/equipment/line-array-speaker.svg',
    delivery_available: raw.delivery_available ?? mock?.delivery_available ?? true,
    min_rental_days: raw.min_rental_days ?? mock?.min_rental_days ?? 1,
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
      const state = loadAccountState()
      if (!state.wishlistIds.includes(removed.equipment_id)) {
        state.wishlistIds.push(removed.equipment_id)
        saveAccountState(state)
      }
    } catch (err) {
      console.warn('Could not sync to wishlist store', err)
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
  // 1. Concurrency stand-in: re-check availability for all lines
  const availMap = checkCartAvailability(input.lines)
  const unavailableLines: { equipment_id: string; name: string; reason: string }[] = []

  input.lines.forEach((l) => {
    const r = availMap[l.cart_item_id]
    if (r && r.is_blocked) {
      unavailableLines.push({
        equipment_id: l.equipment_id,
        name: l.name,
        reason: r.message || 'Item is not available in requested quantity for selected dates.',
      })
    }
  })

  if (unavailableLines.length > 0) {
    return {
      success: false,
      booking_id: '',
      total: 0,
      status: 'cancelled',
      payment_status: 'unpaid',
      error_message: 'Some items became unavailable while completing your order.',
      unavailable_lines: unavailableLines,
    }
  }

  // 2. Compute final server-side quote
  const finalQuote = getQuote(input.lines, input.coupon, input.fulfilmentByVendor)
  const isSuccess = input.simulateSuccess !== false

  // 3. Load account store
  const state = loadAccountState()

  // Compute next BK number
  let maxNum = 1050
  state.bookings.forEach((b) => {
    const m = b.booking_id.match(/BK-(\d+)/)
    if (m && m[1]) {
      const n = parseInt(m[1], 10)
      if (n > maxNum) maxNum = n
    }
  })
  const nextNum = maxNum + 1
  const bookingId = `BK-${nextNum}`

  const nowIso = new Date().toISOString()

  // Group items by vendor
  const vendorMap = new Map<string, CartLine[]>()
  input.lines.forEach((l) => {
    const arr = vendorMap.get(l.vendor_id) || []
    arr.push(l)
    vendorMap.set(l.vendor_id, arr)
  })

  const vendorOrderList: VendorOrder[] = []
  const bookingItemList: BookingItemDetail[] = []
  let globalItemIdx = 1

  let vIdx = 1
  vendorMap.forEach((vLines, vId) => {
    const vOrderNum = `VO-${nextNum}-${vIdx}`
    const vName = vLines[0].vendor_name
    const initials = vName
      .split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()

    const vItemIds: string[] = []
    let vSubtotal = 0

    vLines.forEach((l) => {
      const bItemId = `BI-${nextNum}-${globalItemIdx}`
      vItemIds.push(bItemId)
      const lineT = lineTotal(l)
      vSubtotal += lineT

      bookingItemList.push({
        item_id: bItemId,
        equipment_id: l.equipment_id,
        name: l.name,
        image_url: l.primary_image_url,
        unit_price: l.price_per_day,
        quantity: l.quantity,
        days: l.days,
        total_price: lineT,
        status: 'pending',
        vendor_id: vId,
        vendor_name: vName,
        review: null,
        damage_report: null,
      })

      globalItemIdx++
    })

    const fulType = input.fulfilmentByVendor[vId] || 'delivery'

    vendorOrderList.push({
      vendor_order_id: vOrderNum,
      vendor_id: vId,
      vendor_name: vName,
      vendor_initials: initials,
      status: 'pending',
      subtotal: vSubtotal,
      item_ids: vItemIds,
      fulfilment_type: fulType,
      delivery: null, // Null indicates awaiting arrangement by vendor
      return: null,
    })

    vIdx++
  })

  const paymentStatus = isSuccess
    ? input.paymentMethod === 'cod'
      ? 'unpaid'
      : 'paid'
    : 'unpaid'

  const actionNeeded: string[] = []
  if (!isSuccess) {
    actionNeeded.push('Payment due')
  } else if (input.paymentMethod === 'cod') {
    actionNeeded.push('Payment on delivery')
  }

  const newBooking: BookingDetail = {
    booking_id: bookingId,
    event_name: input.eventDetails.event_name || `${input.eventDetails.event_type} Celebration`,
    event_type: input.eventDetails.event_type,
    status: 'pending',
    payment_status: paymentStatus,
    start_date: input.period.start_date,
    end_date: input.period.end_date,
    rental_days: input.period.days,
    delivery_city: input.address.city,
    vendor_count: vendorOrderList.length,
    item_count: input.lines.reduce((s, l) => s + l.quantity, 0),
    vendor_avatars: vendorOrderList.map((v) => ({
      id: v.vendor_id,
      name: v.vendor_name,
      initials: v.vendor_initials,
    })),
    total_amount: finalQuote.total,
    action_needed: actionNeeded,
    created_at: nowIso,
    delivery_address: { ...input.address },
    price_summary: {
      subtotal: finalQuote.subtotal,
      discount: finalQuote.discount,
      coupon_code: finalQuote.applied_coupon?.code,
      tax: finalQuote.tax,
      delivery_fee: finalQuote.delivery_fee,
      security_deposit: finalQuote.security_deposit,
      total: finalQuote.total,
    },
    deposit: {
      held: finalQuote.security_deposit,
      deducted: 0,
      refunded: 0,
      pending_refund: finalQuote.security_deposit,
    },
    payments: [
      {
        payment_id: `PAY-${nextNum}-1`,
        booking_id: bookingId,
        amount: finalQuote.total,
        type: 'full',
        method: input.paymentMethod,
        status: isSuccess
          ? input.paymentMethod === 'cod'
            ? 'pending'
            : 'success'
          : 'failed',
        reference: isSuccess ? `TXN_${Date.now()}` : `ATTEMPT_${Date.now()}`,
        created_at: nowIso,
      },
    ],
    vendor_orders: vendorOrderList,
    items: bookingItemList,
    activity: [
      {
        id: `ACT-${nextNum}-1`,
        title: isSuccess ? 'Booking Placed' : 'Payment Failed',
        description: isSuccess
          ? 'Waiting for vendors to confirm availability.'
          : 'Payment didn’t go through. Saved as pending booking.',
        timestamp: nowIso,
        type: 'order',
      },
    ],
  }

  // Prepend new booking so it appears first in the Hub
  state.bookings.unshift(newBooking)

  // Append notification
  const notif: AppNotification = {
    id: `NOTIF-${Date.now()}`,
    type: isSuccess ? 'booking_confirmed' : 'payment_received',
    title: isSuccess ? `Booking ${bookingId} placed` : `Payment failed for ${bookingId}`,
    message: isSuccess
      ? `Your rental booking for ₹${finalQuote.total.toLocaleString('en-IN')} has been placed successfully.`
      : `Payment didn’t go through. Your booking is saved and waiting for payment.`,
    target: {
      tab: 'bookings',
      booking_id: bookingId,
    },
    read: false,
    created_at: nowIso,
  }
  state.notifications.unshift(notif)

  // If coupon used and success, increment its used count
  if (isSuccess && input.coupon) {
    const target = MOCK_COUPONS[input.coupon.code]
    if (target) {
      target.used_count++
    }
  }

  // Save updated store
  saveAccountState(state)

  // Remove lines of this period from the cart, keeping all lines of other periods!
  const currentCart = getCart()
  const remainingCart = currentCart.filter(
    (l) => !(l.start_date === input.period.start_date && l.end_date === input.period.end_date),
  )
  saveCart(remainingCart)

  return {
    success: isSuccess,
    booking_id: bookingId,
    total: finalQuote.total,
    status: 'pending',
    payment_status: paymentStatus,
  }
}
