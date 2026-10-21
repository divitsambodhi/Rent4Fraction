import type {
  ActivityTimelineEvent,
  BookingDetail,
  DamageReport,
  ItemCondition,
  PaymentRecord,
} from '@/types/account'
import { allowedActions } from './allowed-actions'
import { deriveBookingStatus } from './derive-status'
import {
  calculateDepositSettlement,
  calculatePayout,
  evaluateDisputeResolution,
} from './settlement'
import type {
  DisputeResolutionPayload,
  InspectionPayload,
  LifecycleAction,
  LifecycleActionResult,
  LifecycleRole,
  MarkDeliveredPayload,
  ScheduleDeliveryPayload,
  ScheduleReturnPayload,
} from './types'

export interface LifecycleContext {
  vendorCommissionRate?: number
  equipmentDeposits?: Record<string, number>
  checkAvailability?: (equipmentId: string, startDate: string, endDate: string, qty: number) => boolean
}

export function applyAction(
  initialBooking: BookingDetail,
  vendorOrderId: string,
  action: LifecycleAction,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: any = {},
  role: LifecycleRole = 'vendor',
  context: LifecycleContext = {}
): LifecycleActionResult {
  // Deep clone booking to ensure immutability
  const booking: BookingDetail = JSON.parse(JSON.stringify(initialBooking))
  const orderIndex = booking.vendor_orders.findIndex((vo) => vo.vendor_order_id === vendorOrderId)

  if (orderIndex === -1) {
    return {
      booking: initialBooking,
      vendorOrder: initialBooking.vendor_orders[0],
      error: `Vendor order ${vendorOrderId} not found in booking ${booking.booking_id}`,
    }
  }

  const order = booking.vendor_orders[orderIndex]
  const validActions = allowedActions(order, role, booking.items)

  if (!validActions.includes(action) && role !== 'admin') {
    return {
      booking: initialBooking,
      vendorOrder: order,
      error: `Action "${action}" is not permitted for order ${vendorOrderId} in state "${order.status}" by role "${role}"`,
    }
  }

  const now = new Date().toISOString()
  const orderItems = booking.items.filter((it) => order.item_ids.includes(it.item_id))

  let createdPayout: LifecycleActionResult['createdPayout']
  let createdDepositRefund: PaymentRecord | undefined
  const createdDamageReports: DamageReport[] = []

  switch (action) {
    case 'accept': {
      // Re-verify availability
      if (context.checkAvailability) {
        for (const it of orderItems) {
          const isFree = context.checkAvailability(
            it.equipment_id,
            booking.start_date,
            booking.end_date,
            it.quantity
          )
          if (!isFree) {
            return {
              booking: initialBooking,
              vendorOrder: order,
              error: `Equipment "${it.name}" is no longer available for the requested rental dates.`,
            }
          }
        }
      }

      order.status = 'accepted'
      orderItems.forEach((it) => {
        it.status = 'confirmed'
      })

      const event: ActivityTimelineEvent = {
        id: `act-${Date.now()}-accept`,
        title: 'Vendor accepted order',
        description: `Order ${order.vendor_order_id} confirmed by ${order.vendor_name}.`,
        timestamp: now,
        type: 'order',
      }
      booking.activity.unshift(event)
      break
    }

    case 'decline': {
      const reason = String(payload.reason || '').trim()
      if (reason.length < 10) {
        return {
          booking: initialBooking,
          vendorOrder: order,
          error: 'Decline reason must be at least 10 characters long.',
        }
      }

      order.status = 'rejected'
      order.rejection_reason = reason
      orderItems.forEach((it) => {
        it.status = 'cancelled'
      })

      const event: ActivityTimelineEvent = {
        id: `act-${Date.now()}-decline`,
        title: 'Vendor declined order',
        description: `Reason: ${reason}`,
        timestamp: now,
        type: 'order',
      }
      booking.activity.unshift(event)
      break
    }

    case 'cancel': {
      order.status = 'cancelled'
      orderItems.forEach((it) => {
        it.status = 'cancelled'
      })

      const event: ActivityTimelineEvent = {
        id: `act-${Date.now()}-cancel`,
        title: 'Order cancelled',
        description: `Order ${order.vendor_order_id} was cancelled by ${role}.`,
        timestamp: now,
        type: 'order',
      }
      booking.activity.unshift(event)
      break
    }

    case 'schedule_delivery':
    case 'schedule_pickup': {
      const p = payload as ScheduleDeliveryPayload
      const windowStr = `${p.date} · ${p.startTime} - ${p.endTime}`

      order.delivery = {
        type: action === 'schedule_pickup' ? 'pickup' : 'delivery',
        status: 'scheduled',
        scheduled_window: windowStr,
        delivered_by: p.deliveredBy || order.vendor_name,
        tracking_info: p.trackingInfo || p.notes || 'Standard fulfilment window',
        updated_at: now,
      }

      const event: ActivityTimelineEvent = {
        id: `act-${Date.now()}-sched-del`,
        title: action === 'schedule_pickup' ? 'Pickup window scheduled' : 'Delivery window scheduled',
        description: windowStr,
        timestamp: now,
        type: 'delivery',
      }
      booking.activity.unshift(event)
      break
    }

    case 'dispatch': {
      order.status = 'dispatched'
      if (order.delivery) {
        order.delivery.status = 'out_for_delivery'
        order.delivery.updated_at = now
      }

      const event: ActivityTimelineEvent = {
        id: `act-${Date.now()}-dispatch`,
        title: 'Out for delivery',
        description: `Items dispatched by ${order.vendor_name}.`,
        timestamp: now,
        type: 'delivery',
      }
      booking.activity.unshift(event)
      break
    }

    case 'mark_delivered': {
      const p = payload as MarkDeliveredPayload
      const isDelivery = order.fulfilment_type !== 'pickup'

      if (isDelivery && !p.proofPhotoUrl) {
        return {
          booking: initialBooking,
          vendorOrder: order,
          error: 'Proof of delivery photo is required to complete delivery handoff.',
        }
      }

      order.status = 'delivered'
      if (order.delivery) {
        order.delivery.status = 'delivered'
        order.delivery.delivered_by = p.deliveredBy || order.delivery.delivered_by
        order.delivery.delivery_proof_url = p.proofPhotoUrl
        order.delivery.updated_at = now
      }

      orderItems.forEach((it) => {
        it.status = 'delivered'
      })

      const event: ActivityTimelineEvent = {
        id: `act-${Date.now()}-delivered`,
        title: isDelivery ? 'Equipment delivered' : 'Equipment handed over to customer',
        description: `Confirmed by ${p.deliveredBy || order.vendor_name}.`,
        timestamp: now,
        type: 'delivery',
      }
      booking.activity.unshift(event)
      break
    }

    case 'delivery_failed': {
      const reason = String(payload.reason || '').trim()
      if (!reason) {
        return {
          booking: initialBooking,
          vendorOrder: order,
          error: 'A specific failure reason is required when marking delivery failed.',
        }
      }

      if (order.delivery) {
        order.delivery.status = 'failed'
        order.delivery.failure_reason = reason
        order.delivery.updated_at = now
      }
      // Revert order status to accepted to allow rescheduling
      order.status = 'accepted'

      const event: ActivityTimelineEvent = {
        id: `act-${Date.now()}-del-failed`,
        title: 'Delivery attempt failed',
        description: `Reason: ${reason}. Rescheduling required.`,
        timestamp: now,
        type: 'delivery',
      }
      booking.activity.unshift(event)
      break
    }

    case 'schedule_return': {
      const p = payload as ScheduleReturnPayload
      const windowStr = `${p.date} · ${p.startTime} - ${p.endTime}`

      order.return = {
        status: 'scheduled',
        scheduled_window: windowStr,
        condition: 'Good',
        notes: p.notes,
      }

      const event: ActivityTimelineEvent = {
        id: `act-${Date.now()}-sched-ret`,
        title: 'Return window scheduled',
        description: windowStr,
        timestamp: now,
        type: 'return',
      }
      booking.activity.unshift(event)
      break
    }

    case 'mark_returned': {
      order.status = 'returned'
      if (order.return) {
        order.return.status = 'returned'
        order.return.returned_at = now
      } else {
        order.return = {
          status: 'returned',
          returned_at: now,
          condition: 'Good',
        }
      }

      orderItems.forEach((it) => {
        it.status = 'returned'
      })

      const event: ActivityTimelineEvent = {
        id: `act-${Date.now()}-returned`,
        title: 'Equipment returned',
        description: `Vendor received physical equipment back. Inspection pending.`,
        timestamp: now,
        type: 'return',
      }
      booking.activity.unshift(event)
      break
    }

    case 'inspect': {
      const p = payload as InspectionPayload
      const inspectedAt = p.inspectedAt || now

      if (!order.return) {
        order.return = {
          status: 'returned',
          returned_at: inspectedAt,
          condition: 'Good',
        }
      }
      if (order.return) {
        order.return.inspected_at = inspectedAt
      }

      let hasDamage = false

      if (p.items && p.items.length > 0) {
        for (const itemRes of p.items) {
          const item = orderItems.find((it) => it.item_id === itemRes.itemId)
          if (!item) continue

          if (itemRes.condition !== 'Good' && itemRes.condition !== 'good') {
            hasDamage = true
            const cost = Number(itemRes.damageCost) || 0
            const report: DamageReport = {
              report_id: `DR-${Date.now().toString().slice(-4)}`,
              equipment_id: item.equipment_id,
              equipment_name: item.name,
              description: itemRes.damageDescription || `${itemRes.condition} noted upon inspection`,
              repair_cost: cost,
              deducted_from_deposit: itemRes.deductFromDeposit ? cost : 0,
              status: 'reported',
              filed_at: inspectedAt,
            }
            item.damage_report = report
            createdDamageReports.push(report)
          }
        }
      }

      if (order.return) {
        order.return.condition = (hasDamage ? 'Minor damage' : 'Good') as ItemCondition
      }

      const event: ActivityTimelineEvent = {
        id: `act-${Date.now()}-inspected`,
        title: 'Return inspection completed',
        description: hasDamage
          ? `Damage reported on ${createdDamageReports.length} item(s). Under customer review.`
          : 'All items returned in good condition.',
        timestamp: now,
        type: 'inspection',
      }
      booking.activity.unshift(event)

      // If no damage, automatically complete order!
      if (!hasDamage) {
        return applyAction(booking, vendorOrderId, 'complete_order', {}, role, context)
      }
      break
    }

    case 'complete_order': {
      // Order completion creates payout and deposit settlement
      order.status = 'completed'

      const rate = context.vendorCommissionRate ?? 10
      const payoutAmounts = calculatePayout(order.subtotal, rate)
      const payoutId = `PO-${Date.now().toString().slice(-5)}`

      createdPayout = {
        payoutId,
        vendorId: order.vendor_id,
        gross: payoutAmounts.gross,
        commission: payoutAmounts.commission,
        net: payoutAmounts.net,
      }

      const settlement = calculateDepositSettlement(orderItems, context.equipmentDeposits)

      if (settlement.refundAmount > 0) {
        const refundPayment: PaymentRecord = {
          payment_id: `PAY-REF-${Date.now().toString().slice(-5)}`,
          booking_id: booking.booking_id,
          event_name: booking.event_name,
          type: 'deposit_refund',
          method: 'original_method',
          amount: settlement.refundAmount,
          status: 'success',
          created_at: now,
          reference: `REF-DEP-${order.vendor_order_id}`,
        }
        booking.payments.push(refundPayment)
        createdDepositRefund = refundPayment

        booking.deposit.refunded = (booking.deposit.refunded || 0) + settlement.refundAmount
        booking.deposit.pending_refund = Math.max(0, (booking.deposit.pending_refund || 0) - settlement.refundAmount)
      }

      if (settlement.totalDeductions > 0) {
        booking.deposit.deducted = (booking.deposit.deducted || 0) + settlement.totalDeductions
        booking.deposit.pending_refund = Math.max(0, (booking.deposit.pending_refund || 0) - settlement.totalDeductions)
      }

      const event: ActivityTimelineEvent = {
        id: `act-${Date.now()}-completed`,
        title: 'Order completed',
        description: `Payout ${payoutId} created for ${order.vendor_name}. Deposit refund processed.`,
        timestamp: now,
        type: 'order',
      }
      booking.activity.unshift(event)
      break
    }

    case 'resolve_dispute': {
      const p = payload as DisputeResolutionPayload
      const reportId = payload.reportId

      const targetItem = orderItems.find((it) => it.damage_report?.report_id === reportId)
      if (!targetItem || !targetItem.damage_report) {
        return {
          booking: initialBooking,
          vendorOrder: order,
          error: `Damage report ${reportId} not found in order ${vendorOrderId}`,
        }
      }

      const report = targetItem.damage_report
      const depositShare = (context.equipmentDeposits?.[targetItem.equipment_id] ?? 2000) * targetItem.quantity

      const evalRes = evaluateDisputeResolution(report.repair_cost, depositShare, p.outcome, p.finalAmount)
      if (!evalRes.isValid) {
        return {
          booking: initialBooking,
          vendorOrder: order,
          error: evalRes.error,
        }
      }

      report.status = 'resolved'
      report.repair_cost = evalRes.finalAmount
      report.deducted_from_deposit = evalRes.deductedFromDeposit
      report.resolved_at = now

      const event: ActivityTimelineEvent = {
        id: `act-${Date.now()}-dispute-res`,
        title: `Damage dispute resolved by admin (${p.outcome})`,
        description: `Note: ${p.resolutionNote}. Amount: ₹${evalRes.finalAmount}.`,
        timestamp: now,
        type: 'system',
      }
      booking.activity.unshift(event)
      break
    }

    default:
      return {
        booking: initialBooking,
        vendorOrder: order,
        error: `Unhandled lifecycle action "${action}"`,
      }
  }

  // Always re-derive aggregate booking status
  booking.status = deriveBookingStatus(booking.vendor_orders)

  return {
    booking,
    vendorOrder: order,
    createdPayout,
    createdDepositRefund,
    createdDamageReports,
  }
}
