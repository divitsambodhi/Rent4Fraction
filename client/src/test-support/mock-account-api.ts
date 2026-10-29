import {
  loadAccountState,
  saveAccountState,
} from './account-store'
import { getStoredEquipmentState, saveStoredEquipmentState } from './equipment-store'
import { MOCK_EQUIPMENT } from './mock-data'
import { computeMockAvailability } from '@/lib/api'
import type {
  AccountBadges,
  Address,
  AppNotification,
  BookingDetail,
  BookingSummary,
  Conversation,
  Message,
  MyReview,
  PaymentRecord,
  PaymentSummaryTilesData,
  ReviewToWrite,
} from '@/types/account'
import type { EquipmentListingWithAvailability } from '@/lib/api'

const delay = (ms = 120) => new Promise((resolve) => setTimeout(resolve, ms))

function checkSimulate(): string | null {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search)
    return params.get('simulate')
  }
  return null
}

// -------------------------------------------------------------
// 1. BOOKINGS API
// -------------------------------------------------------------

export interface GetBookingsParams {
  status?: string
  q?: string
  page?: number
  pageSize?: number
}

export interface GetBookingsResult {
  items: BookingSummary[]
  total: number
  page: number
  pageSize: number
  counts: {
    all: number
    upcoming: number
    ongoing: number
    completed: number
    cancelled: number
  }
}

export async function getMyBookings(
  params: GetBookingsParams = {}
): Promise<GetBookingsResult> {
  await delay(100)
  const sim = checkSimulate()
  if (sim === 'error') {
    throw new Error('Failed to load bookings. Simulated error active (?simulate=error).')
  }
  if (sim === 'empty') {
    return {
      items: [],
      total: 0,
      page: 1,
      pageSize: 6,
      counts: { all: 0, upcoming: 0, ongoing: 0, completed: 0, cancelled: 0 },
    }
  }

  const state = loadAccountState()
  const allBookings = state.bookings

  const counts = {
    all: allBookings.length,
    upcoming: allBookings.filter((b) => b.status === 'pending' || b.status === 'confirmed')
      .length,
    ongoing: allBookings.filter((b) => b.status === 'in_progress').length,
    completed: allBookings.filter((b) => b.status === 'completed').length,
    cancelled: allBookings.filter((b) => b.status === 'cancelled').length,
  }

  let filtered = [...allBookings]

  // Status Filter
  const statusFilter = params.status || 'all'
  if (statusFilter === 'upcoming') {
    filtered = filtered.filter((b) => b.status === 'pending' || b.status === 'confirmed')
  } else if (statusFilter === 'ongoing') {
    filtered = filtered.filter((b) => b.status === 'in_progress')
  } else if (statusFilter === 'completed') {
    filtered = filtered.filter((b) => b.status === 'completed')
  } else if (statusFilter === 'cancelled') {
    filtered = filtered.filter((b) => b.status === 'cancelled')
  }

  // Search Filter
  if (params.q?.trim()) {
    const query = params.q.trim().toLowerCase()
    filtered = filtered.filter(
      (b) =>
        b.booking_id.toLowerCase().includes(query) ||
        b.event_name.toLowerCase().includes(query) ||
        b.event_type.toLowerCase().includes(query) ||
        b.delivery_city.toLowerCase().includes(query) ||
        b.vendor_avatars.some((v) => v.name.toLowerCase().includes(query))
    )
  }

  const total = filtered.length
  const page = Math.max(1, params.page || 1)
  const pageSize = params.pageSize || 6
  const start = (page - 1) * pageSize
  const paged = filtered.slice(start, start + pageSize)

  const items: BookingSummary[] = paged.map((b) => ({
    booking_id: b.booking_id,
    event_name: b.event_name,
    event_type: b.event_type,
    status: b.status,
    payment_status: b.payment_status,
    start_date: b.start_date,
    end_date: b.end_date,
    rental_days: b.rental_days,
    delivery_city: b.delivery_city,
    vendor_count: b.vendor_count,
    item_count: b.item_count,
    vendor_avatars: b.vendor_avatars,
    total_amount: b.total_amount,
    action_needed: b.action_needed,
    created_at: b.created_at,
  }))

  return {
    items,
    total,
    page,
    pageSize,
    counts,
  }
}

