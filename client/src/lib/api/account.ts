import { apiClient } from '@/lib/api/client'
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

export interface GetBookingsParams {
  [key: string]: string | number | boolean | null | undefined
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
    active?: number
    completed: number
    cancelled: number
  }
}

export interface GetReviewsResult {
  reviews: MyReview[]
  toWrite: ReviewToWrite[]
  counts: {
    posted: number
    toWrite: number
  }
}

export interface SendMessageInput {
  conversationId?: string
  recipientId?: string
  bookingId?: string
  text: string
  equipmentId?: string
}

export function loadAccountState() {
  return {
    bookings: [],
    reviews: [],
    addresses: [],
    notifications: [],
    unreadCount: 0,
  }
}

export function saveAccountState(_state: any) {}

export async function getBookings(params: GetBookingsParams = {}): Promise<GetBookingsResult> {
  try {
    const res = await apiClient.get<GetBookingsResult>('/api/v1/bookings', { params })
    return (
      res || {
        items: [],
        total: 0,
        page: 1,
        pageSize: 10,
        counts: { all: 0, upcoming: 0, ongoing: 0, active: 0, completed: 0, cancelled: 0 },
      }
    )
  } catch {
    return {
      items: [],
      total: 0,
      page: 1,
      pageSize: 10,
      counts: { all: 0, upcoming: 0, ongoing: 0, active: 0, completed: 0, cancelled: 0 },
    }
  }
}

export async function getBookingDetail(bookingId: string): Promise<BookingDetail | null> {
  try {
    const cleanId = encodeURIComponent(bookingId.trim())
    return await apiClient.get<BookingDetail>(`/api/v1/bookings/${cleanId}`)
  } catch (err) {
    console.error(`Failed to load booking detail for #${bookingId}:`, err)
    return null
  }
}

export const getBookingById = getBookingDetail

export async function cancelBooking(bookingId: string, reason: string): Promise<void> {
  const cleanId = encodeURIComponent(bookingId.trim())
  await apiClient.post(`/api/v1/bookings/${cleanId}/cancel`, { reason })
}

export async function getReviews(tab = 'posted', page = 1, pageSize = 10): Promise<GetReviewsResult> {
  try {
    const res = await apiClient.get<GetReviewsResult>('/api/v1/reviews', {
      params: { tab, page, pageSize },
    })
    return res || { reviews: [], toWrite: [], counts: { posted: 0, toWrite: 0 } }
  } catch {
    return { reviews: [], toWrite: [], counts: { posted: 0, toWrite: 0 } }
  }
}

export async function submitReview(
  bookingId: string,
  equipmentId: string,
  rating: number,
  comment = '',
): Promise<any> {
  return await apiClient.post('/api/v1/reviews', {
    booking_id: bookingId,
    equipment_id: equipmentId,
    rating,
    comment,
  })
}

export async function replyToReview(reviewId: string, replyText: string): Promise<void> {
  await apiClient.post(`/api/v1/reviews/${reviewId}/reply`, { reply: replyText })
}

export async function getConversations(query?: string): Promise<Conversation[]> {
  try {
    const params = query ? { q: query } : undefined
    const res = await apiClient.get<{ items: Conversation[] }>('/api/v1/messages/threads', { params })
    return res.items || []
  } catch {
    return []
  }
}

export async function getMessages(conversationId: string): Promise<Message[]> {
  try {
    const res = await apiClient.get<{ items: Message[] }>(`/api/v1/messages/threads/${conversationId}`)
    return res.items || []
  } catch {
    return []
  }
}

export async function sendMessage(input: SendMessageInput): Promise<Message> {
  return await apiClient.post<Message>('/api/v1/messages', {
    recipient_id: input.recipientId,
    booking_id: input.bookingId,
    equipment_id: input.equipmentId,
    text: input.text,
  })
}

let cachedAddressesPromise: Promise<Address[]> | null = null
let cachedAddressesExpiry = 0

