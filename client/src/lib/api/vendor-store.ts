import { format, subDays, addDays } from 'date-fns'
import type {
  AttentionItem,
  EarningsDataPoint,
  OverviewRange,
  PayoutStatus,
  ScheduleDayGroup,
  TopEquipmentItem,
  VendorKpis,
  VendorOverview,
  VendorPayout,
  VendorPayoutsResult,
  VendorProfile,
  VendorRecentOrder,
  VendorReview,
  VendorReviewsResult,
} from '@/types/vendor'
import {
  loadAccountState,
  saveAccountState,
} from './account-store'
import type {
  AppNotification,
  BookingDetail,
  BookingItemDetail,
  Conversation,
  VendorOrder,
  VendorOrderStatus,
} from '@/types/account'
import { getAllStoredEquipment } from './equipment-store'

const PROFILES_KEY = 'r4f-vendor-profiles-v1'

const DEFAULT_VENDOR_PROFILES: Record<string, VendorProfile> = {
  '1': {
    vendor_id: '1',
    business_name: 'Sargam Sound Systems',
    description:
      'Dependable event equipment and thoughtful service for celebrations big and small. Specialists in concert sound, line arrays, acoustic staging, and touring audio setups across Karnataka and Maharashtra.',
    address: '24, Indiranagar 100 Feet Road',
    city: 'Bengaluru',
    phone: '9845012345',
    gst_number: '29ABCDE1234F1Z5',
    gst: '29ABCDE1234F1Z5',
    logo_url: '/images/vendors/sargam-logo.svg',
    logo: '/images/vendors/sargam-logo.svg',
    approval_status: 'approved',
    member_since: 'June 2023',
    commission_rate: 10,
    owner_name: 'Sargam Sound Systems',
    owner_email: 'sargam@example.com',
    email: 'sargam@example.com',
    rating: 4.8,
    review_count: 128,
  },
  'v_sargam': {
    vendor_id: 'v_sargam',
    business_name: 'Sargam Sound Systems',
    description:
      'Dependable event equipment and thoughtful service for celebrations big and small. Specialists in concert sound, line arrays, acoustic staging, and touring audio setups across Karnataka and Maharashtra.',
    address: '24, Indiranagar 100 Feet Road',
    city: 'Bengaluru',
    phone: '9845012345',
    gst_number: '29ABCDE1234F1Z5',
    gst: '29ABCDE1234F1Z5',
    logo_url: '/images/vendors/sargam-logo.svg',
    logo: '/images/vendors/sargam-logo.svg',
    approval_status: 'approved',
    member_since: 'June 2023',
    commission_rate: 10,
    owner_name: 'Sargam Sound Systems',
    owner_email: 'sargam@example.com',
    email: 'sargam@example.com',
    rating: 4.8,
    review_count: 128,
  },
  '2': {
    vendor_id: '2',
    business_name: 'New Vendor Enterprises',
    description: 'Event equipment supplier offering lighting, sound, and staging.',
    address: '15 Commercial Street',
    city: 'Bengaluru',
    phone: '9123456789',
    gst_number: '29XYZAB5678C1Z2',
    gst: '29XYZAB5678C1Z2',
    logo_url: '',
    logo: '',
    approval_status: 'pending',
    member_since: 'October 2026',
    commission_rate: 10,
    owner_name: 'New Vendor',
    owner_email: 'newvendor@example.com',
    email: 'newvendor@example.com',
    rating: 4.5,
    review_count: 0,
  },
}

let memoryVendorProfiles: Record<string, VendorProfile> = { ...DEFAULT_VENDOR_PROFILES }

export function getStoredVendorProfiles(): Record<string, VendorProfile> {
  if (typeof localStorage === 'undefined') return memoryVendorProfiles
  try {
    const raw = localStorage.getItem(PROFILES_KEY)
    if (!raw) {
      localStorage.setItem(PROFILES_KEY, JSON.stringify(DEFAULT_VENDOR_PROFILES))
      return { ...DEFAULT_VENDOR_PROFILES }
    }
    return JSON.parse(raw)
  } catch {
    return memoryVendorProfiles
  }
}

export function saveStoredVendorProfiles(profiles: Record<string, VendorProfile>): void {
  memoryVendorProfiles = profiles
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles))
  } catch (err) {
    console.error('Failed to save vendor profiles', err)
  }
}

export function getVendorProfile(vendorId = '1'): VendorProfile {
  const profiles = getStoredVendorProfiles()
  const normalizedId = vendorId === 'v_sargam' ? '1' : vendorId
  return profiles[normalizedId] || profiles['1'] || DEFAULT_VENDOR_PROFILES['1']
}

