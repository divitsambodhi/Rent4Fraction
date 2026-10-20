import { format, subDays, addDays } from 'date-fns'
import { loadAccountState, saveAccountState } from './account-store'
import {
  getVendorProfile,
  updateVendorProfile,
  getStoredVendorProfiles,
  calculatePayoutAmounts,
} from './vendor-store'
import { CANONICAL_CATEGORIES, type CanonicalCategory } from './canonical-ids'
import { MOCK_COUPONS } from '@/lib/config/pricing-placeholders'
import { evaluateDisputeResolution } from '@/lib/lifecycle/settlement'
import type {
  BookingDetail,
  BookingItemDetail,
  BookingSummary,
  VendorOrder,
  PaymentRecord,
} from '@/types/account'
import type { Coupon } from '@/types/checkout'
import type {
  AdminOverviewKPIs,
  AdminDispute,
} from '@/types/admin'
import type { VendorProfile, PayoutStatus } from '@/types/vendor'

const CATEGORIES_KEY = 'r4f-categories-v1'
const COUPONS_KEY = 'r4f-coupons-v1'
const PAYOUT_STATUS_KEY = 'r4f-payout-status-v1'

// -------------------------------------------------------------
// CATEGORIES STORE
// -------------------------------------------------------------

export interface ManagedCategory extends CanonicalCategory {
  is_active: boolean
  equipment_count?: number
}

function initCategories(): ManagedCategory[] {
  if (typeof window === 'undefined') {
    return CANONICAL_CATEGORIES.map((c) => ({ ...c, is_active: true }))
  }
  const raw = localStorage.getItem(CATEGORIES_KEY)
  if (raw) {
    try {
      return JSON.parse(raw)
    } catch {
      // Fallback
    }
  }
  const initial = CANONICAL_CATEGORIES.map((c) => ({ ...c, is_active: true }))
  localStorage.setItem(CATEGORIES_KEY, JSON.stringify(initial))
  return initial
}

export function getAdminCategories(): ManagedCategory[] {
  const categories = initCategories()
  const accountState = loadAccountState()
  
  // Calculate real equipment count
  return categories.map((cat) => {
    let count = 0
    accountState.bookings.forEach((b) => {
      b.items.forEach((item) => {
        if (item.category === cat.name || item.name.toLowerCase().includes(cat.name.toLowerCase())) {
          count++
        }
      })
    })
    return {
      ...cat,
      equipment_count: Math.max(count, 4), // Baseline equipment items
    }
  })
}

export function saveAdminCategory(category: Partial<ManagedCategory> & { name: string }): ManagedCategory {
  const categories = initCategories()
  
  if (category.id) {
    // Edit existing
    const idx = categories.findIndex((c) => c.id === category.id)
    if (idx !== -1) {
      categories[idx] = {
        ...categories[idx],
        ...category,
      }
      localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories))
      return categories[idx]
    }
  }
  
  // Create new
  const newId = `cat_${Date.now()}`
  const newCat: ManagedCategory = {
    id: newId,
    groupId: category.groupId || '101',
    groupName: category.groupName || 'Sound',
    name: category.name,
    starting_price: category.starting_price || 1000,
    icon: category.icon || 'Folder',
    description: category.description || '',
    image: category.image || '/images/equipment/line-array-speaker.svg',
    is_active: category.is_active !== undefined ? category.is_active : true,
  }
  categories.push(newCat)
  localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories))
  return newCat
}

export function toggleAdminCategoryActive(categoryId: string, is_active: boolean): void {
  const categories = initCategories()
  const target = categories.find((c) => c.id === categoryId)
  if (target) {
    target.is_active = is_active
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories))
  }
}

// -------------------------------------------------------------
// COUPONS STORE
// -------------------------------------------------------------

function initCoupons(): Record<string, Coupon> {
  if (typeof window === 'undefined') {
    return { ...MOCK_COUPONS }
  }
  const raw = localStorage.getItem(COUPONS_KEY)
  if (raw) {
    try {
      return JSON.parse(raw)
    } catch {
      // Fallback
    }
  }
  localStorage.setItem(COUPONS_KEY, JSON.stringify(MOCK_COUPONS))
  return { ...MOCK_COUPONS }
}

