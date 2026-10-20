import type { BookingItemDetail } from '@/types/account'

export interface PayoutCalculationResult {
  gross: number
  commission: number
  net: number
}

/**
 * Calculate vendor payout amounts with paise-safe integer rounding.
 * Invariant: gross - commission === net
 */
export function calculatePayout(gross: number, commissionRate: number): PayoutCalculationResult {
  const safeGross = Math.max(0, Math.round(gross))
  const safeRate = Math.max(0, Math.min(100, commissionRate))
  const commission = Math.round(safeGross * (safeRate / 100))
  const net = safeGross - commission
  return {
    gross: safeGross,
    commission,
    net,
  }
}

export interface DepositSettlementResult {
  depositShare: number
  totalDeductions: number
  refundAmount: number
}

/**
 * Calculate deposit settlement for a vendor order.
 * - depositShare: sum of item deposit * quantity
 * - totalDeductions: sum of resolved deducted_from_deposit amounts
 * - refundAmount: depositShare - totalDeductions
 */
export function calculateDepositSettlement(
  orderItems: BookingItemDetail[],
  itemDepositMap: Record<string, number> = {}
): DepositSettlementResult {
  let depositShare = 0
  let totalDeductions = 0

  orderItems.forEach((item) => {
    const unitDeposit = itemDepositMap[item.equipment_id] ?? 2000
    depositShare += unitDeposit * (item.quantity || 1)

    if (item.damage_report && item.damage_report.status === 'resolved') {
      totalDeductions += item.damage_report.deducted_from_deposit || 0
    }
  })

  // Deductions cannot exceed deposit share
  const clampedDeductions = Math.min(depositShare, totalDeductions)
  const refundAmount = Math.max(0, depositShare - clampedDeductions)

  return {
    depositShare,
    totalDeductions: clampedDeductions,
    refundAmount,
  }
}

export interface DisputeResolutionResult {
  finalAmount: number
  deductedFromDeposit: number
  isValid: boolean
  error?: string
}

/**
 * Validate and calculate dispute resolution amounts.
 * - full: claim amount
 * - partial: 0 < amount < claim
 * - reject: 0
 * - invariant: amount <= depositShare
 */
export function evaluateDisputeResolution(
  claimAmount: number,
  depositShare: number,
  outcome: 'full' | 'partial' | 'reject',
  proposedAmount?: number
): DisputeResolutionResult {
  if (outcome === 'reject') {
    return {
      finalAmount: 0,
      deductedFromDeposit: 0,
      isValid: true,
    }
  }

  if (outcome === 'full') {
    if (claimAmount > depositShare) {
      return {
        finalAmount: claimAmount,
        deductedFromDeposit: Math.min(claimAmount, depositShare),
        isValid: false,
        error: `Claim amount (₹${claimAmount}) exceeds held deposit share (₹${depositShare})`,
      }
    }
    return {
      finalAmount: claimAmount,
      deductedFromDeposit: claimAmount,
      isValid: true,
    }
  }

  // Partial outcome
  const amt = Number(proposedAmount)
  if (isNaN(amt) || amt <= 0 || amt >= claimAmount) {
    return {
      finalAmount: amt || 0,
      deductedFromDeposit: 0,
      isValid: false,
      error: `Partial amount must be strictly greater than 0 and less than ₹${claimAmount}`,
    }
  }

  if (amt > depositShare) {
    return {
      finalAmount: amt,
      deductedFromDeposit: Math.min(amt, depositShare),
      isValid: false,
      error: `Proposed amount (₹${amt}) exceeds held deposit share (₹${depositShare})`,
    }
  }

  return {
    finalAmount: amt,
    deductedFromDeposit: amt,
    isValid: true,
  }
}