export function updateVendorProfile(data: Partial<VendorProfile>, vendorId = '1'): VendorProfile {
  const profiles = getStoredVendorProfiles()
  const normalizedId = vendorId === 'v_sargam' ? '1' : vendorId
  const current = profiles[normalizedId] || profiles['1'] || DEFAULT_VENDOR_PROFILES['1']

  const updated: VendorProfile = {
    ...current,
    ...data,
    vendor_id: current.vendor_id,
  }

  profiles[normalizedId] = updated
  if (normalizedId === '1') {
    profiles['v_sargam'] = { ...updated, vendor_id: 'v_sargam' }
  }
  saveStoredVendorProfiles(profiles)
  return updated
}

/**
 * Normalizes vendor id comparison.
 */
export function isVendorMatch(idA: string | number, idB: string | number): boolean {
  const a = String(idA)
  const b = String(idB)
  if (a === b) return true
  if ((a === '1' || a === 'v_sargam') && (b === '1' || b === 'v_sargam')) return true
  return false
}

/**
 * Calculates paise-exact commission and net payout.
 */
export function calculatePayoutAmounts(
  gross: number,
  commissionRate: number
): { gross: number; commission: number; net: number } {
  const grossPaise = Math.round(gross * 100)
  const commissionPaise = Math.round(grossPaise * (commissionRate / 100))
  const netPaise = grossPaise - commissionPaise

  return {
    gross: grossPaise / 100,
    commission: commissionPaise / 100,
    net: netPaise / 100,
  }
}

// -------------------------------------------------------------
// SEED ADDITIONAL VENDOR ORDERS IN ACCOUNT STORE (90-DAY DEPTH)
// -------------------------------------------------------------

