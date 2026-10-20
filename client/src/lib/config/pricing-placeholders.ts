// PLACEHOLDER business rules: the backend will compute the real quote

import type { Coupon } from '@/types/checkout'

/** Estimated Goods & Services Tax (GST) rate applied to (subtotal - discount) */
export const MOCK_TAX_RATE = 0.18

/** Standard flat delivery fee charged per vendor that fulfils via delivery */
export const MOCK_DELIVERY_FEE_PER_VENDOR = 300

/** Self-pickup fee per vendor */
export const MOCK_PICKUP_FEE = 0

/**
 * Mock coupons available for testing the checkout flow:
 * - WELCOME100: flat ₹100 off on min order ₹1,000
 * - SAVE10: 10% off on min order ₹2,000
 * - EXPIRED5: expired promotion
 * - LIMITED1: promotion that has already hit its usage limit
 */
export const MOCK_COUPONS: Record<string, Coupon> = {
  WELCOME100: {
    code: 'WELCOME100',
    type: 'flat',
    value: 100,
    min_order_amount: 1000,
    used_count: 42,
    is_active: true,
    description: 'Flat ₹100 off on orders of ₹1,000 or more',
  },
  SAVE10: {
    code: 'SAVE10',
    type: 'percent',
    value: 10,
    min_order_amount: 2000,
    used_count: 18,
    is_active: true,
    description: '10% off on orders of ₹2,000 or more',
  },
  EXPIRED5: {
    code: 'EXPIRED5',
    type: 'flat',
    value: 500,
    min_order_amount: 1000,
    expires_at: '2024-01-01T00:00:00.000Z',
    used_count: 100,
    is_active: true,
    description: 'Expired discount coupon',
  },
  LIMITED1: {
    code: 'LIMITED1',
    type: 'flat',
    value: 200,
    min_order_amount: 500,
    usage_limit: 1,
    used_count: 1,
    is_active: true,
    description: 'Limited single-use voucher',
  },
}
