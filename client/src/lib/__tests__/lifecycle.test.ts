import { describe, expect, it } from 'vitest'
import {
  allowedActions,
  applyAction,
  calculateDepositSettlement,
  calculatePayout,
  deriveBookingStatus,
  evaluateDisputeResolution,
} from '../lifecycle'
import type { BookingDetail, BookingItemDetail, VendorOrder } from '@/types/account'

function createMockBooking(): BookingDetail {
  return {
    booking_id: 'BK-1001',
    event_name: 'Summer Music Fest',
    event_type: 'Concert',
    status: 'pending',
    payment_status: 'paid',
    start_date: '2026-11-15',
    end_date: '2026-11-17',
    rental_days: 3,
    delivery_city: 'Bengaluru',
    vendor_count: 1,
    item_count: 2,
    vendor_avatars: [{ id: '1', name: 'Sargam Sound Systems', initials: 'SS' }],
    total_amount: 15000,
    action_needed: [],
    created_at: new Date().toISOString(),
    delivery_address: {
      name: 'Rohan Sharma',
      line1: '123 MG Road',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560001',
      country: 'India',
    },
    vendor_orders: [
      {
        vendor_order_id: 'VO-2001',
        vendor_id: '1',
        vendor_name: 'Sargam Sound Systems',
        vendor_initials: 'SS',
        status: 'pending',
        subtotal: 12000,
        item_ids: ['item-1'],
        fulfilment_type: 'delivery',
      },
    ],
    items: [
      {
        item_id: 'item-1',
        equipment_id: 'eq-1',
        name: 'Pro Sound Speakers',
        image_url: '/speakers.jpg',
        unit_price: 4000,
        quantity: 1,
        days: 3,
        total_price: 12000,
        status: 'pending',
        vendor_id: '1',
        vendor_name: 'Sargam Sound Systems',
        review: null,
        damage_report: null,
      },
    ],
    payments: [],
    deposit: {
      held: 3000,
      deducted: 0,
      refunded: 0,
      pending_refund: 3000,
    },
    price_summary: {
      subtotal: 12000,
      discount: 0,
      tax: 0,
      delivery_fee: 0,
      security_deposit: 3000,
      total: 15000,
    },
    activity: [],
  }
}