export async function getBookingDetail(bookingId: string): Promise<BookingDetail | null> {
  await delay(120)
  const sim = checkSimulate()
  if (sim === 'error') {
    throw new Error(`Failed to load booking ${bookingId}. Simulated error active.`)
  }

  const state = loadAccountState()
  const found = state.bookings.find((b) => b.booking_id.toUpperCase() === bookingId.toUpperCase())
  return found ? JSON.parse(JSON.stringify(found)) : null
}

export const getBookingById = getBookingDetail

export async function cancelBooking(bookingId: string, reason?: string): Promise<BookingDetail> {
  await delay(200)
  const state = loadAccountState()
  const booking = state.bookings.find(
    (b) => b.booking_id.toUpperCase() === bookingId.toUpperCase()
  )

  if (!booking) {
    throw new Error(`Booking ${bookingId} not found.`)
  }

  if (booking.status !== 'pending' && booking.status !== 'confirmed') {
    throw new Error('Only pending or confirmed bookings can be cancelled.')
  }

  booking.status = 'cancelled'
  booking.payment_status = 'refunded'
  booking.action_needed = []

  // Cancel vendor orders
  booking.vendor_orders.forEach((vo) => {
    vo.status = 'cancelled'
  })
  booking.items.forEach((item) => {
    item.status = 'cancelled'
  })

  // Full refund of deposit and paid amounts
  booking.deposit.refunded = booking.deposit.held
  booking.deposit.pending_refund = 0

  booking.activity.unshift({
    id: `ACT-${booking.booking_id}-${Date.now()}`,
    title: 'Booking Cancelled by Customer',
    description: reason ? `Reason: ${reason}` : 'Booking cancelled by customer.',
    timestamp: new Date().toISOString(),
    type: 'order',
  })

  // Record refund notification
  state.notifications.unshift({
    id: `notif_${Date.now()}`,
    type: 'refund_processed',
    title: 'Booking Cancelled & Refund Initiated',
    message: `Booking ${booking.booking_id} has been cancelled. Any eligible refunds have been initiated.`,
    created_at: new Date().toISOString(),
    read: false,
    target: { tab: 'bookings', booking_id: booking.booking_id },
  })

  saveAccountState(state)
  return JSON.parse(JSON.stringify(booking))
}

export async function respondToDamageReport(
  bookingId: string,
  reportId: string,
  action: 'accept' | 'dispute',
  disputeReason?: string
): Promise<BookingDetail> {
  await delay(250)
  const state = loadAccountState()
  const booking = state.bookings.find(
    (b) => b.booking_id.toUpperCase() === bookingId.toUpperCase()
  )

  if (!booking) throw new Error(`Booking ${bookingId} not found.`)

  let matchedReport = false
  for (const item of booking.items) {
    if (item.damage_report && item.damage_report.report_id === reportId) {
      matchedReport = true
      if (action === 'accept') {
        item.damage_report.status = 'resolved'
        item.damage_report.resolved_at = new Date().toISOString()
        booking.deposit.deducted = item.damage_report.deducted_from_deposit
        booking.deposit.pending_refund = Math.max(
          0,
          booking.deposit.held - booking.deposit.deducted - booking.deposit.refunded
        )
        // Remove 'Respond to damage report' from action_needed
        booking.action_needed = booking.action_needed.filter(
          (a) => a !== 'Respond to damage report'
        )

        booking.activity.unshift({
          id: `ACT-${Date.now()}`,
          title: 'Damage Charge Accepted',
          description: `₹${item.damage_report.deducted_from_deposit} deducted from security deposit.`,
          timestamp: new Date().toISOString(),
          type: 'inspection',
        })
      } else {
        item.damage_report.status = 'disputed'
        item.damage_report.dispute_reason = disputeReason?.trim()
        booking.action_needed = booking.action_needed.filter(
          (a) => a !== 'Respond to damage report'
        )

        booking.activity.unshift({
          id: `ACT-${Date.now()}`,
          title: 'Damage Claim Disputed',
          description: 'Your dispute is under review by our team.',
          timestamp: new Date().toISOString(),
          type: 'inspection',
        })
      }
      break
    }
  }

  if (!matchedReport) {
    throw new Error(`Damage report ${reportId} not found on booking ${bookingId}.`)
  }

  saveAccountState(state)
  return JSON.parse(JSON.stringify(booking))
}