export async function getAddresses(forceRefresh = false): Promise<Address[]> {
  const now = Date.now()
  if (!forceRefresh && cachedAddressesPromise && now < cachedAddressesExpiry) {
    return cachedAddressesPromise
  }

  cachedAddressesExpiry = now + 3000 // dedupe window: 3s
  cachedAddressesPromise = (async () => {
    try {
      const res = await apiClient.get<any>('/api/v1/addresses')
      if (Array.isArray(res)) {
        return res
      }
      return res?.items || []
    } catch {
      return []
    }
  })()

  return cachedAddressesPromise
}

export async function saveAddress(data: Partial<Address>): Promise<Address> {
  if (data.id) {
    return await apiClient.put<Address>(`/api/v1/addresses/${data.id}`, data)
  }
  return await apiClient.post<Address>('/api/v1/addresses', data)
}

export async function deleteAddress(addressId: string): Promise<Address[]> {
  await apiClient.delete(`/api/v1/addresses/${addressId}`)
  return await getAddresses()
}

export async function setDefaultAddress(addressId: string): Promise<Address[]> {
  await apiClient.put(`/api/v1/addresses/${addressId}/default`)
  return await getAddresses()
}

export async function getPayments(params: any = {}): Promise<{ items: PaymentRecord[]; total: number }> {
  try {
    const res = await apiClient.get<{ items: PaymentRecord[]; total: number }>('/api/v1/payments', { params })
    return res || { items: [], total: 0 }
  } catch {
    return { items: [], total: 0 }
  }
}

export async function getPaymentSummaryTiles(): Promise<PaymentSummaryTilesData> {
  try {
    return await apiClient.get<PaymentSummaryTilesData>('/api/v1/payments/summary')
  } catch {
    return {
      total_paid: 0,
      deposits_held: 0,
      deductions: 0,
      refunded: 0,
    }
  }
}

export async function getNotifications(filter?: string): Promise<AppNotification[]> {
  try {
    const params = filter ? { status: filter } : undefined
    const res = await apiClient.get<{ items: AppNotification[] }>('/api/v1/notifications', { params })
    return res.items || []
  } catch {
    return []
  }
}

export async function markNotificationRead(id: string): Promise<void> {
  await apiClient.patch(`/api/v1/notifications/${id}/read`)
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiClient.post('/api/v1/notifications/mark-all-read')
}

export async function getAccountBadges(): Promise<AccountBadges> {
  try {
    const res = await apiClient.get<{ unread_count: number }>('/api/v1/notifications/unread-count')
    return {
      active_bookings_count: 0,
      unread_inbox_count: res.unread_count ?? 0,
      wishlist_count: 0,
    }
  } catch {
    return {
      active_bookings_count: 0,
      unread_inbox_count: 0,
      wishlist_count: 0,
    }
  }
}

export const getMyBookings = getBookings
export const getMyPayments = getPayments
export const getPaymentSummary = getPaymentSummaryTiles
export type GetPaymentsResult = { items: PaymentRecord[]; total: number }
export async function getReviewsToWrite(): Promise<ReviewToWrite[]> {
  try {
    const res = await getReviews('toWrite')
    return res.toWrite || []
  } catch {
    return []
  }
}

export async function getMyReviews(): Promise<MyReview[]> {
  try {
    const res = await getReviews('posted')
    return res.reviews || []
  } catch {
    return []
  }
}

export async function respondToDamageReport(
  bookingId: string,
  reportId: string,
  action: 'accept' | 'dispute' | string,
  reason?: string
): Promise<void> {
  const cleanBookingId = encodeURIComponent(bookingId.trim())
  const cleanReportId = encodeURIComponent(reportId.trim())
  await apiClient.post(`/api/v1/bookings/${cleanBookingId}/damage-reports/${cleanReportId}/respond`, {
    action,
    dispute_reason: reason,
  })
}

export async function respondToDeliveryFee(
  bookingId: string,
  vendorOrderId: string,
  action: 'accept' | 'switch_to_pickup'
): Promise<any> {
  const cleanBookingId = encodeURIComponent(bookingId.trim())
  const cleanVendorOrderId = encodeURIComponent(vendorOrderId.trim())
  return await apiClient.post(
    `/api/v1/bookings/${cleanBookingId}/vendor-orders/${cleanVendorOrderId}/respond-delivery-fee`,
    { action }
  )
}
