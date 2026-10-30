import { describe, it, expect } from 'vitest'
import {
  rentalDays,
  lineTotal,
  groupByPeriod,
  couponDiscount,
  deliveryFee,
  tax,
  quote,
  resolveCommission,
  calculateItemCommission,
  calculateOrderPayoutFromItems,
} from '../pricing'
import { MOCK_COUPONS } from '../config/pricing-placeholders'
import type { CartLine } from '@/types/checkout'

describe('Pricing Engine Unit Tests', () => {
  describe('rentalDays', () => {
    it('calculates inclusive rental days correctly', () => {
      expect(rentalDays('2026-11-12', '2026-11-14')).toBe(3)
      expect(rentalDays('2026-11-12', '2026-11-12')).toBe(1)
      expect(rentalDays('2026-11-01', '2026-11-07')).toBe(7)
    })

    it('returns minimum 1 day for fallback or malformed dates', () => {
      expect(rentalDays('', '')).toBe(1)
      expect(rentalDays('invalid', 'dates')).toBe(1)
    })
  })

  describe('lineTotal', () => {
    it('calculates line total accurately', () => {
      // 2 units * 2500/day * 3 days = 15000
      expect(lineTotal(2500, 2, 3)).toBe(15000)
      // 1 unit * 700/day * 2 days = 1400
      expect(lineTotal(700, 1, 2)).toBe(1400)
    })

    it('handles awkward fractional rounding cleanly without float drift', () => {
      // 7 units * 333.33 * 3 days = 6999.93
      const total = lineTotal(333.33, 7, 3)
      expect(total).toBe(6999.93)
    })
  })

  describe('groupByPeriod', () => {
    it('groups lines by unique start_date and end_date', () => {
      const mockLines: CartLine[] = [
        {
          cart_item_id: 'c1',
          equipment_id: 'eq-1',
          name: 'Speaker',
          category: 'Speakers',
          vendor_id: 'v1',
          vendor_name: 'Sargam Sound Systems',
          price_per_day: 2500,
          security_deposit: 5000,
          quantity: 2,
          start_date: '2026-11-12',
          end_date: '2026-11-14',
          days: 3,
          primary_image_url: '/img1.jpg',
          delivery_available: true,
        },
        {
          cart_item_id: 'c2',
          equipment_id: 'eq-2',
          name: 'Lights',
          category: 'Stage lights',
          vendor_id: 'v2',
          vendor_name: 'Lumina Lighting',
          price_per_day: 1800,
          security_deposit: 3000,
          quantity: 1,
          start_date: '2026-11-12',
          end_date: '2026-11-14',
          days: 3,
          primary_image_url: '/img2.jpg',
          delivery_available: true,
        },
        {
          cart_item_id: 'c3',
          equipment_id: 'eq-3',
          name: 'Mic',
          category: 'Microphones',
          vendor_id: 'v1',
          vendor_name: 'Sargam Sound Systems',
          price_per_day: 800,
          security_deposit: 1500,
          quantity: 1,
          start_date: '2026-12-01',
          end_date: '2026-12-02',
          days: 2,
          primary_image_url: '/img3.jpg',
          delivery_available: false,
        },
      ]

      const periods = groupByPeriod(mockLines)
      expect(periods).toHaveLength(2)

      // First period: 2026-11-12_2026-11-14
      expect(periods[0].period_key).toBe('2026-11-12_2026-11-14')
      expect(periods[0].lines).toHaveLength(2)
      expect(periods[0].vendor_groups).toHaveLength(2)

      // Second period: 2026-12-01_2026-12-02
      expect(periods[1].period_key).toBe('2026-12-01_2026-12-02')
      expect(periods[1].lines).toHaveLength(1)
      expect(periods[1].vendor_groups[0].delivery_available).toBe(false)
    })
  })

  describe('couponDiscount', () => {
    it('applies flat discount (WELCOME100) when subtotal meets threshold', () => {
      const coupon = MOCK_COUPONS.WELCOME100
      const res = couponDiscount(coupon, 15000)
      expect(res.discount).toBe(100)
      expect(res.error).toBeUndefined()
    })

    it('rejects flat discount when subtotal is below minimum order amount', () => {
      const coupon = MOCK_COUPONS.WELCOME100
      const res = couponDiscount(coupon, 850)
      expect(res.discount).toBe(0)
      expect(res.error).toBe('Add ₹150 more to use this code.')
    })

    it('applies percentage discount (SAVE10) correctly', () => {
      const coupon = MOCK_COUPONS.SAVE10
      const res = couponDiscount(coupon, 5000)
      expect(res.discount).toBe(500)
    })

    it('rejects expired coupon (EXPIRED5)', () => {
      const coupon = MOCK_COUPONS.EXPIRED5
      const res = couponDiscount(coupon, 5000)
      expect(res.discount).toBe(0)
      expect(res.error).toBe('This code has expired.')
    })

    it('rejects coupon that reached usage limit (LIMITED1)', () => {
      const coupon = MOCK_COUPONS.LIMITED1
      const res = couponDiscount(coupon, 1000)
      expect(res.discount).toBe(0)
      expect(res.error).toBe('This code has reached its usage limit.')
    })

    it('handles invalid or non-existent coupon', () => {
      const res = couponDiscount(null, 5000)
      expect(res.discount).toBe(0)
      expect(res.error).toBeUndefined()
    })
  })

  describe('deliveryFee', () => {
    it('sets delivery fee to 0 at checkout (calculated by vendor upon review) and ₹0 for pickup', () => {
      const res = deliveryFee(
        { v1: 'delivery', v2: 'pickup', v3: 'delivery' },
        ['v1', 'v2', 'v3'],
      )
      expect(res.total).toBe(0)
      expect(res.byVendor).toEqual({ v1: 0, v2: 0, v3: 0 })
    })
  })

  describe('tax calculation', () => {
    it('computes ₹0 platform tax (direct vendor-to-customer model)', () => {
      expect(tax(10000)).toBe(0)
      expect(tax(1234.5)).toBe(0)
    })
  })

  describe('Quote Invariant and Determinism', () => {
    it('ensures total equals subtotal - discount + tax + delivery + deposit exactly', () => {
      const mockLines: CartLine[] = [
        {
          cart_item_id: 'c1',
          equipment_id: 'eq-1',
          name: 'Pro Line-Array Speaker Pair',
          category: 'Speakers',
          vendor_id: 'v1',
          vendor_name: 'Sargam Sound Systems',
          price_per_day: 2500,
          security_deposit: 10000,
          quantity: 2,
          start_date: '2026-11-12',
          end_date: '2026-11-14',
          days: 3,
          primary_image_url: '/img1.jpg',
          delivery_available: true,
        },
        {
          cart_item_id: 'c2',
          equipment_id: 'eq-2',
          name: 'Moving Head Light (Pair)',
          category: 'Stage lights',
          vendor_id: 'v2',
          vendor_name: 'Lumina Lighting',
          price_per_day: 2800,
          security_deposit: 7000,
          quantity: 1,
          start_date: '2026-11-12',
          end_date: '2026-11-14',
          days: 3,
          primary_image_url: '/img2.jpg',
          delivery_available: true,
        },
      ]

      const q = quote({
        lines: mockLines,
        coupon: MOCK_COUPONS.WELCOME100,
        fulfilmentByVendor: { v1: 'delivery', v2: 'pickup' },
      })

      // Subtotal = (2500 * 2 * 3) + (2800 * 1 * 3) = 15000 + 8400 = 23400
      expect(q.subtotal).toBe(23400)
      // Discount = 100
      expect(q.discount).toBe(100)
      // Platform tax = 0
      expect(q.tax).toBe(0)
      // Delivery = 0 (to be quoted by vendor)
      expect(q.delivery_fee).toBe(0)
      // Security deposit = (10000 * 2) + (7000 * 1) = 27000
      expect(q.security_deposit).toBe(27000)
      // Total = 23400 - 100 + 0 + 0 + 27000 = 50300
      expect(q.total).toBe(50300)

      const expectedTotal =
        q.subtotal - q.discount + q.tax + q.delivery_fee + q.security_deposit
      expect(q.total).toBe(expectedTotal)
    })

    it('verifies exact total equality across 50 randomized carts', () => {
      for (let i = 0; i < 50; i++) {
        const lineCount = 1 + Math.floor(Math.random() * 5)
        const lines: CartLine[] = []

        for (let j = 0; j < lineCount; j++) {
          const price = 100 + Math.floor(Math.random() * 5000)
          const deposit = Math.floor(price * (1 + Math.random() * 2))
          const qty = 1 + Math.floor(Math.random() * 4)
          const days = 1 + Math.floor(Math.random() * 5)

          lines.push({
            cart_item_id: `c_${i}_${j}`,
            equipment_id: `eq_${j}`,
            name: `Item ${j}`,
            category: 'Testing',
            vendor_id: `v_${j % 3}`,
            vendor_name: `Vendor ${j % 3}`,
            price_per_day: price,
            security_deposit: deposit,
            quantity: qty,
            start_date: '2026-11-12',
            end_date: '2026-11-16',
            days,
            primary_image_url: '/img.jpg',
            delivery_available: true,
          })
        }

        const coupon = Math.random() > 0.5 ? MOCK_COUPONS.WELCOME100 : null
        const fulfilment: Record<string, 'delivery' | 'pickup'> = {
          v_0: Math.random() > 0.5 ? 'delivery' : 'pickup',
          v_1: Math.random() > 0.5 ? 'delivery' : 'pickup',
          v_2: 'pickup',
        }

        const q = quote({ lines, coupon, fulfilmentByVendor: fulfilment })
        const computed =
          Math.round(
            (q.subtotal - q.discount + q.tax + q.delivery_fee + q.security_deposit) * 100,
          ) / 100

        expect(q.total).toBe(computed)
      }
    })
  })

  describe('resolveCommission Precedence & Rounding', () => {
    it('uses equipment override when present (Precedence 1)', () => {
      const result = resolveCommission(
        { commission_rate: 15.5 },
        { default_commission_rate: 12 },
        { commission_rate: 10 }
      )
      expect(result).toEqual({ rate: 15.5, source: 'Equipment' })
    })

    it('uses category default when equipment has null/undefined (Precedence 2)', () => {
      const result = resolveCommission(
        { commission_rate: null },
        { default_commission_rate: 12.25 },
        { commission_rate: 10 }
      )
      expect(result).toEqual({ rate: 12.25, source: 'Category' })
    })

    it('uses vendor default when equipment and category have no rate (Precedence 3)', () => {
      const result = resolveCommission(
        { commission_rate: undefined },
        { default_commission_rate: null },
        { commission_rate: 8.5 }
      )
      expect(result).toEqual({ rate: 8.5, source: 'Vendor' })
    })

    it('falls back to platform default (Precedence 4)', () => {
      const result = resolveCommission(null, null, null)
      expect(result).toEqual({ rate: 10, source: 'Platform' })
    })

    it('clamps rates between 0 and 100 with at most 2 decimal places', () => {
      const high = resolveCommission({ commission_rate: 125.456 }, null, null)
      expect(high.rate).toBe(100)

      const low = resolveCommission({ commission_rate: -5.2 }, null, null)
      expect(low.rate).toBe(0)

      const precision = resolveCommission({ commission_rate: 12.3456 }, null, null)
      expect(precision.rate).toBe(12.35)
    })
  })

  describe('Per-Item Commission Snapshots & Payout Calculations', () => {
    it('accurately calculates item commission using paise-safe arithmetic', () => {
      const res = calculateItemCommission(15000, 10)
      expect(res.rate).toBe(10)
      expect(res.commissionAmount).toBe(1500)
      expect(res.netAmount).toBe(13500)
    })

    it('handles fractional paise without float drift', () => {
      // 333.33 total with 10% rate = 33.33 commission, 300 net
      const res = calculateItemCommission(333.33, 10)
      expect(res.commissionAmount).toBe(33.33)
      expect(res.netAmount).toBe(300)
    })

    it('sums per-item commission snapshots for order payouts (never vendor-level rate)', () => {
      const items = [
        {
          item_id: 'i1',
          equipment_id: 'eq1',
          name: 'Speaker',
          image_url: '',
          unit_price: 2500,
          quantity: 2,
          days: 3,
          total_price: 15000,
          status: 'confirmed' as const,
          vendor_id: 'v1',
          vendor_name: 'V1',
          review: null,
          damage_report: null,
          commission_rate: 15, // item override
          commission_amount: 2250,
        },
        {
          item_id: 'i2',
          equipment_id: 'eq2',
          name: 'Lights',
          image_url: '',
          unit_price: 1000,
          quantity: 1,
          days: 3,
          total_price: 3000,
          status: 'confirmed' as const,
          vendor_id: 'v1',
          vendor_name: 'V1',
          review: null,
          damage_report: null,
          commission_rate: 8, // category default
          commission_amount: 240,
        },
      ]

      const payout = calculateOrderPayoutFromItems(items)
      expect(payout.gross).toBe(18000)
      expect(payout.commission).toBe(2490) // 2250 + 240
      expect(payout.net).toBe(15510) // 18000 - 2490
      expect(payout.effective_rate).toBe(13.83) // 2490 / 18000 * 100
    })
  })
})