export async function submitReview(
  bookingId: string,
  equipmentId: string,
  rating: number,
  comment: string = ''
): Promise<BookingDetail> {
  await delay(300)
  const state = loadAccountState()
  const booking = state.bookings.find(
    (b) => b.booking_id.toUpperCase() === bookingId.toUpperCase()
  )

  if (!booking) throw new Error(`Booking ${bookingId} not found.`)

  const item = booking.items.find(
    (i) => i.equipment_id === equipmentId || i.name.toLowerCase() === equipmentId.toLowerCase()
  )

  if (!item) {
    throw new Error(`Item ${equipmentId} not found in booking ${bookingId}.`)
  }

  if (item.status !== 'returned') {
    throw new Error('Only returned equipment can be reviewed.')
  }

  if (item.review) {
    throw new Error('This item has already been reviewed.')
  }

  if (!rating || rating < 1 || rating > 5) {
    throw new Error('Please select a star rating between 1 and 5.')
  }

  const newReview = {
    review_id: `REV-${Date.now()}`,
    booking_id: booking.booking_id,
    equipment_id: item.equipment_id,
    equipment_name: item.name,
    rating,
    comment: comment.trim(),
    created_at: new Date().toISOString(),
  }

  item.review = newReview

  // Check if all reviewable items are reviewed
  const reviewPending = booking.items.some(
    (it) => it.status === 'returned' && it.review === null
  )
  if (!reviewPending) {
    booking.action_needed = booking.action_needed.filter((a) => a !== 'Review pending')
  }

  booking.activity.unshift({
    id: `ACT-${Date.now()}`,
    title: 'Customer Review Submitted',
    description: `${rating}-star review left for ${item.name}.`,
    timestamp: new Date().toISOString(),
    type: 'system',
  })

  // Fan out vendor notification so it appears in vendor Reviews tab as needing reply
  state.notifications.unshift({
    id: `NOTIF-REV-${Date.now()}`,
    type: 'review_reminder',
    title: `New review on ${item.name}`,
    message: `${rating} star review received from customer. Reply needed.`,
    target: {
      tab: 'reviews',
      booking_id: booking.booking_id,
    },
    read: false,
    created_at: new Date().toISOString(),
  })

  // Recalculate equipment rating and review count across all bookings
  const eqState = getStoredEquipmentState()
  const eqIndex = eqState.items.findIndex((e) => e.equipment_id === item.equipment_id)
  if (eqIndex !== -1) {
    let sum = 0
    let count = 0
    state.bookings.forEach((b) => {
      b.items.forEach((it) => {
        if (it.equipment_id === item.equipment_id && it.review) {
          sum += it.review.rating
          count++
        }
      })
    })
    const newAvg = count > 0 ? Number((sum / count).toFixed(1)) : 4.8
    eqState.items[eqIndex].avg_rating = newAvg
    eqState.items[eqIndex].rating = newAvg
    eqState.items[eqIndex].review_count = count
    eqState.items[eqIndex].reviews = count
    saveStoredEquipmentState(eqState)
  }

  saveAccountState(state)
  return JSON.parse(JSON.stringify(booking))
}

export async function replyToReview(reviewId: string, replyText: string): Promise<void> {
  const state = loadAccountState()
  let found = false
  state.bookings.forEach((b) => {
    b.items.forEach((it) => {
      if (it.review && it.review.review_id === reviewId) {
        it.review.vendor_reply = replyText
        found = true
      }
    })
  })
  if (found) {
    saveAccountState(state)
  }
}

// -------------------------------------------------------------
// 2. INBOX & MESSAGING API
// -------------------------------------------------------------

export async function getConversations(q?: string): Promise<Conversation[]> {
  await delay(100)
  const sim = checkSimulate()
  if (sim === 'error') throw new Error('Failed to load conversations.')
  if (sim === 'empty') return []

  const state = loadAccountState()
  let list = state.conversations

  if (q?.trim()) {
    const query = q.trim().toLowerCase()
    list = list.filter(
      (c) =>
        c.vendor_name.toLowerCase().includes(query) ||
        c.equipment_name.toLowerCase().includes(query) ||
        c.last_message.toLowerCase().includes(query)
    )
  }

  return JSON.parse(JSON.stringify(list))
}