describe('Lifecycle Engine & State Machines', () => {
  describe('allowedActions', () => {
    it('returns accept and decline for vendor on pending order', () => {
      const order: VendorOrder = {
        vendor_order_id: 'VO-1',
        vendor_id: '1',
        vendor_name: 'Vendor A',
        vendor_initials: 'VA',
        status: 'pending',
        subtotal: 5000,
        item_ids: ['i1'],
      }

      const vendorActions = allowedActions(order, 'vendor')
      expect(vendorActions).toContain('accept')
      expect(vendorActions).toContain('decline')
      expect(vendorActions).not.toContain('dispatch')

      const customerActions = allowedActions(order, 'customer')
      expect(customerActions).toContain('cancel')
      expect(customerActions).not.toContain('accept')
    })

    it('returns schedule_delivery when order is accepted and not yet scheduled', () => {
      const order: VendorOrder = {
        vendor_order_id: 'VO-1',
        vendor_id: '1',
        vendor_name: 'Vendor A',
        vendor_initials: 'VA',
        status: 'accepted',
        subtotal: 5000,
        item_ids: ['i1'],
        fulfilment_type: 'delivery',
      }

      const actions = allowedActions(order, 'vendor')
      expect(actions).toContain('schedule_delivery')
      expect(actions).not.toContain('dispatch')
    })

    it('returns dispatch when delivery is scheduled', () => {
      const order: VendorOrder = {
        vendor_order_id: 'VO-1',
        vendor_id: '1',
        vendor_name: 'Vendor A',
        vendor_initials: 'VA',
        status: 'accepted',
        subtotal: 5000,
        item_ids: ['i1'],
        fulfilment_type: 'delivery',
        delivery: {
          type: 'delivery',
          status: 'scheduled',
          scheduled_window: '2026-11-15 10:00 - 12:00',
          updated_at: '2026-11-14',
        },
      }

      const actions = allowedActions(order, 'vendor')
      expect(actions).toContain('dispatch')
      expect(actions).not.toContain('schedule_delivery')
    })

    it('returns mark_delivered and delivery_failed when dispatched', () => {
      const order: VendorOrder = {
        vendor_order_id: 'VO-1',
        vendor_id: '1',
        vendor_name: 'Vendor A',
        vendor_initials: 'VA',
        status: 'dispatched',
        subtotal: 5000,
        item_ids: ['i1'],
      }

      const actions = allowedActions(order, 'vendor')
      expect(actions).toEqual(['mark_delivered', 'delivery_failed'])
    })

    it('returns empty for terminal states', () => {
      const completed: VendorOrder = {
        vendor_order_id: 'VO-1',
        vendor_id: '1',
        vendor_name: 'Vendor A',
        vendor_initials: 'VA',
        status: 'completed',
        subtotal: 5000,
        item_ids: ['i1'],
      }
      expect(allowedActions(completed, 'vendor')).toEqual([])
      expect(allowedActions(completed, 'admin')).toEqual([])
    })
  })

  describe('deriveBookingStatus', () => {
    it('derives pending when all orders are pending', () => {
      const orders = [{ status: 'pending' }, { status: 'pending' }] as VendorOrder[]
      expect(deriveBookingStatus(orders)).toBe('pending')
    })

    it('derives confirmed when any order accepted and none dispatched or later', () => {
      const orders = [{ status: 'pending' }, { status: 'accepted' }] as VendorOrder[]
      expect(deriveBookingStatus(orders)).toBe('confirmed')
    })

    it('derives in_progress when any order is dispatched, delivered, or returned', () => {
      const orders = [{ status: 'accepted' }, { status: 'dispatched' }] as VendorOrder[]
      expect(deriveBookingStatus(orders)).toBe('in_progress')
    })

    it('derives completed when all orders are finished and at least one completed', () => {
      const orders = [{ status: 'completed' }, { status: 'rejected' }] as VendorOrder[]
      expect(deriveBookingStatus(orders)).toBe('completed')
    })

    it('derives cancelled when all orders are rejected or cancelled', () => {
      const orders = [{ status: 'rejected' }, { status: 'cancelled' }] as VendorOrder[]
      expect(deriveBookingStatus(orders)).toBe('cancelled')
    })
  })

  describe('calculatePayout', () => {
    it('correctly calculates integer paise net = gross - commission', () => {
      const result = calculatePayout(18400, 10)
      expect(result.gross).toBe(18400)
      expect(result.commission).toBe(1840)
      expect(result.net).toBe(16560)
      expect(result.net).toBe(result.gross - result.commission)
    })

    it('handles fractional commission rounding cleanly', () => {
      // 12345 * 12.5% = 1543.125 -> 1543
      const result = calculatePayout(12345, 12.5)
      expect(result.commission).toBe(1543)
      expect(result.net).toBe(10802)
      expect(result.net + result.commission).toBe(result.gross)
    })
  })

  describe('calculateDepositSettlement', () => {
    it('returns full refund when no damage reports exist', () => {
      const items: BookingItemDetail[] = [
        {
          item_id: 'i1',
          equipment_id: 'eq1',
          name: 'Item 1',
          image_url: '',
          unit_price: 1000,
          quantity: 2,
          days: 1,
          total_price: 2000,
          status: 'returned',
          vendor_id: '1',
          vendor_name: 'V1',
          review: null,
          damage_report: null,
        },
      ]

      const settlement = calculateDepositSettlement(items, { eq1: 1500 })
      expect(settlement.depositShare).toBe(3000)
      expect(settlement.totalDeductions).toBe(0)
      expect(settlement.refundAmount).toBe(3000)
    })

    it('deducts resolved damage amounts and refunds the remainder', () => {
      const items: BookingItemDetail[] = [
        {
          item_id: 'i1',
          equipment_id: 'eq1',
          name: 'Item 1',
          image_url: '',
          unit_price: 1000,
          quantity: 2,
          days: 1,
          total_price: 2000,
          status: 'returned',
          vendor_id: '1',
          vendor_name: 'V1',
          review: null,
          damage_report: {
            report_id: 'DR-1',
            equipment_id: 'eq1',
            equipment_name: 'Item 1',
            description: 'Scratched base',
            repair_cost: 800,
            deducted_from_deposit: 800,
            status: 'resolved',
            filed_at: '2026-11-17',
          },
        },
      ]

      const settlement = calculateDepositSettlement(items, { eq1: 1500 })
      expect(settlement.depositShare).toBe(3000)
      expect(settlement.totalDeductions).toBe(800)
      expect(settlement.refundAmount).toBe(2200)
    })
  })

  describe('evaluateDisputeResolution', () => {
    it('handles full uphold up to deposit share', () => {
      const res = evaluateDisputeResolution(1500, 2000, 'full')
      expect(res.isValid).toBe(true)
      expect(res.finalAmount).toBe(1500)
      expect(res.deductedFromDeposit).toBe(1500)
    })

    it('rejects claim if claim exceeds deposit share', () => {
      const res = evaluateDisputeResolution(2500, 2000, 'full')
      expect(res.isValid).toBe(false)
      expect(res.error).toBeDefined()
    })

    it('enforces strictly positive and bounded partial amount', () => {
      const resValid = evaluateDisputeResolution(1500, 2000, 'partial', 800)
      expect(resValid.isValid).toBe(true)
      expect(resValid.finalAmount).toBe(800)

      const resZero = evaluateDisputeResolution(1500, 2000, 'partial', 0)
      expect(resZero.isValid).toBe(false)

      const resExceed = evaluateDisputeResolution(1500, 2000, 'partial', 1600)
      expect(resExceed.isValid).toBe(false)
    })

    it('handles rejection cleanly', () => {
      const res = evaluateDisputeResolution(1500, 2000, 'reject')
      expect(res.isValid).toBe(true)
      expect(res.finalAmount).toBe(0)
      expect(res.deductedFromDeposit).toBe(0)
    })
  })

  describe('End-to-End Happy Path Lifecycle', () => {
    it('progresses through accept -> schedule -> dispatch -> deliver -> return -> inspect clean -> completed', () => {
      let booking = createMockBooking()
      const orderId = 'VO-2001'

      // 1. Accept
      let res = applyAction(booking, orderId, 'accept', {}, 'vendor')
      expect(res.error).toBeUndefined()
      expect(res.vendorOrder.status).toBe('accepted')
      expect(res.booking.items[0].status).toBe('confirmed')
      expect(res.booking.status).toBe('confirmed')
      booking = res.booking

      // 2. Schedule Delivery
      res = applyAction(
        booking,
        orderId,
        'schedule_delivery',
        { date: '2026-11-15', startTime: '10:00', endTime: '12:00', deliveredBy: 'Driver Dan' },
        'vendor'
      )
      expect(res.error).toBeUndefined()
      expect(res.vendorOrder.delivery?.status).toBe('scheduled')
      booking = res.booking

      // 3. Dispatch
      res = applyAction(booking, orderId, 'dispatch', {}, 'vendor')
      expect(res.error).toBeUndefined()
      expect(res.vendorOrder.status).toBe('dispatched')
      expect(res.booking.status).toBe('in_progress')
      booking = res.booking

      // 4. Mark Delivered (proof photo required)
      const failWithoutProof = applyAction(booking, orderId, 'mark_delivered', { deliveredBy: 'Dan' }, 'vendor')
      expect(failWithoutProof.error).toContain('Proof of delivery photo is required')

      res = applyAction(
        booking,
        orderId,
        'mark_delivered',
        { deliveredBy: 'Dan', deliveredAt: '2026-11-15T11:00:00Z', proofPhotoUrl: '/proof.jpg' },
        'vendor'
      )
      expect(res.error).toBeUndefined()
      expect(res.vendorOrder.status).toBe('delivered')
      expect(res.booking.items[0].status).toBe('delivered')
      booking = res.booking

      // 5. Schedule Return
      res = applyAction(
        booking,
        orderId,
        'schedule_return',
        { date: '2026-11-17', startTime: '16:00', endTime: '18:00' },
        'vendor'
      )
      expect(res.error).toBeUndefined()
      expect(res.vendorOrder.return?.status).toBe('scheduled')
      booking = res.booking

      // 6. Mark Returned
      res = applyAction(booking, orderId, 'mark_returned', {}, 'vendor')
      expect(res.error).toBeUndefined()
      expect(res.vendorOrder.status).toBe('returned')
      expect(res.booking.items[0].status).toBe('returned')
      booking = res.booking

      // 7. Inspect Clean -> auto completes order and generates payout + deposit refund
      res = applyAction(
        booking,
        orderId,
        'inspect',
        {
          items: [
            {
              itemId: 'item-1',
              equipmentId: 'eq-1',
              equipmentName: 'Pro Sound Speakers',
              returnedQuantity: 1,
              condition: 'Good',
            },
          ],
        },
        'vendor',
        { vendorCommissionRate: 10, equipmentDeposits: { 'eq-1': 3000 } }
      )
      expect(res.error).toBeUndefined()
      expect(res.vendorOrder.status).toBe('completed')
      expect(res.booking.status).toBe('completed')
      expect(res.createdPayout).toBeDefined()
      expect(res.createdPayout?.net).toBe(10800) // 12000 - 1200
      expect(res.createdDepositRefund).toBeDefined()
      expect(res.createdDepositRefund?.amount).toBe(3000)
    })

    it('requires minimum 10 chars reason for decline', () => {
      const booking = createMockBooking()
      const res = applyAction(booking, 'VO-2001', 'decline', { reason: 'No' }, 'vendor')
      expect(res.error).toContain('at least 10 characters')
    })
  })
})