export function ensureVendorOrdersSeeded(): void {
  const accountState = loadAccountState()
  const today = new Date()

  // Check if additional vendor orders already exist
  const existingExtra = accountState.bookings.some((b: BookingDetail) => b.booking_id.startsWith('BK-V9'))
  if (existingExtra) return

  // Additional customers
  const extraCustomers = [
    { name: 'Diya Shah', phone: '9820112233', city: 'Bengaluru' },
    { name: 'Rohan Iyer', phone: '9845223344', city: 'Bengaluru' },
    { name: 'Meera Kapoor', phone: '9811334455', city: 'Mumbai' },
    { name: 'Kabir Singh', phone: '9876445566', city: 'Bengaluru' },
    { name: 'Ananya Rao', phone: '9900556677', city: 'Bengaluru' },
  ]

  const extraBookings: BookingDetail[] = []

  // Create 17 additional historical bookings (mostly completed/returned) for Vendor 1
  // to bring total vendor orders for Vendor 1 to ~24 across 90 days
  const events = [
    { title: 'Corporate Product Launch', daysDiff: -4, rentalDays: 2, status: 'completed' as const, amount: 22000 },
    { title: 'Alumni Reunion Gala', daysDiff: -8, rentalDays: 1, status: 'completed' as const, amount: 15000 },
    { title: 'Tech Summit Keynote Audio', daysDiff: -14, rentalDays: 3, status: 'completed' as const, amount: 36000 },
    { title: 'Autumn Live Acoustic Concert', daysDiff: -21, rentalDays: 2, status: 'completed' as const, amount: 28000 },
    { title: 'Fashion Showcase Runway', daysDiff: -28, rentalDays: 1, status: 'completed' as const, amount: 18500 },
    { title: 'Startup Pitch Festival', daysDiff: -35, rentalDays: 2, status: 'completed' as const, amount: 25000 },
    { title: 'University Cultural Night', daysDiff: -42, rentalDays: 2, status: 'completed' as const, amount: 31000 },
    { title: 'Private Anniversary Celebration', daysDiff: -49, rentalDays: 1, status: 'completed' as const, amount: 12000 },
    { title: 'Indie Band Album Showcase', daysDiff: -56, rentalDays: 2, status: 'completed' as const, amount: 26000 },
    { title: 'Community Sports Day Public Address', daysDiff: -63, rentalDays: 1, status: 'completed' as const, amount: 9500 },
    { title: 'Retail Mega Store Inauguration', daysDiff: -70, rentalDays: 2, status: 'completed' as const, amount: 21000 },
    { title: 'Monsoon Classical Music Soirée', daysDiff: -77, rentalDays: 2, status: 'completed' as const, amount: 27500 },
    { title: 'Quarterly Leadership Townhall', daysDiff: -84, rentalDays: 1, status: 'completed' as const, amount: 14000 },
    // A couple upcoming/ongoing/pending ones:
    { title: 'Diwali Sangeet Night', daysDiff: 2, rentalDays: 2, status: 'confirmed' as const, amount: 24000 },
    { title: 'Weekend Rooftop Mixer', daysDiff: 5, rentalDays: 1, status: 'pending' as const, amount: 16000 },
    { title: 'Winter Wedding Sangeet', daysDiff: 11, rentalDays: 3, status: 'pending' as const, amount: 32000 },
    { title: 'Art Gallery Opening Night', daysDiff: -2, rentalDays: 2, status: 'in_progress' as const, amount: 18000 },
  ]

  events.forEach((ev, idx) => {
    const cust = extraCustomers[idx % extraCustomers.length]
    const bNum = `BK-V9${String(idx + 1).padStart(2, '0')}`
    const voNum = `VO-V9${String(idx + 1).padStart(2, '0')}`
    const biNum = `BI-V9${String(idx + 1).padStart(2, '0')}`

    const startDate = format(addDays(today, ev.daysDiff), 'yyyy-MM-dd')
    const endDate = format(addDays(today, ev.daysDiff + ev.rentalDays - 1), 'yyyy-MM-dd')
    const createdAt = format(addDays(today, ev.daysDiff - 3), "yyyy-MM-dd'T'10:00:00'Z'")

    let voStatus: VendorOrderStatus = 'completed'
    if (ev.status === 'pending') voStatus = 'pending'
    else if (ev.status === 'confirmed') voStatus = 'accepted'
    else if (ev.status === 'in_progress') voStatus = 'dispatched'

    const newBooking: BookingDetail = {
      booking_id: bNum,
      event_name: ev.title,
      event_type: 'Other',
      status: ev.status,
      payment_status: ev.status === 'pending' ? 'unpaid' : 'paid',
      start_date: startDate,
      end_date: endDate,
      rental_days: ev.rentalDays,
      delivery_city: cust.city,
      vendor_count: 1,
      item_count: 1,
      vendor_avatars: [{ id: 'v_sargam', name: 'Sargam Sound Systems', initials: 'SS' }],
      total_amount: Math.round(ev.amount * 1.3),
      action_needed: ev.status === 'pending' ? ['Vendor approval pending'] : [],
      created_at: createdAt,
      delivery_address: {
        name: cust.name,
        line1: '12 Green Park Avenue',
        city: cust.city,
        state: cust.city === 'Mumbai' ? 'Maharashtra' : 'Karnataka',
        pincode: cust.city === 'Mumbai' ? '400001' : '560025',
        country: 'India',
      },
      price_summary: {
        subtotal: ev.amount,
        discount: 0,
        tax: Math.round(ev.amount * 0.18),
        delivery_fee: 600,
        security_deposit: Math.round(ev.amount * 0.5),
        total: Math.round(ev.amount * 1.3),
      },
      deposit: {
        held: Math.round(ev.amount * 0.5),
        deducted: 0,
        refunded: ev.status === 'completed' ? Math.round(ev.amount * 0.5) : 0,
        pending_refund: ev.status === 'completed' ? 0 : Math.round(ev.amount * 0.5),
      },
      payments: [
        {
          payment_id: `PAY-${bNum}-1`,
          booking_id: bNum,
          event_name: ev.title,
          type: 'full',
          method: 'upi',
          amount: Math.round(ev.amount * 1.3),
          status: ev.status === 'pending' ? 'pending' : 'success',
          created_at: createdAt,
          reference: `UPI-${bNum}`,
        },
      ],
      vendor_orders: [
        {
          vendor_order_id: voNum,
          vendor_id: 'v_sargam',
          vendor_name: 'Sargam Sound Systems',
          vendor_initials: 'SS',
          status: voStatus,
          subtotal: ev.amount,
          item_ids: [biNum],
          delivery: {
            type: 'delivery',
            status: ev.status === 'completed' ? 'delivered' : 'scheduled',
            scheduled_window: 'Between 10:00 AM – 12:00 PM',
            updated_at: createdAt,
          },
        },
      ],
      items: [
        {
          item_id: biNum,
          equipment_id: '1',
          name: 'Pro Line-Array Speaker Pair',
          image_url: '/images/equipment/line-array-speaker.svg',
          unit_price: 2500,
          quantity: Math.max(1, Math.floor(ev.amount / (2500 * ev.rentalDays))),
          days: ev.rentalDays,
          total_price: ev.amount,
          status: ev.status === 'completed' ? 'returned' : 'confirmed',
          vendor_id: 'v_sargam',
          vendor_name: 'Sargam Sound Systems',
          review:
            ev.status === 'completed'
              ? {
                  review_id: `rev-${bNum}`,
                  booking_id: bNum,
                  equipment_id: '1',
                  equipment_name: 'Pro Line-Array Speaker Pair',
                  rating: (idx % 2 === 0 ? 5 : 4) as 1 | 2 | 3 | 4 | 5,
                  comment:
                    idx % 3 === 0
                      ? 'Incredible acoustic presence and punchy sound for our guests. Sargam Sound Systems was top notch.'
                      : 'Great equipment, very well-maintained with clear cable tags.',
                  vendor_reply:
                    idx % 4 === 0
                      ? 'Thank you so much! Always a pleasure supporting your events.'
                      : null,
                  created_at: format(addDays(today, ev.daysDiff + ev.rentalDays + 1), 'yyyy-MM-dd'),
                }
              : null,
          damage_report: null,
        },
      ],
      activity: [
        {
          id: `ACT-${bNum}-1`,
          title: 'Booking Placed',
          description: 'Payment authorized.',
          timestamp: createdAt,
          type: 'order',
        },
      ],
    }

    extraBookings.push(newBooking)
  })

  accountState.bookings.push(...extraBookings)
  saveAccountState(accountState)
}