export async function getMessages(conversationId: string): Promise<Message[]> {
  await delay(80)
  const state = loadAccountState()

  // Mark conversation read
  const conv = state.conversations.find((c) => c.conversation_id === conversationId)
  if (conv && conv.unread_count > 0) {
    conv.unread_count = 0
    // Mark associated notifications read as well
    state.notifications.forEach((n) => {
      if (n.target.thread_id === conversationId) {
        n.read = true
      }
    })
    saveAccountState(state)
  }

  const msgs = state.messages.filter((m) => m.conversation_id === conversationId)
  return JSON.parse(JSON.stringify(msgs))
}

export interface SendMessageInput {
  conversationId?: string
  vendorId?: string
  vendorName?: string
  equipmentId?: string
  equipmentName?: string
  equipmentImage?: string
  text: string
}

export async function sendMessage(input: SendMessageInput): Promise<Message> {
  const sim = checkSimulate()
  if (sim === 'sendfail') {
    await delay(300)
    throw new Error('Simulated network failure. Could not deliver message.')
  }

  await delay(500)
  const state = loadAccountState()

  let convId = input.conversationId

  // If no conversationId provided, find or create one
  if (!convId && input.vendorId && input.equipmentId) {
    const existing = state.conversations.find(
      (c) => c.vendor_id === input.vendorId && c.equipment_id === input.equipmentId
    )
    if (existing) {
      convId = existing.conversation_id
    } else {
      convId = `conv_${input.vendorId}_${Date.now()}`
      const newConv: Conversation = {
        conversation_id: convId,
        vendor_id: input.vendorId,
        vendor_name: input.vendorName || 'Vendor Partner',
        vendor_initials: (input.vendorName || 'VP')
          .split(' ')
          .map((w) => w[0])
          .join('')
          .slice(0, 2)
          .toUpperCase(),
        equipment_id: input.equipmentId,
        equipment_name: input.equipmentName || 'Rental Gear',
        equipment_image: input.equipmentImage || '/images/equipment/line-array-speaker.svg',
        last_message: input.text.trim(),
        last_message_time: new Date().toISOString(),
        unread_count: 0,
      }
      state.conversations.unshift(newConv)
    }
  }

  if (!convId) {
    convId = state.conversations[0]?.conversation_id || 'conv_default'
  }

  const newMsg: Message = {
    message_id: `msg_${Date.now()}`,
    conversation_id: convId,
    sender: 'customer',
    text: input.text.trim(),
    created_at: new Date().toISOString(),
    status: 'sent',
  }

  state.messages.push(newMsg)

  // Update conversation last message
  const targetConv = state.conversations.find((c) => c.conversation_id === convId)
  if (targetConv) {
    targetConv.last_message = input.text.trim()
    targetConv.last_message_time = new Date().toISOString()
  }

  saveAccountState(state)
  return newMsg
}

// -------------------------------------------------------------
// 3. NOTIFICATIONS API
// -------------------------------------------------------------

export async function getNotifications(
  filter: 'all' | 'unread' = 'all'
): Promise<AppNotification[]> {
  await delay(80)
  const state = loadAccountState()
  let list = state.notifications
  if (filter === 'unread') {
    list = list.filter((n) => !n.read)
  }
  return JSON.parse(JSON.stringify(list))
}

export async function markNotificationRead(id: string): Promise<void> {
  const state = loadAccountState()
  const notif = state.notifications.find((n) => n.id === id)
  if (notif && !notif.read) {
    notif.read = true
    saveAccountState(state)
  }
}

export async function markAllNotificationsRead(): Promise<void> {
  const state = loadAccountState()
  state.notifications.forEach((n) => {
    n.read = true
  })
  saveAccountState(state)
}

// -------------------------------------------------------------
// 4. WISHLIST API
// -------------------------------------------------------------

export interface GetWishlistParams {
  sort?: 'added' | 'price_asc' | 'price_desc' | 'rating'
  from?: string
  to?: string
  availableOnly?: boolean
  wishlistIds?: string[]
}

