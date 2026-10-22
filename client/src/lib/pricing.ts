import type {
  CartLine,
  CartPeriod,
  CartVendorGroup,
  Coupon,
  Quote,
  CheckoutFulfilmentType,
} from '@/types/checkout'
import {
  MOCK_TAX_RATE,
  MOCK_DELIVERY_FEE_PER_VENDOR,
  MOCK_PICKUP_FEE,
  DEFAULT_PLATFORM_COMMISSION_RATE,
} from './config/pricing-placeholders'
import { formatINR } from './format'

export const formatRupees = formatINR

export type CommissionSource = 'Equipment' | 'Category' | 'Vendor' | 'Platform'

export interface ResolvedCommission {
  rate: number
  source: CommissionSource
}

function clampAndRoundRate(rate: number): number {
  const clamped = Math.max(0, Math.min(100, rate))
  return Math.round(clamped * 100) / 100
}

/**
 * Precedence: equipment override -> category default -> vendor default -> platform default.
 * Rates are 0 to 100 with at most 2 decimals.
 */
export function resolveCommission(
  equipment?: { commission_rate?: number | null } | null,
  category?: { default_commission_rate?: number | null } | null,
  vendor?: { commission_rate?: number | null } | null
): ResolvedCommission {
  if (
    equipment?.commission_rate !== undefined &&
    equipment?.commission_rate !== null &&
    !isNaN(Number(equipment.commission_rate))
  ) {
    return {
      rate: clampAndRoundRate(Number(equipment.commission_rate)),
      source: 'Equipment',
    }
  }

  if (
    category?.default_commission_rate !== undefined &&
    category?.default_commission_rate !== null &&
    !isNaN(Number(category.default_commission_rate))
  ) {
    return {
      rate: clampAndRoundRate(Number(category.default_commission_rate)),
      source: 'Category',
    }
  }

  if (
    vendor?.commission_rate !== undefined &&
    vendor?.commission_rate !== null &&
    !isNaN(Number(vendor.commission_rate))
  ) {
    return {
      rate: clampAndRoundRate(Number(vendor.commission_rate)),
      source: 'Vendor',
    }
  }

  return {
    rate: clampAndRoundRate(DEFAULT_PLATFORM_COMMISSION_RATE),
    source: 'Platform',
  }
}

/**
 * Calculates item commission amount and net amount with paise-safe integer arithmetic.
 */
export function calculateItemCommission(
  itemTotal: number,
  rate: number
): {
  rate: number
  commission_amount: number
  commissionAmount: number
  net_amount: number
  netAmount: number
} {
  const totalPaise = Math.round(itemTotal * 100)
  const commissionPaise = Math.round(totalPaise * (rate / 100))
  const netPaise = totalPaise - commissionPaise
  const commissionVal = commissionPaise / 100
  const netVal = netPaise / 100
  return {
    rate,
    commission_amount: commissionVal,
    commissionAmount: commissionVal,
    net_amount: netVal,
    netAmount: netVal,
  }
}

/**
 * Derives payout from item snapshots:
 * gross = sum of item totals,
 * commission = sum of item commissions,
 * net = gross minus commission.
 */
export function calculateOrderPayoutFromItems(
  items: Array<{ total_price: number; commission_rate?: number; commission_amount?: number }>
): { gross: number; commission: number; net: number; effective_rate: number } {
  let grossPaise = 0
  let commissionPaise = 0

  for (const item of items) {
    const itemTotalPaise = Math.round(item.total_price * 100)
    grossPaise += itemTotalPaise

    if (item.commission_amount !== undefined && item.commission_amount !== null) {
      commissionPaise += Math.round(item.commission_amount * 100)
    } else {
      const rate = item.commission_rate ?? DEFAULT_PLATFORM_COMMISSION_RATE
      commissionPaise += Math.round(itemTotalPaise * (rate / 100))
    }
  }

  const netPaise = grossPaise - commissionPaise
  const effectiveRate = grossPaise > 0 ? Number(((commissionPaise / grossPaise) * 100).toFixed(2)) : 0

  return {
    gross: grossPaise / 100,
    commission: commissionPaise / 100,
    net: netPaise / 100,
    effective_rate: effectiveRate,
  }
}

export function calculatePayoutAmounts(
  gross: number,
  commissionRate: number
): { gross: number; commission: number; net: number } {
  const grossPaise = Math.round(gross * 100)
  const commissionPaise = Math.round(grossPaise * (commissionRate / 100))
  const netPaise = grossPaise - commissionPaise

  return {
    gross: grossPaise / 100,
    commission: commissionPaise / 100,
    net: netPaise / 100,
  }
}

