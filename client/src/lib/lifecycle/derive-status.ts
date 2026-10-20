import type { BookingStatus, VendorOrder } from '@/types/account'

/**
 * Derive parent booking status from constituent vendor orders.
 * [MOCK PLACEHOLDER]: Rule specification is defined by the prototype contract.
 *
 * Rules:
 * 1. All pending -> 'pending'
 * 2. At least one accepted and none dispatched or later -> 'confirmed'
 * 3. Any order is dispatched, delivered, or returned (and not all finished) -> 'in_progress'
 * 4. Every order is finished (completed, rejected, cancelled) with >= 1 completed -> 'completed'
 * 5. Every order is rejected or cancelled -> 'cancelled'
 */
export function deriveBookingStatus(vendorOrders: VendorOrder[]): BookingStatus {
  if (!vendorOrders || vendorOrders.length === 0) {
    return 'pending'
  }

  const statuses = vendorOrders.map((vo) => vo.status)

  // 1. All pending
  if (statuses.every((s) => s === 'pending')) {
    return 'pending'
  }

  // 5. Every order is rejected or cancelled
  if (statuses.every((s) => s === 'rejected' || s === 'cancelled')) {
    return 'cancelled'
  }

  // 4. Every order is finished with >= 1 completed
  const isAllFinished = statuses.every((s) => s === 'completed' || s === 'rejected' || s === 'cancelled')
  if (isAllFinished && statuses.some((s) => s === 'completed')) {
    return 'completed'
  }

  // 3. Any order is dispatched, delivered, or returned
  const hasActiveFulfilment = statuses.some((s) => s === 'dispatched' || s === 'delivered' || s === 'returned')
  if (hasActiveFulfilment) {
    return 'in_progress'
  }

  // 2. Any accepted and none dispatched or later
  const hasAccepted = statuses.some((s) => s === 'accepted')
  if (hasAccepted) {
    return 'confirmed'
  }

  return 'in_progress'
}