export function getAdminCoupons(): Coupon[] {
  const couponMap = initCoupons()
  return Object.values(couponMap)
}

export function saveAdminCoupon(coupon: Coupon): Coupon {
  const couponMap = initCoupons()
  const cleanCode = coupon.code.toUpperCase().trim()
  couponMap[cleanCode] = {
    ...coupon,
    code: cleanCode,
  }
  // Sync in-memory MOCK_COUPONS as well
  MOCK_COUPONS[cleanCode] = couponMap[cleanCode]
  if (typeof window !== 'undefined') {
    localStorage.setItem(COUPONS_KEY, JSON.stringify(couponMap))
  }
  return couponMap[cleanCode]
}

export function toggleAdminCouponActive(code: string, is_active: boolean): void {
  const couponMap = initCoupons()
  const cleanCode = code.toUpperCase().trim()
  if (couponMap[cleanCode]) {
    couponMap[cleanCode].is_active = is_active
    MOCK_COUPONS[cleanCode].is_active = is_active
    if (typeof window !== 'undefined') {
      localStorage.setItem(COUPONS_KEY, JSON.stringify(couponMap))
    }
  }
}

// -------------------------------------------------------------
// PAYOUTS STORE & OVERRIDES
// -------------------------------------------------------------

export interface AdminPayoutRow {
  payout_id: string
  vendor_id: string
  vendor_name: string
  order_id: string
  booking_id: string
  gross: number
  commission: number
  commission_rate: number
  net: number
  status: PayoutStatus
  created_at: string
  paid_at?: string | null
  utr_number?: string
  payment_method?: string
}

function getPayoutStatusOverrides(): Record<string, { status: PayoutStatus; paid_at?: string; utr?: string }> {
  if (typeof window === 'undefined') return {}
  const raw = localStorage.getItem(PAYOUT_STATUS_KEY)
  if (raw) {
    try {
      return JSON.parse(raw)
    } catch {
      return {}
    }
  }
  return {}
}

function savePayoutStatusOverrides(overrides: Record<string, { status: PayoutStatus; paid_at?: string; utr?: string }>): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(PAYOUT_STATUS_KEY, JSON.stringify(overrides))
  }
}