/**
 * Calculates inclusive rental days from start and end ISO dates (YYYY-MM-DD).
 * e.g. '2026-11-12' to '2026-11-14' = 3 days.
 */
export function rentalDays(start: string, end: string): number {
  if (!start || !end) return 1
  try {
    const s = new Date(start)
    const e = new Date(end)
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return 1
    const diffTime = e.getTime() - s.getTime()
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))
    return Math.max(1, diffDays + 1)
  } catch {
    return 1
  }
}

/**
 * Calculates the total cost for a single line item using integer paise arithmetic.
 * Accepts either a CartLine object or (pricePerDay, qty, days).
 */
export function lineTotal(
  priceOrLine: number | { price_per_day: number; quantity: number; days: number },
  qty?: number,
  days?: number,
): number {
  if (typeof priceOrLine === 'object' && priceOrLine !== null) {
    const pricePaise = Math.round(priceOrLine.price_per_day * 100)
    const totalPaise = pricePaise * priceOrLine.quantity * priceOrLine.days
    return Math.round(totalPaise) / 100
  }
  const pricePaise = Math.round(priceOrLine * 100)
  const totalPaise = pricePaise * (qty ?? 1) * (days ?? 1)
  return Math.round(totalPaise) / 100
}

/**
 * Groups cart lines by their unique rental period dates.
 * Database invariant: 1 booking = 1 date range.
 */
export function groupByPeriod(lines: CartLine[]): CartPeriod[] {
  if (!lines || lines.length === 0) return []

  const periodMap = new Map<string, CartLine[]>()

  for (const line of lines) {
    const key = `${line.start_date}_${line.end_date}`
    const existing = periodMap.get(key)
    if (existing) {
      existing.push(line)
    } else {
      periodMap.set(key, [line])
    }
  }

  const periods: CartPeriod[] = []

  for (const [key, periodLines] of periodMap.entries()) {
    const startDate = periodLines[0].start_date
    const endDate = periodLines[0].end_date
    const days = rentalDays(startDate, endDate)

    // Group lines within period by vendor
    const vendorMap = new Map<string, CartLine[]>()
    for (const line of periodLines) {
      const vExisting = vendorMap.get(line.vendor_id)
      if (vExisting) {
        vExisting.push(line)
      } else {
        vendorMap.set(line.vendor_id, [line])
      }
    }

    const vendorGroups: CartVendorGroup[] = []
    for (const [vendorId, vLines] of vendorMap.entries()) {
      let vSubtotalPaise = 0
      let vDepositPaise = 0
      let vDeliveryAvailable = true

      for (const vl of vLines) {
        const lPaise = Math.round(lineTotal(vl.price_per_day, vl.quantity, vl.days) * 100)
        vSubtotalPaise += lPaise
        vDepositPaise += Math.round(vl.security_deposit * vl.quantity * 100)
        if (!vl.delivery_available) {
          vDeliveryAvailable = false
        }
      }

      vendorGroups.push({
        vendor_id: vendorId,
        vendor_name: vLines[0].vendor_name,
        lines: vLines,
        subtotal: vSubtotalPaise / 100,
        deposit_total: vDepositPaise / 100,
        delivery_available: vDeliveryAvailable,
      })
    }

    periods.push({
      period_key: key,
      start_date: startDate,
      end_date: endDate,
      days,
      lines: periodLines,
      vendor_groups: vendorGroups,
    })
  }

  // Sort periods chronologically
  return periods.sort((a, b) => a.start_date.localeCompare(b.start_date))
}

/**
 * Calculates total subtotal for a set of cart lines using integer paise.
 */
export function subtotal(lines: CartLine[]): number {
  if (!lines || lines.length === 0) return 0
  const subtotalPaise = lines.reduce((acc, line) => {
    return acc + Math.round(lineTotal(line.price_per_day, line.quantity, line.days) * 100)
  }, 0)
  return subtotalPaise / 100
}

/**
 * Calculates refundable security deposit total for a set of cart lines.
 */
export function depositTotal(lines: CartLine[]): number {
  if (!lines || lines.length === 0) return 0
  const depositPaise = lines.reduce((acc, line) => {
    return acc + Math.round(line.security_deposit * line.quantity * 100)
  }, 0)
  return depositPaise / 100
}

/**
 * Validates a coupon against a subtotal and calculates discount.
 * Returns discount in rupees and any user-friendly validation error.
 */