// -------------------------------------------------------------
// VENDOR OVERVIEW SELECTOR
// -------------------------------------------------------------

export function getVendorOverview(range: OverviewRange = '30d', vendorId = '1'): VendorOverview {
  ensureVendorOrdersSeeded()
  const accountState = loadAccountState()
  const profile = getVendorProfile(vendorId)
  const allEquipment = getAllStoredEquipment()
  const today = new Date()

  // Determine range boundary in days
  let rangeDays = 30
  if (range === '7d') rangeDays = 7
  else if (range === '90d') rangeDays = 90
  else if (range === 'ytd') {
    const startOfYear = new Date(today.getFullYear(), 0, 1)
    rangeDays = Math.max(1, Math.floor((today.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)))
  }

  const rangeStart = subDays(today, rangeDays)
  const prevRangeStart = subDays(rangeStart, rangeDays)

  // Extract all vendor orders matching this vendor
  interface FlattenedVendorOrder {
    booking: BookingDetail
    order: VendorOrder
    createdAt: Date
    completedAt?: Date
  }

  const vendorOrders: FlattenedVendorOrder[] = []

  accountState.bookings.forEach((booking: BookingDetail) => {
    booking.vendor_orders.forEach((vo: VendorOrder) => {
      if (isVendorMatch(vo.vendor_id, vendorId)) {
        vendorOrders.push({
          booking,
          order: vo,
          createdAt: new Date(booking.created_at),
          completedAt: vo.status === 'completed' ? new Date(booking.end_date) : undefined,
        })
      }
    })
  })

  // Filter for current range and previous range for delta computation
  const currentCompleted = vendorOrders.filter((vo) => {
    if (vo.order.status !== 'completed') return false
    const date = vo.completedAt || vo.createdAt
    return date >= rangeStart && date <= today
  })

  const prevCompleted = vendorOrders.filter((vo) => {
    if (vo.order.status !== 'completed') return false
    const date = vo.completedAt || vo.createdAt
    return date >= prevRangeStart && date < rangeStart
  })

  const currentGross = currentCompleted.reduce((sum, vo) => sum + vo.order.subtotal, 0)
  const prevGross = prevCompleted.reduce((sum, vo) => sum + vo.order.subtotal, 0)

  const currentPayouts = calculatePayoutAmounts(currentGross, profile.commission_rate)
  const prevPayouts = calculatePayoutAmounts(prevGross, profile.commission_rate)

  const earningsDeltaPercent =
    prevPayouts.net > 0
      ? ((currentPayouts.net - prevPayouts.net) / prevPayouts.net) * 100
      : currentPayouts.net > 0
      ? 100
      : 0

  const pendingCount = vendorOrders.filter((vo) => vo.order.status === 'pending').length
  const activeCount = vendorOrders.filter((vo) =>
    ['accepted', 'dispatched', 'delivered'].includes(vo.order.status)
  ).length
  const completedCount = vendorOrders.filter((vo) => vo.order.status === 'completed').length

  const vendorEquipList = allEquipment.filter((eq) => isVendorMatch(eq.vendor_id, vendorId))
  const activeEquipCount = vendorEquipList.filter((eq) => eq.status === 'active').length

  // Calculate review stats for this vendor
  let totalRatingSum = 0
  let totalReviews = 0
  vendorEquipList.forEach((eq) => {
    totalRatingSum += eq.avg_rating * eq.review_count
    totalReviews += eq.review_count
  })
  const avgRating = totalReviews > 0 ? Number((totalRatingSum / totalReviews).toFixed(1)) : 4.8

  const kpis: VendorKpis = {
    net_earnings: currentPayouts.net,
    net_earnings_delta: `${earningsDeltaPercent >= 0 ? '+' : ''}${earningsDeltaPercent.toFixed(1)}%`,
    net_earnings_delta_percent: earningsDeltaPercent,
    pending_orders: pendingCount,
    active_orders: activeCount,
    active_orders_today: activeCount,
    active_orders_delta: `${activeCount} today`,
    completed_orders: completedCount,
    completed_orders_delta: `+${completedCount > 0 ? '8.4%' : '0%'}`,
    completed_orders_delta_percent: completedCount > 0 ? 8.4 : 0,
    equipment_listed: activeEquipCount,
    avg_rating: avgRating,
    rating: avgRating,
    review_count: totalReviews || 128,
  }

  // Generate earnings series according to range
  const earnings_series: EarningsDataPoint[] = []

  if (range === '7d') {
    for (let i = 6; i >= 0; i--) {
      const d = subDays(today, i)
      const dStr = format(d, 'yyyy-MM-dd')
      const dayOrders = currentCompleted.filter(
        (vo) => format(vo.completedAt || vo.createdAt, 'yyyy-MM-dd') === dStr
      )
      const dayGross = dayOrders.reduce((sum, vo) => sum + vo.order.subtotal, 0)
      const dayCalc = calculatePayoutAmounts(dayGross, profile.commission_rate)

      earnings_series.push({
        date: dStr,
        label: format(d, 'd MMM'),
        gross: dayCalc.gross,
        commission: dayCalc.commission,
        net: dayCalc.net,
        amount: dayCalc.net,
      })
    }
  } else if (range === '30d') {
    // 10 3-day buckets
    for (let i = 9; i >= 0; i--) {
      const start = subDays(today, (i + 1) * 3)
      const end = subDays(today, i * 3)
      const bucketOrders = currentCompleted.filter((vo) => {
        const d = vo.completedAt || vo.createdAt
        return d > start && d <= end
      })
      const bGross = bucketOrders.reduce((sum, vo) => sum + vo.order.subtotal, 0)
      const bCalc = calculatePayoutAmounts(bGross, profile.commission_rate)

      earnings_series.push({
        date: format(end, 'yyyy-MM-dd'),
        label: format(end, 'd MMM'),
        gross: bCalc.gross,
        commission: bCalc.commission,
        net: bCalc.net,
        amount: bCalc.net,
      })
    }
  } else if (range === '90d') {
    // 12 weekly buckets
    for (let i = 11; i >= 0; i--) {
      const start = subDays(today, (i + 1) * 7)
      const end = subDays(today, i * 7)
      const weekOrders = currentCompleted.filter((vo) => {
        const d = vo.completedAt || vo.createdAt
        return d > start && d <= end
      })
      const wGross = weekOrders.reduce((sum, vo) => sum + vo.order.subtotal, 0)
      const wCalc = calculatePayoutAmounts(wGross, profile.commission_rate)

      earnings_series.push({
        date: format(end, 'yyyy-MM-dd'),
        label: `W${12 - i}`,
        gross: wCalc.gross,
        commission: wCalc.commission,
        net: wCalc.net,
        amount: wCalc.net,
      })
    }
  } else {
    // YTD monthly buckets
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct']
    months.forEach((m, idx) => {
      const mOrders = currentCompleted.filter((vo) => (vo.completedAt || vo.createdAt).getMonth() === idx)
      const mGross = mOrders.reduce((sum, vo) => sum + vo.order.subtotal, 0)
      const mCalc = calculatePayoutAmounts(mGross, profile.commission_rate)

      earnings_series.push({
        date: `2026-${String(idx + 1).padStart(2, '0')}-01`,
        label: m,
        gross: mCalc.gross,
        commission: mCalc.commission,
        net: mCalc.net,
        amount: mCalc.net,
      })
    })
  }

  // Attention items
  const attention_items: AttentionItem[] = []
  if (pendingCount > 0) {
    attention_items.push({
      id: 'att-pending',
      type: 'order',
      title: `${pendingCount} new order${pendingCount > 1 ? 's' : ''} to respond to`,
      href: '/vendor/orders?status=pending',
      count: pendingCount,
    })
  }

  // Reviews needing reply
  const unrepliedReviews = accountState.bookings.flatMap((b: BookingDetail) =>
    b.items
      .filter((i: BookingItemDetail) => isVendorMatch(i.vendor_id, vendorId) && i.review && !i.review.vendor_reply)
      .map((i: BookingItemDetail) => i.review!)
  )
  if (unrepliedReviews.length > 0) {
    attention_items.push({
      id: 'att-reviews',
      type: 'review',
      title: `${unrepliedReviews.length} review${unrepliedReviews.length > 1 ? 's' : ''} needing a reply`,
      href: '/vendor?tab=reviews&reply=needs',
      count: unrepliedReviews.length,
    })
  }

  // Low stock
  const lowStockCount = vendorEquipList.filter(
    (eq) => eq.quantity > 0 && eq.quantity <= 2 && eq.status !== 'archived'
  ).length
  if (lowStockCount > 0) {
    attention_items.push({
      id: 'att-stock',
      type: 'stock',
      title: `${lowStockCount} equipment item${lowStockCount > 1 ? 's' : ''} low on stock`,
      href: '/vendor/inventory?stock=low',
      count: lowStockCount,
    })
  }

  // Recent 5 orders
  const sortedOrders = [...vendorOrders].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  const recent_orders: VendorRecentOrder[] = sortedOrders.slice(0, 5).map((vo) => {
    const custName = vo.booking.delivery_address.name
    const parts = custName.split(' ')
    const initials = parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : custName.slice(0, 2).toUpperCase()
    const firstLastInitial = parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : custName

    const itemNames = vo.booking.items
      .filter((i) => isVendorMatch(i.vendor_id, vendorId))
      .map((i) => i.name)
      .join(', ')

    return {
      order_id: vo.order.vendor_order_id,
      order_number: vo.order.vendor_order_id,
      booking_id: vo.booking.booking_id,
      customer_name: firstLastInitial,
      customer_initials: initials,
      items_summary: itemNames || 'Sound Equipment',
      start_date: vo.booking.start_date,
      end_date: vo.booking.end_date,
      rental_days: vo.booking.rental_days,
      total_days: vo.booking.rental_days,
      status: vo.order.status,
      amount: vo.order.subtotal,
    }
  })

  // Top equipment
  const top_equipment: TopEquipmentItem[] = vendorEquipList.slice(0, 5).map((eq, i) => ({
    id: eq.equipment_id,
    equipment_id: eq.equipment_id,
    name: eq.name,
    category: eq.category_name,
    image: eq.primary_image_url,
    rental_count: 14 - i * 2,
    rentals_count: 14 - i * 2,
    avg_rating: eq.avg_rating || 4.8,
    rating: eq.avg_rating || 4.8,
    total_revenue: eq.price_per_day * (14 - i * 2) * 2,
    earnings: eq.price_per_day * (14 - i * 2) * 2,
  }))

  // Schedule next 7 days
  const schedule: ScheduleDayGroup[] = [
    {
      date: format(today, 'yyyy-MM-dd'),
      day_label: 'Today',
      events: [
        {
          id: 'ev-1',
          type: 'delivery',
          time: '10:00 AM – 12:00 PM',
          customer_name: 'Ananya Rao',
          equipment_name: 'Pro Line-Array Speaker Pair',
          location: 'Indiranagar, Bengaluru',
          order_id: 'VO-V914',
        },
      ],
    },
    {
      date: format(addDays(today, 1), 'yyyy-MM-dd'),
      day_label: 'Tomorrow',
      events: [
        {
          id: 'ev-2',
          type: 'pickup',
          time: '02:00 PM – 04:00 PM',
          customer_name: 'Rohan Iyer',
          equipment_name: 'Compact PA Speaker (Single)',
          location: 'Koramangala, Bengaluru',
          order_id: 'VO-V915',
        },
      ],
    },
    {
      date: format(addDays(today, 3), 'yyyy-MM-dd'),
      day_label: 'In 3 days',
      events: [
        {
          id: 'ev-3',
          type: 'return',
          time: '11:00 AM',
          customer_name: 'Meera Kapoor',
          equipment_name: 'Pro Line-Array Speaker Pair',
          location: 'Whitefield, Bengaluru',
          order_id: 'VO-V916',
        },
      ],
    },
  ]

  const attention = {
    new_orders_waiting: pendingCount,
    returns_awaiting_inspection: 0,
    disputed_damage_reports: 0,
    reviews_needing_reply: 1,
    low_stock_items: lowStockCount,
  }

  return {
    range,
    kpis,
    earnings_series,
    attention_items,
    attention,
    recent_orders,
    top_equipment,
    schedule,
  }
}

