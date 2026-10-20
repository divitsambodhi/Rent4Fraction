import type { BookingItemDetail, VendorOrder } from '@/types/account'
import type { LifecycleAction, LifecycleRole } from './types'

export function allowedActions(
  order: VendorOrder,
  role: LifecycleRole,
  items: BookingItemDetail[] = []
): LifecycleAction[] {
  const isVendorOrAdmin = role === 'vendor' || role === 'admin'
  const isCustomerOrAdmin = role === 'customer' || role === 'admin'

  const actions: LifecycleAction[] = []

  switch (order.status) {
    case 'pending': {
      if (isVendorOrAdmin) {
        actions.push('accept', 'decline')
      }
      if (isCustomerOrAdmin) {
        actions.push('cancel')
      }
      break
    }

    case 'accepted': {
      if (isVendorOrAdmin) {
        const isPickup = order.fulfilment_type === 'pickup'
        const deliveryScheduled = order.delivery && order.delivery.status === 'scheduled'

        if (isPickup) {
          if (!order.delivery || !order.delivery.scheduled_window) {
            actions.push('schedule_pickup')
          } else {
            actions.push('mark_delivered')
          }
        } else {
          if (!deliveryScheduled) {
            actions.push('schedule_delivery')
          } else {
            actions.push('dispatch')
          }
        }
      }
      if (isCustomerOrAdmin) {
        actions.push('cancel')
      }
      break
    }

    case 'dispatched': {
      if (isVendorOrAdmin) {
        actions.push('mark_delivered', 'delivery_failed')
      }
      break
    }

    case 'delivered': {
      if (isVendorOrAdmin) {
        const returnScheduled = order.return && order.return.scheduled_window
        if (!returnScheduled) {
          actions.push('schedule_return')
        } else {
          actions.push('mark_returned')
        }
      }
      break
    }

    case 'returned': {
      if (isVendorOrAdmin) {
        const isInspected = Boolean(order.return?.inspected_at)
        if (!isInspected) {
          actions.push('inspect')
        } else {
          // Check for any open damage reports
          const orderItems = items.filter((it) => order.item_ids.includes(it.item_id))
          const hasOpenDamageReport = orderItems.some(
            (it) => it.damage_report && (it.damage_report.status === 'reported' || it.damage_report.status === 'disputed')
          )
          if (!hasOpenDamageReport) {
            actions.push('complete_order')
          }
        }
      }
      break
    }

    case 'completed':
    case 'rejected':
    case 'cancelled':
    default:
      // Terminal states have no forward actions
      break
  }

  return actions
}