export function getAdminPayouts(): AdminPayoutRow[] {
  const accountState = loadAccountState()
  const overrides = getPayoutStatusOverrides()
  const profiles = getStoredVendorProfiles()
  const rows: AdminPayoutRow[] = []

  accountState.bookings.forEach((booking: BookingDetail) => {
    booking.vendor_orders.forEach((vo: VendorOrder) => {
      // Completed, delivered or accepted orders have payouts
      if (vo.status !== 'completed' && vo.status !== 'delivered' && vo.status !== 'accepted') return

      const profile = profiles[vo.vendor_id] || getVendorProfile(vo.vendor_id)
      const commissionRate = profile?.commission_rate ?? 10
      const amounts = calculatePayoutAmounts(vo.subtotal, commissionRate)
      const pId = `PO-${vo.vendor_order_id.replace('VO-', '')}`

      // Default status
      let defaultStatus: PayoutStatus = 'pending'
      const daysDiff = Math.floor((Date.now() - new Date(booking.end_date).getTime()) / (1000 * 60 * 60 * 24))
      if (daysDiff > 7) {
        defaultStatus = 'paid'
      } else if (daysDiff > 2) {
        defaultStatus = 'processing'
      }

      const override = overrides[pId]
      const finalStatus = override ? override.status : defaultStatus
      const paidAt = override?.paid_at || (finalStatus === 'paid' ? addDays(new Date(booking.end_date), 3).toISOString() : null)

      rows.push({
        payout_id: pId,
        vendor_id: vo.vendor_id,
        vendor_name: profile?.business_name || `Vendor ${vo.vendor_id}`,
        order_id: vo.vendor_order_id,
        booking_id: booking.booking_id,
        gross: amounts.gross,
        commission: amounts.commission,
        commission_rate: commissionRate,
        net: amounts.net,
        status: finalStatus,
        created_at: booking.end_date,
        paid_at: paidAt,
        utr_number: override?.utr,
      })
    })
  })

  return rows.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

export function updatePayoutStatus(
  payoutId: string,
  newStatus: PayoutStatus,
  details?: { paid_at?: string; utr_number?: string }
): void {
  const overrides = getPayoutStatusOverrides()
  overrides[payoutId] = {
    status: newStatus,
    paid_at: details?.paid_at || new Date().toISOString(),
    utr: details?.utr_number,
  }
  savePayoutStatusOverrides(overrides)

  // Notify vendor if paid
  if (newStatus === 'paid') {
    const accountState = loadAccountState()
    const nowIso = new Date().toISOString()
    accountState.notifications.unshift({
      id: `notif_payout_${Date.now()}`,
      user_id: 'vendor_sargam',
      type: 'payout_processed',
      title: 'Payout Processed',
      message: `Your payout ${payoutId} has been successfully credited via bank transfer.`,
      link: '/vendor/payouts',
      target: {},
      created_at: nowIso,
      read: false,
    })
    saveAccountState(accountState)
  }
}

// -------------------------------------------------------------
// DISPUTES STORE
// -------------------------------------------------------------

export function getAdminDisputes(): AdminDispute[] {
  const accountState = loadAccountState()
  const disputes: AdminDispute[] = []

  accountState.bookings.forEach((booking: BookingDetail) => {
    booking.items.forEach((item: BookingItemDetail) => {
      if (item.damage_report) {
        const dr = item.damage_report
        const vo = booking.vendor_orders.find((v) => v.vendor_id === item.vendor_id)
        const profile = getVendorProfile(item.vendor_id)
        const itemDeposit = (item.security_deposit || 2000) * (item.quantity || 1)

        disputes.push({
          dispute_id: dr.report_id || `DR-${item.item_id.slice(-4)}`,
          booking_id: booking.booking_id,
          vendor_order_id: vo?.vendor_order_id || `VO-${booking.booking_id.slice(-4)}`,
          customer_name: booking.delivery_address.name,
          customer_email: 'aarav@example.com',
          vendor_name: profile.business_name,
          vendor_id: item.vendor_id,
          equipment_name: item.name,
          equipment_id: item.item_id,
          claimed_amount: dr.claimed_amount || dr.damage_cost || 0,
          deducted_from_deposit: dr.deducted_from_deposit ? (dr.damage_cost || 0) : 0,
          status: dr.status as 'reported' | 'disputed' | 'resolved',
          description: dr.description || 'Reported damage during post-rental inspection',
          dispute_reason: dr.dispute_reason,
          filed_at: dr.filed_at || booking.end_date,
          resolved_at: dr.resolved_at,
          resolved_by: dr.resolved_by,
          resolution_note: dr.resolution_notes || dr.resolution_note,
          deposit_held: itemDeposit,
        })
      }
    })
  })

  return disputes
}

export function resolveAdminDispute(
  disputeId: string,
  outcome: 'uphold' | 'full' | 'partial' | 'reject',
  finalAmount: number,
  resolutionNote: string,
  adminName = 'Admin'
): void {
  const accountState = loadAccountState()
  const nowIso = new Date().toISOString()

  let targetBooking: BookingDetail | null = null
  let targetItem: BookingItemDetail | null = null

  for (const b of accountState.bookings) {
    for (const item of b.items) {
      if (item.damage_report && (item.damage_report.report_id === disputeId || `DR-${item.item_id.slice(-4)}` === disputeId)) {
        targetBooking = b
        targetItem = item
        break
      }
    }
    if (targetBooking) break
  }

  if (!targetBooking || !targetItem || !targetItem.damage_report) {
    throw new Error(`Dispute ${disputeId} not found`)
  }

  const claimAmount = targetItem.damage_report.claimed_amount || targetItem.damage_report.repair_cost || 0
  const depositShare = (targetItem.security_deposit || 2000) * (targetItem.quantity || 1)

  // Map 'uphold' to 'full' for pure lifecycle engine
  const mappedOutcome = outcome === 'uphold' ? 'full' : outcome

  // Validate using lifecycle settlement logic
  const evaluation = evaluateDisputeResolution(claimAmount, depositShare, mappedOutcome, finalAmount)

  targetItem.damage_report.status = 'resolved'
  targetItem.damage_report.damage_cost = evaluation.deductedFromDeposit
  targetItem.damage_report.repair_cost = evaluation.deductedFromDeposit
  targetItem.damage_report.deducted_from_deposit = evaluation.deductedFromDeposit
  targetItem.damage_report.resolution_note = resolutionNote
  targetItem.damage_report.resolution_notes = resolutionNote
  targetItem.damage_report.resolved_by = adminName
  targetItem.damage_report.resolved_at = nowIso
  targetItem.damage_report.dispute_resolution = outcome

  // Update or append deposit refund payment row
  const refundAmount = Math.max(0, depositShare - evaluation.deductedFromDeposit)
  if (refundAmount > 0) {
    const refundPayment: PaymentRecord = {
      payment_id: `PAY-REF-${Date.now().toString().slice(-5)}`,
      booking_id: targetBooking.booking_id,
      event_name: targetBooking.event_name,
      amount: refundAmount,
      created_at: nowIso,
      method: 'original_method',
      status: 'success',
      type: 'deposit_refund',
      reference: `REF-${disputeId}`,
    }
    targetBooking.payments.push(refundPayment)
  }

  // Activity timeline entry
  targetBooking.activity.unshift({
    id: `act-disp-${Date.now()}`,
    title: `Dispute resolved (${outcome})`,
    timestamp: nowIso,
    actor: 'Admin',
    event: `Dispute resolved (${outcome}): ₹${evaluation.deductedFromDeposit.toLocaleString('en-IN')} deducted, ₹${refundAmount.toLocaleString('en-IN')} refunded to customer.`,
    type: 'inspection',
  })

  // Notifications
  accountState.notifications.unshift({
    id: `notif_disp_c_${Date.now()}`,
    user_id: 'customer_aarav',
    type: 'refund_processed',
    title: 'Dispute Resolution Completed',
    message: `Rent4Fraction support has resolved the damage report. ₹${refundAmount.toLocaleString('en-IN')} has been refunded.`,
    link: `/account/bookings?id=${targetBooking.booking_id}`,
    target: { booking_id: targetBooking.booking_id },
    created_at: nowIso,
    read: false,
  })

  accountState.notifications.unshift({
    id: `notif_disp_v_${Date.now()}`,
    user_id: targetItem.vendor_id,
    type: 'damage_report_filed',
    title: 'Dispute Case Closed',
    message: `Case ${disputeId} resolved: ₹${evaluation.deductedFromDeposit.toLocaleString('en-IN')} approved for settlement.`,
    link: '/vendor/orders?tab=returns&filter=disputed',
    target: { booking_id: targetBooking.booking_id },
    created_at: nowIso,
    read: false,
  })

  saveAccountState(accountState)
}

// -------------------------------------------------------------
// VENDORS ADMIN ACTIONS
// -------------------------------------------------------------

export function updateVendorApprovalStatus(
  vendorId: string,
  newStatus: 'approved' | 'rejected' | 'suspended',
  reason?: string,
  adminName = 'Admin'
): VendorProfile {
  const nowIso = new Date().toISOString()
  const updates: Partial<VendorProfile> = {
    approval_status: newStatus,
  }
  if (newStatus === 'approved') {
    updates.approved_by = adminName
    updates.approved_at = nowIso
    updates.rejection_reason = undefined
  } else if (newStatus === 'rejected') {
    updates.rejection_reason = reason
  } else if (newStatus === 'suspended') {
    updates.rejection_reason = reason || 'Account suspended for policy review'
  }

  const updated = updateVendorProfile(updates, vendorId)

  // Notify vendor
  const accountState = loadAccountState()
  accountState.notifications.unshift({
    id: `notif_v_app_${Date.now()}`,
    user_id: vendorId,
    type: 'booking_confirmed',
    title: `Vendor Account ${newStatus === 'approved' ? 'Approved' : newStatus === 'suspended' ? 'Suspended' : 'Update'}`,
    message:
      newStatus === 'approved'
        ? 'Congratulations! Your vendor profile has been verified and your inventory is now live.'
        : `Your vendor account status was updated to ${newStatus}.${reason ? ` Reason: ${reason}` : ''}`,
    link: '/vendor',
    target: {},
    created_at: nowIso,
    read: false,
  })
  saveAccountState(accountState)

  return updated
}

// -------------------------------------------------------------
// OVERVIEW KPIS CALCULATOR
// -------------------------------------------------------------

export function getAdminOverviewKPIs(): AdminOverviewKPIs {
  const accountState = loadAccountState()
  const profiles = getStoredVendorProfiles()
  const disputes = getAdminDisputes()
  const payouts = getAdminPayouts()
  const coupons = getAdminCoupons()

  let grossBookingValue = 0
  let platformCommissionEarned = 0
  let bookingsCount = accountState.bookings.length

  accountState.bookings.forEach((b) => {
    grossBookingValue += b.total_amount
    b.vendor_orders.forEach((vo) => {
      const p = profiles[vo.vendor_id]
      const rate = p?.commission_rate ?? 10
      const c = Math.round(vo.subtotal * (rate / 100))
      platformCommissionEarned += c
    })
  })

  const vendorList: VendorProfile[] = Object.values(profiles) as VendorProfile[]
  const activeVendorsCount = vendorList.filter((v) => v.approval_status === 'approved').length
  const pendingApplicationsCount = vendorList.filter((v) => v.approval_status === 'pending').length
  const openDisputesCount = disputes.filter((d) => d.status === 'reported' || d.status === 'disputed').length
  const payoutsToProcess = payouts.filter((p) => p.status === 'pending').length

  // Expiring coupons in next 7 days
  const now = new Date()
  const sevenDays = addDays(now, 7).toISOString()
  const expiringCoupons = coupons.filter((c) => {
    const exp = c.valid_to || c.expires_at
    return exp && exp > now.toISOString() && exp <= sevenDays
  }).length

  // Generate chart data for last 7 days
  const chartData = [6, 5, 4, 3, 2, 1, 0].map((daysAgo) => {
    const d = subDays(now, daysAgo)
    const dStr = format(d, 'yyyy-MM-dd')
    const dayBookings = accountState.bookings.filter((b) => b.created_at?.startsWith(dStr))
    const val = dayBookings.reduce((sum, b) => sum + b.total_amount, 0)
    return {
      date: format(d, 'd MMM'),
      bookings: dayBookings.length,
      bookingValue: val > 0 ? val : Math.floor(Math.random() * 12000 + 4000), // realistic baseline
    }
  })

  const attentionItems = [
    {
      id: 'att-pending-vendors',
      label: 'Vendor applications to review',
      count: pendingApplicationsCount,
      href: '/admin?section=vendors&status=pending',
    },
    {
      id: 'att-open-disputes',
      label: 'Open customer & vendor disputes',
      count: openDisputesCount,
      href: '/admin?section=disputes&status=open',
    },
    {
      id: 'att-payouts-process',
      label: 'Vendor payouts to process',
      count: payoutsToProcess,
      href: '/admin?section=payouts&status=pending',
    },
  ]
  if (expiringCoupons > 0) {
    attentionItems.push({
      id: 'att-expiring-coupons',
      label: 'Coupons expiring within 7 days',
      count: expiringCoupons,
      href: '/admin?section=coupons&status=active',
    })
  }

  const recentBookings: BookingSummary[] = accountState.bookings.slice(0, 5).map((b) => ({
    booking_id: b.booking_id,
    event_name: b.event_name,
    event_type: b.event_type || 'Wedding',
    status: b.status,
    payment_status: b.payment_status,
    start_date: b.start_date,
    end_date: b.end_date,
    rental_days: b.rental_days || 3,
    total_amount: b.total_amount,
    delivery_city: b.delivery_address?.city || 'Bengaluru',
    vendor_count: b.vendor_orders.length,
    item_count: b.items.length,
    vendor_avatars: b.vendor_orders.map((v) => ({
      id: v.vendor_id,
      name: v.vendor_name,
      initials: v.vendor_initials || v.vendor_name.slice(0, 2).toUpperCase(),
    })),
    action_needed: [],
    created_at: b.created_at || b.start_date,
  }))

  const recentApplications: VendorProfile[] = vendorList
    .filter((v) => v.approval_status === 'pending' || v.approval_status === 'approved')
    .slice(0, 5)

  return {
    grossBookingValue,
    bookingsCount,
    bookingsDelta: '+12% from last month',
    activeVendorsCount,
    pendingApplicationsCount,
    openDisputesCount,
    platformCommissionEarned,
    chartData,
    attentionItems,
    recentBookings,
    recentApplications,
  }
}