export async function getWishlistItems(
  params: GetWishlistParams = {}
): Promise<EquipmentListingWithAvailability[]> {
  await delay(100)
  const sim = checkSimulate()
  if (sim === 'error') throw new Error('Failed to load wishlist items.')

  const state = loadAccountState()
  const targetIds = params.wishlistIds || state.wishlistIds

  // Match items from MOCK_EQUIPMENT
  const matched = MOCK_EQUIPMENT.filter((eq) => targetIds.includes(eq.equipment_id)).map(
    (eq) => {
      const avail = computeMockAvailability(eq.equipment_id, params.from, params.to)
      return {
        ...eq,
        available_quantity: avail,
      }
    }
  )

  let items = matched

  if (params.from && params.to && params.availableOnly) {
    items = items.filter(
      (item) => item.available_quantity !== undefined && item.available_quantity > 0
    )
  }

  // Sorting
  const sort = params.sort || 'added'
  if (sort === 'price_asc') {
    items.sort((a, b) => a.price_per_day - b.price_per_day)
  } else if (sort === 'price_desc') {
    items.sort((a, b) => b.price_per_day - a.price_per_day)
  } else if (sort === 'rating') {
    items.sort((a, b) => b.avg_rating - a.avg_rating)
  }

  return items
}

// -------------------------------------------------------------
// 5. ADDRESSES API
// -------------------------------------------------------------

export async function getAddresses(): Promise<Address[]> {
  await delay(80)
  const state = loadAccountState()
  return JSON.parse(JSON.stringify(state.addresses))
}

export async function saveAddress(
  addressData: Partial<Address> & {
    name: string
    line1: string
    city: string
    state: string
    pincode: string
  }
): Promise<Address> {
  await delay(200)
  const state = loadAccountState()

  let saved: Address

  if (addressData.id) {
    // Edit existing address
    const existingIndex = state.addresses.findIndex((a) => a.id === addressData.id)
    if (existingIndex === -1) throw new Error(`Address ${addressData.id} not found.`)

    const prev = state.addresses[existingIndex]
    saved = {
      ...prev,
      label: addressData.label || prev.label,
      name: addressData.name.trim(),
      line1: addressData.line1.trim(),
      line2: addressData.line2?.trim() || '',
      city: addressData.city.trim(),
      state: addressData.state.trim(),
      pincode: addressData.pincode.trim(),
      country: 'India',
      is_default: addressData.is_default !== undefined ? addressData.is_default : prev.is_default,
    }

    if (saved.is_default) {
      state.addresses.forEach((a) => {
        if (a.id !== saved.id) a.is_default = false
      })
    }
    state.addresses[existingIndex] = saved
  } else {
    // Create new address
    const newId = `addr_${Date.now()}`
    const isFirst = state.addresses.length === 0
    const shouldBeDefault = isFirst || Boolean(addressData.is_default)

    if (shouldBeDefault) {
      state.addresses.forEach((a) => {
        a.is_default = false
      })
    }

    saved = {
      id: newId,
      label: addressData.label || 'Home',
      name: addressData.name.trim(),
      line1: addressData.line1.trim(),
      line2: addressData.line2?.trim() || '',
      city: addressData.city.trim(),
      state: addressData.state.trim(),
      pincode: addressData.pincode.trim(),
      country: 'India',
      is_default: shouldBeDefault,
      used_in_bookings: 0,
      created_at: new Date().toISOString(),
    }
    state.addresses.push(saved)
  }

  saveAccountState(state)
  return saved
}

export async function deleteAddress(addressId: string): Promise<void> {
  await delay(200)
  const state = loadAccountState()
  const target = state.addresses.find((a) => a.id === addressId)

  if (!target) throw new Error(`Address ${addressId} not found.`)

  if (target.used_in_bookings > 0) {
    throw new Error("Used in bookings, so it can't be deleted.")
  }

  state.addresses = state.addresses.filter((a) => a.id !== addressId)

  // Rule: exactly one default always. If deleted was default and others exist, promote most recent
  if (target.is_default && state.addresses.length > 0) {
    state.addresses[state.addresses.length - 1].is_default = true
  }

  saveAccountState(state)
}

export async function setDefaultAddress(addressId: string): Promise<Address[]> {
  await delay(120)
  const state = loadAccountState()
  const target = state.addresses.find((a) => a.id === addressId)
  if (!target) throw new Error(`Address ${addressId} not found.`)

  state.addresses.forEach((a) => {
    a.is_default = a.id === addressId
  })

  saveAccountState(state)
  return JSON.parse(JSON.stringify(state.addresses))
}

// -------------------------------------------------------------
// 6. PAYMENTS & SUMMARY API
// -------------------------------------------------------------