// -------------------------------------------------------------
// VENDOR PAYOUTS SELECTOR
// -------------------------------------------------------------

export function getVendorPayouts(
  filters: {
    status?: string
    range?: string
    page?: number
    pageSize?: number
  } = {},
  vendorId = '1'
): VendorPayoutsResult {
  ensureVendorOrdersSeeded()
  const accountState = loadAccountState()
  const profile = getVendorProfile(vendorId)

  const payouts: VendorPayout[] = []

  accountState.bookings.forEach((booking: BookingDetail) => {
    booking.vendor_orders.forEach((vo: VendorOrder) => {
      if (!isVendorMatch(vo.vendor_id, vendorId)) return

      // Completed orders generate payouts
      if (vo.status !== 'completed' && vo.status !== 'delivered' && vo.status !== 'accepted') return

      let payoutStatus: PayoutStatus = 'paid'
      const daysDiff = Math.floor(
        (Date.now() - new Date(booking.end_date).getTime()) / (1000 * 60 * 60 * 24)
      )

      if (daysDiff < 2) {
        payoutStatus = 'pending'
      } else if (daysDiff < 7) {
        payoutStatus = 'processing'
      }

      const amounts = calculatePayoutAmounts(vo.subtotal, profile.commission_rate)

      const itemsStr = booking.items
        .filter((i: BookingItemDetail) => isVendorMatch(i.vendor_id, vendorId))
        .map((i: BookingItemDetail) => i.name)
        .join(', ')

      const pId = `PO-${vo.vendor_order_id.replace('VO-', '')}`

      const payoutLineItems = booking.items
        .filter((i: BookingItemDetail) => isVendorMatch(i.vendor_id, vendorId))
        .map((i: BookingItemDetail) => ({
          equipment_name: i.name,
          quantity: i.quantity,
          daily_rate: i.unit_price,
          days: i.days || booking.rental_days,
          subtotal: i.total_price,
        }))

      payouts.push({
        payout_id: pId,
        order_id: vo.vendor_order_id,
        order_number: vo.vendor_order_id,
        booking_id: booking.booking_id,
        customer_name: booking.delivery_address.name,
        items_summary: itemsStr,
        rental_dates: `${booking.start_date} – ${booking.end_date}`,
        gross: amounts.gross,
        gross_amount: amounts.gross,
        commission_rate: profile.commission_rate,
        commission_amount: amounts.commission,
        net: amounts.net,
        net_amount: amounts.net,
        status: payoutStatus,
        paid_at: payoutStatus === 'paid' ? addDays(new Date(booking.end_date), 3).toISOString() : null,
        created_at: booking.end_date,
        items: payoutLineItems,
        timeline: [
          { status: 'pending', timestamp: booking.end_date, note: 'Order completed, payout queued' },
          ...(payoutStatus === 'processing' || payoutStatus === 'paid'
            ? [
                {
                  status: 'processing' as const,
                  timestamp: addDays(new Date(booking.end_date), 1).toISOString(),
                  note: 'Transferred to automated settlement batch',
                },
              ]
            : []),
          ...(payoutStatus === 'paid'
            ? [
                {
                  status: 'paid' as const,
                  timestamp: addDays(new Date(booking.end_date), 3).toISOString(),
                  note: 'Direct deposit transferred to registered vendor bank account',
                },
              ]
            : []),
        ],
      })
    })
  })

  // Sort newest first
  payouts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  // Tiles calculation
  const totalEarnedNet = payouts.reduce((sum, p) => sum + p.net, 0)
  const pendingTotal = payouts.filter((p) => p.status === 'pending').reduce((sum, p) => sum + p.net, 0)
  const processingTotal = payouts
    .filter((p) => p.status === 'processing')
    .reduce((sum, p) => sum + p.net, 0)
  const paidOutTotal = payouts.filter((p) => p.status === 'paid').reduce((sum, p) => sum + p.net, 0)

  let filtered = payouts
  if (filters.status && filters.status !== 'all') {
    filtered = filtered.filter((p) => p.status === filters.status)
  }

  const page = Math.max(1, filters.page || 1)
  const pageSize = filters.pageSize || 10
  const start = (page - 1) * pageSize
  const paginated = filtered.slice(start, start + pageSize)

  return {
    payouts: paginated,
    items: paginated,
    total: filtered.length,
    total_count: filtered.length,
    page,
    pageSize,
    tiles: {
      total_earned_net: totalEarnedNet,
      pending: pendingTotal,
      processing: processingTotal,
      paid_out: paidOutTotal,
      commission_rate: profile.commission_rate,
    },
    commission_rate: profile.commission_rate,
  }
}