export function couponDiscount(
  coupon: Coupon | null | undefined,
  orderSubtotal: number,
  now: Date = new Date(),
): { discount: number; error?: string } {
  if (!coupon) {
    return { discount: 0 }
  }

  if (!coupon.is_active) {
    return { discount: 0, error: "This code isn't valid." }
  }

  if (coupon.expires_at) {
    const expiry = new Date(coupon.expires_at)
    if (now > expiry) {
      return { discount: 0, error: 'This code has expired.' }
    }
  }

  if (coupon.usage_limit !== undefined && coupon.used_count >= coupon.usage_limit) {
    return { discount: 0, error: 'This code has reached its usage limit.' }
  }

  if (orderSubtotal < coupon.min_order_amount) {
    const diff = Math.ceil(coupon.min_order_amount - orderSubtotal)
    return {
      discount: 0,
      error: `Add ₹${diff.toLocaleString('en-IN')} more to use this code.`,
    }
  }

  let discountPaise = 0
  const subtotalPaise = Math.round(orderSubtotal * 100)

  if (coupon.type === 'percent') {
    discountPaise = Math.round((subtotalPaise * coupon.value) / 100)
  } else {
    discountPaise = Math.min(Math.round(coupon.value * 100), subtotalPaise)
  }

  return { discount: discountPaise / 100 }
}

/**
 * Calculates delivery fee based on fulfilment selection per vendor.
 */
export function deliveryFee(
  fulfilmentByVendor: Record<string, CheckoutFulfilmentType> = {},
  vendorIds: string[] = [],
): { total: number; byVendor: Record<string, number> } {
  let totalPaise = 0
  const byVendor: Record<string, number> = {}

  for (const vId of vendorIds) {
    const type = fulfilmentByVendor[vId] || 'delivery'
    const fee = type === 'delivery' ? MOCK_DELIVERY_FEE_PER_VENDOR : MOCK_PICKUP_FEE
    byVendor[vId] = fee
    totalPaise += Math.round(fee * 100)
  }

  return {
    total: totalPaise / 100,
    byVendor,
  }
}

/**
 * Calculates 18% GST on taxable subtotal (subtotal - discount) using integer paise.
 */
export function tax(taxableSubtotal: number): number {
  if (taxableSubtotal <= 0) return 0
  const taxablePaise = Math.round(taxableSubtotal * 100)
  const taxPaise = Math.round(taxablePaise * MOCK_TAX_RATE)
  return taxPaise / 100
}

/**
 * Produces the complete Quote for an active rental period.
 * Mathematical Invariant:
 * total = subtotal - discount + tax + delivery_fee + security_deposit
 */
export function quote({
  lines,
  coupon,
  fulfilmentByVendor = {},
  now = new Date(),
}: {
  lines: CartLine[]
  coupon?: Coupon | null
  fulfilmentByVendor?: Record<string, CheckoutFulfilmentType>
  now?: Date
}): Quote {
  const subtotalVal = subtotal(lines)
  const depositVal = depositTotal(lines)

  const { discount: discountVal } = couponDiscount(coupon, subtotalVal, now)

  // Taxable subtotal in paise
  const subtotalPaise = Math.round(subtotalVal * 100)
  const discountPaise = Math.round(discountVal * 100)
  const taxablePaise = Math.max(0, subtotalPaise - discountPaise)

  const taxPaise = Math.round(taxablePaise * MOCK_TAX_RATE)
  const taxVal = taxPaise / 100

  // Delivery fee per unique vendor
  const vendorIds = Array.from(new Set(lines.map((l) => l.vendor_id)))
  const { total: deliveryFeeVal, byVendor: vendorDeliveryFees } = deliveryFee(
    fulfilmentByVendor,
    vendorIds,
  )
  const deliveryPaise = Math.round(deliveryFeeVal * 100)
  const depositPaise = Math.round(depositVal * 100)

  // Subtotals per vendor
  const vendorSubtotals: Record<string, number> = {}
  for (const line of lines) {
    const lTotal = lineTotal(line.price_per_day, line.quantity, line.days)
    vendorSubtotals[line.vendor_id] = (vendorSubtotals[line.vendor_id] || 0) + lTotal
  }

  // Exact Total in paise
  const totalPaise = subtotalPaise - discountPaise + taxPaise + deliveryPaise + depositPaise

  return {
    subtotal: subtotalVal,
    discount: discountVal,
    tax: taxVal,
    delivery_fee: deliveryFeeVal,
    security_deposit: depositVal,
    total: totalPaise / 100,
    applied_coupon: coupon || undefined,
    vendor_subtotals: vendorSubtotals,
    vendor_delivery_fees: vendorDeliveryFees,
  }
}