export interface GetPaymentsParams {
  type?: string
  status?: string
  page?: number
  pageSize?: number
}

export interface GetPaymentsResult {
  items: PaymentRecord[]
  total: number
  page: number
  pageSize: number
}

export async function getMyPayments(
  params: GetPaymentsParams = {}
): Promise<GetPaymentsResult> {
  await delay(100)
  const sim = checkSimulate()
  if (sim === 'error') throw new Error('Failed to load payments.')
  if (sim === 'empty') {
    return { items: [], total: 0, page: 1, pageSize: 10 }
  }

  const state = loadAccountState()
  const allPayments: PaymentRecord[] = []

  state.bookings.forEach((b) => {
    b.payments.forEach((p) => {
      allPayments.push({
        ...p,
        event_name: b.event_name,
      })
    })
  })

  // Sort descending by created_at
  allPayments.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  let filtered = allPayments

  if (params.type && params.type !== 'all') {
    filtered = filtered.filter((p) => p.type === params.type)
  }

  if (params.status && params.status !== 'all') {
    filtered = filtered.filter((p) => p.status === params.status)
  }

  const total = filtered.length
  const page = Math.max(1, params.page || 1)
  const pageSize = params.pageSize || 10
  const start = (page - 1) * pageSize
  const paged = filtered.slice(start, start + pageSize)

  return {
    items: paged,
    total,
    page,
    pageSize,
  }
}

export async function getPaymentSummary(): Promise<PaymentSummaryTilesData> {
  await delay(80)
  const state = loadAccountState()

  let total_paid = 0
  let deposits_held = 0
  let deductions = 0
  let refunded = 0

  state.bookings.forEach((b) => {
    b.payments.forEach((p) => {
      if (p.status === 'success') {
        total_paid += p.amount
      } else if (p.status === 'refunded') {
        refunded += p.amount
      }
    })

    deposits_held += b.deposit.held
    deductions += b.deposit.deducted
  })

  return {
    total_paid,
    deposits_held,
    deductions,
    refunded,
  }
}

// -------------------------------------------------------------
// 7. REVIEWS API
// -------------------------------------------------------------

export async function getReviewsToWrite(): Promise<ReviewToWrite[]> {
  await delay(80)
  const state = loadAccountState()
  const list: ReviewToWrite[] = []

  state.bookings.forEach((b) => {
    b.items.forEach((item) => {
      if (item.status === 'returned' && item.review === null) {
        list.push({
          booking_id: b.booking_id,
          equipment_id: item.equipment_id,
          equipment_name: item.name,
          equipment_image: item.image_url,
          vendor_name: item.vendor_name,
          returned_date: b.end_date,
        })
      }
    })
  })

  return list
}

export async function getMyReviews(): Promise<MyReview[]> {
  await delay(80)
  const state = loadAccountState()
  const list: MyReview[] = []

  state.bookings.forEach((b) => {
    b.items.forEach((item) => {
      if (item.review) {
        list.push({
          review_id: item.review.review_id,
          booking_id: b.booking_id,
          equipment_id: item.equipment_id,
          equipment_name: item.name,
          equipment_image: item.image_url,
          vendor_name: item.vendor_name,
          rating: item.review.rating,
          comment: item.review.comment,
          vendor_reply: item.review.vendor_reply,
          created_at: item.review.created_at,
        })
      }
    })
  })

  // Sort descending
  list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  return list
}

// -------------------------------------------------------------
// 8. BADGES API
// -------------------------------------------------------------

export async function getAccountBadges(): Promise<AccountBadges> {
  const state = loadAccountState()

  // Active bookings: pending, confirmed, in_progress
  const activeBookings = state.bookings.filter(
    (b) => b.status === 'pending' || b.status === 'confirmed' || b.status === 'in_progress'
  ).length

  // Unread inbox: unread messages count in conversations + unread notifications
  const unreadMessages = state.conversations.reduce((acc, c) => acc + c.unread_count, 0)
  const unreadNotifs = state.notifications.filter((n) => !n.read).length
  const totalUnreadInbox = unreadMessages + unreadNotifs

  const wishlistCount = state.wishlistIds.length

  return {
    active_bookings_count: activeBookings,
    unread_inbox_count: totalUnreadInbox,
    wishlist_count: wishlistCount,
  }
}