export function getVendorPayoutById(payoutId: string, vendorId = '1'): VendorPayout | null {
  const result = getVendorPayouts({ pageSize: 100 }, vendorId)
  return result.items.find((p) => p.payout_id === payoutId) || null
}

// -------------------------------------------------------------
// VENDOR REVIEWS SELECTOR & REPLY ACTION
// -------------------------------------------------------------

export function getVendorReviews(
  filters: {
    rating?: number
    reply?: 'all' | 'needs'
    equipment?: string
    sort?: 'newest' | 'highest' | 'lowest'
    page?: number
    pageSize?: number
  } = {},
  vendorId = '1'
): VendorReviewsResult {
  ensureVendorOrdersSeeded()
  const accountState = loadAccountState()
  const allEquipment = getAllStoredEquipment()

  const reviews: VendorReview[] = []

  accountState.bookings.forEach((booking: BookingDetail) => {
    booking.items.forEach((item: BookingItemDetail) => {
      if (!isVendorMatch(item.vendor_id, vendorId)) return
      if (!item.review) return

      const eq = allEquipment.find((e) => e.equipment_id === item.equipment_id)

      reviews.push({
        review_id: item.review.review_id,
        equipment_id: item.equipment_id,
        equipment_name: item.name,
        equipment_category: eq?.category_name || 'Sound',
        equipment_image: item.image_url,
        user_name: booking.delivery_address.name,
        customer_name: booking.delivery_address.name,
        rating: item.review.rating,
        comment: item.review.comment,
        review_date: item.review.created_at,
        created_at: item.review.created_at,
        verified_rental: true,
        vendor_reply: item.review.vendor_reply || null,
        replied_at: item.review.vendor_reply ? '2026-10-18T12:00:00Z' : null,
      })
    })
  })

  const distribution: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  let sum = 0
  let repliedCount = 0

  reviews.forEach((r) => {
    const star = Math.min(5, Math.max(1, Math.round(r.rating))) as 1 | 2 | 3 | 4 | 5
    distribution[star] += 1
    sum += r.rating
    if (r.vendor_reply) repliedCount += 1
  })

  const avg = reviews.length > 0 ? Number((sum / reviews.length).toFixed(1)) : 4.8

  let filtered = reviews
  if (filters.rating && filters.rating >= 1 && filters.rating <= 5) {
    filtered = filtered.filter((r) => Math.round(r.rating) === filters.rating)
  }

  if (filters.reply === 'needs') {
    filtered = filtered.filter((r) => !r.vendor_reply)
  }

  if (filters.equipment && filters.equipment !== 'all') {
    filtered = filtered.filter((r) => r.equipment_id === filters.equipment)
  }

  const sort = filters.sort || 'newest'
  filtered.sort((a, b) => {
    if (sort === 'highest') return b.rating - a.rating
    if (sort === 'lowest') return a.rating - b.rating
    return new Date(b.review_date).getTime() - new Date(a.review_date).getTime()
  })

  const page = Math.max(1, filters.page || 1)
  const pageSize = filters.pageSize || 5
  const start = (page - 1) * pageSize
  const paginated = filtered.slice(start, start + pageSize)

  return {
    reviews: paginated,
    items: paginated,
    total: filtered.length,
    total_count: filtered.length,
    page,
    pageSize,
    summary: {
      avg,
      average_rating: avg,
      count: reviews.length,
      total_reviews: reviews.length,
      distribution,
      replied_count: repliedCount,
      needs_reply_count: reviews.length - repliedCount,
    },
  }
}

export function replyToVendorReview(reviewId: string, replyText: string): void {
  const accountState = loadAccountState()
  let modified = false

  accountState.bookings.forEach((booking: BookingDetail) => {
    booking.items.forEach((item: BookingItemDetail) => {
      if (item.review && item.review.review_id === reviewId) {
        item.review.vendor_reply = replyText.trim()
        modified = true
      }
    })
  })

  if (modified) {
    saveAccountState(accountState)
  }
}

// -------------------------------------------------------------
// VENDOR CONVERSATIONS & NOTIFICATIONS SELECTOR
// -------------------------------------------------------------

export function getVendorConversations(vendorId = '1'): Conversation[] {
  const accountState = loadAccountState()
  return accountState.conversations.filter((c: Conversation) => isVendorMatch(c.vendor_id, vendorId))
}

export function getVendorNotifications(_vendorId = '1'): AppNotification[] {
  const accountState = loadAccountState()
  // Notifications relevant for vendor
  const vendorTypes = [
    'order_accepted',
    'booking_confirmed',
    'payment_received',
    'return_scheduled',
    'return_inspected',
    'damage_report_filed',
  ]
  return accountState.notifications.filter((n: AppNotification) => vendorTypes.includes(n.type))
}
