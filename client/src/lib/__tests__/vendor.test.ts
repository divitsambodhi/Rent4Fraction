import { describe, it, expect, beforeEach } from 'vitest'
import {
  calculatePayoutAmounts,
  getVendorOverview,
  getVendorPayouts,
  getVendorReviews,
  getVendorProfile,
  updateVendorProfile,
} from '@/test-support/vendor-store'
import {
  validateBlockUnits,
  checkCanArchiveEquipment,
  createInitialEquipmentState,
  saveStoredEquipmentState,
} from '@/test-support/equipment-store'

describe('Vendor Logic & Math Invariants', () => {
  beforeEach(() => {
    // Reset stored equipment state to known initial state
    saveStoredEquipmentState(createInitialEquipmentState())
  })

  describe('1. Payout Arithmetic & Commission Exactness', () => {
    it('computes exact paise-based commission and net with zero floating-point drift', () => {
      const calc1 = calculatePayoutAmounts(18400, 10)
      expect(calc1.gross).toBe(18400)
      expect(calc1.commission).toBe(1840)
      expect(calc1.net).toBe(16560)
      expect(calc1.net).toBe(calc1.gross - calc1.commission)

      const calc2 = calculatePayoutAmounts(12800, 10)
      expect(calc2.gross).toBe(12800)
      expect(calc2.commission).toBe(1280)
      expect(calc2.net).toBe(11520)
      expect(calc2.net).toBe(calc2.gross - calc2.commission)
    })

    it('handles awkward fractional amounts with integer rounding ensuring net = gross - commission', () => {
      const testAmounts = [3333.33, 999.99, 142.85, 7777.77, 1050.25]
      testAmounts.forEach((gross) => {
        const res = calculatePayoutAmounts(gross, 10)
        expect(res.gross).toBe(gross)
        expect(Number((res.gross - res.commission).toFixed(2))).toBe(res.net)
      })
    })

    it('reads the vendor stored commission rate dynamically', () => {
      const profile = getVendorProfile('1')
      expect(profile.commission_rate).toBe(10)

      updateVendorProfile({ commission_rate: 15 }, '1')
      const updated = getVendorProfile('1')
      expect(updated.commission_rate).toBe(15)

      const calc = calculatePayoutAmounts(10000, updated.commission_rate)
      expect(calc.commission).toBe(1500)
      expect(calc.net).toBe(8500)

      // Restore to 10
      updateVendorProfile({ commission_rate: 10 }, '1')
    })
  })

  describe('2. KPI & Range Aggregations (7d, 30d, 90d, ytd)', () => {
    it('aggregates overview metrics correctly across all 4 time intervals', () => {
      const o7d = getVendorOverview('7d', '1')
      expect(o7d.range).toBe('7d')
      expect(o7d.earnings_series.length).toBe(7)
      expect(o7d.kpis.pending_orders).toBeGreaterThanOrEqual(0)
      expect(o7d.kpis.active_orders).toBeGreaterThanOrEqual(0)

      const o30d = getVendorOverview('30d', '1')
      expect(o30d.range).toBe('30d')
      expect(o30d.earnings_series.length).toBe(10)
      expect(o30d.kpis.net_earnings).toBeGreaterThanOrEqual(0)

      const o90d = getVendorOverview('90d', '1')
      expect(o90d.range).toBe('90d')
      expect(o90d.earnings_series.length).toBe(12)

      const oytd = getVendorOverview('ytd', '1')
      expect(oytd.range).toBe('ytd')
      expect(oytd.earnings_series.length).toBe(10) // Jan to Oct
    })

    it('verifies earnings series totals match payout calculations', () => {
      const o30d = getVendorOverview('30d', '1')
      const totalSeriesNet = o30d.earnings_series.reduce((sum: number, pt: any) => sum + pt.net, 0)
      expect(totalSeriesNet).toBe(o30d.kpis.net_earnings)
    })
  })

  describe('3. Payout Tiles & Table Invariants', () => {
    it('satisfies total_earned_net = pending + processing + paid_out', () => {
      const payoutsRes = getVendorPayouts({ pageSize: 50 }, '1')
      const { tiles } = payoutsRes
      expect(tiles.total_earned_net).toBe(tiles.pending + tiles.processing + tiles.paid_out)

      // Every individual payout item satisfies net = gross - commission
      payoutsRes.items.forEach((p: any) => {
        expect(Number((p.gross - p.commission_amount).toFixed(2))).toBe(p.net)
      })
    })
  })

  describe('4. Review Stats & Replies', () => {
    it('computes accurate review average and distribution', () => {
      const reviewsRes = getVendorReviews({ pageSize: 50 }, '1')
      const { summary } = reviewsRes

      expect(summary.count).toBeGreaterThan(0)
      expect(summary.avg).toBeGreaterThanOrEqual(1)
      expect(summary.avg).toBeLessThanOrEqual(5)

      const sumDistribution =
        summary.distribution[1] +
        summary.distribution[2] +
        summary.distribution[3] +
        summary.distribution[4] +
        summary.distribution[5]
      expect(sumDistribution).toBe(summary.count)
      expect(summary.replied_count).toBeLessThanOrEqual(summary.count)
    })
  })

  describe('5. Availability Block Validation Invariants', () => {
    it('rejects block requests when units exceed free stock', () => {
      // Equipment 1 has total stock = 6
      const res = validateBlockUnits('1', '2026-11-20', '2026-11-23', 8)
      expect(res.valid).toBe(false)
      expect(res.message).toContain('Cannot block')
    })

    it('rejects past dates and invalid intervals', () => {
      const past = validateBlockUnits('1', '2020-01-01', '2020-01-02', 1)
      expect(past.valid).toBe(false)
      expect(past.message).toContain('past dates')

      const inverted = validateBlockUnits('1', '2026-11-15', '2026-11-10', 1)
      expect(inverted.valid).toBe(false)
      expect(inverted.message).toContain('on or after start date')
    })
  })

  describe('6. Inventory Archiving Rules', () => {
    it('blocks archiving when equipment is in an active or upcoming booking', () => {
      // Item 1 is reserved in BK-1042
      const check = checkCanArchiveEquipment('1')
      expect(check.canArchive).toBe(false)
      expect(check.reason).toContain('Cannot archive item')
    })

    it('allows archiving unreserved equipment', () => {
      const check = checkCanArchiveEquipment('99999')
      expect(check.canArchive).toBe(true)
    })
  })
})
