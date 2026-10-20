import { describe, it, expect } from 'vitest'
import {
  rentalDays,
  lineTotal,
  groupByPeriod,
  couponDiscount,
  deliveryFee,
  tax,
  quote,
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
    it('charges ₹300 per vendor choosing delivery and ₹0 for pickup', () => {
      const res = deliveryFee(
        { v1: 'delivery', v2: 'pickup', v3: 'delivery' },
        ['v1', 'v2', 'v3'],
      )
      expect(res.total).toBe(600)
      expect(res.byVendor).toEqual({ v1: 300, v2: 0, v3: 300 })
    })
  })

  describe('tax calculation', () => {
    it('computes 18% GST accurately on discounted subtotal', () => {
      // 10000 taxable subtotal -> 1800 tax
      expect(tax(10000)).toBe(1800)
      // 1234.50 taxable subtotal -> round(1234.50 * 0.18) = 222.21
      expect(tax(1234.5)).toBe(222.21)
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
      // Taxable = 23400 - 100 = 23300. Tax = 23300 * 0.18 = 4194
      expect(q.tax).toBe(4194)
      // Delivery = 300 (v1 delivery, v2 pickup)
      expect(q.delivery_fee).toBe(300)
      // Security deposit = (10000 * 2) + (7000 * 1) = 27000
      expect(q.security_deposit).toBe(27000)
      // Total = 23400 - 100 + 4194 + 300 + 27000 = 54794
      expect(q.total).toBe(54794)

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
})
