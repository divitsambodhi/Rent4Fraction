import { apiClient } from '@/lib/api/client'
import type { VendorProfile } from '@/types/vendor'

export async function getVendorProfile(): Promise<VendorProfile> {
  try {
    return await apiClient.get<VendorProfile>('/api/v1/vendor/profile')
  } catch {
    return {
      vendor_id: '',
      business_name: '',
      city: '',
      rating: 0,
      review_count: 0,
      approval_status: 'pending',
      commission_rate: 0.15,
      owner_email: '',
      owner_name: '',
      gst_number: '',
      logo_url: '',
      member_since: '2026',
      phone: '',
      email: '',
      address: '',
      description: '',
      payout_method: 'bank_transfer',
      bank_account_number: '',
      bank_ifsc: '',
      upi_id: '',
    }
  }
}

export async function updateVendorProfile(data: Partial<VendorProfile>): Promise<VendorProfile> {
  return await apiClient.put<VendorProfile>('/api/v1/vendor/profile', data)
}

export interface VendorOrderDetailItem {
  item_id: string
  equipment_id: string
  equipment_name: string
  primary_image_url?: string | null
  quantity: number
  daily_rate: number
  days: number
  total_price: number
  commission_rate: number
  commission_amount: number
  deposit_amount: number
  status: string
  condition?: string | null
  damage_report?: any | null
}

export interface VendorOrderDetail {
  vendor_order_id: string
  order_number: string
  booking_id: string
  booking_number: string
  customer_name: string
  customer_phone?: string | null
  customer_email?: string | null
  delivery_address: any
  fulfilment_type: 'delivery' | 'pickup' | string
  status: 'pending' | 'accepted' | 'rejected' | 'dispatched' | 'delivered' | 'returned' | 'completed' | 'cancelled'
  start_date: string
  end_date: string
  total_days: number
  subtotal: number
  delivery_fee: number
  commission_amount: number
  net_payout: number
  deposit_share: number
  deposit_held: number
  deposit_refunded: number
  deposit_deducted: number
  items: VendorOrderDetailItem[]
  delivery?: any | null
  return_record?: any | null
  damage_reports?: any[]
  events?: any[]
  allowed_actions?: string[]
  rejection_reason?: string | null
}

export async function getVendorOrders(status?: string): Promise<VendorOrderDetail[]> {
  try {
    const params = status && status !== 'all' ? { status } : undefined
    const res = await apiClient.get<{ items: VendorOrderDetail[] }>('/api/v1/vendor/orders', { params })
    return res.items || []
  } catch {
    return []
  }
}

export async function getVendorOrderDetail(vendorOrderId: string): Promise<VendorOrderDetail | null> {
  try {
    return await apiClient.get<VendorOrderDetail>(`/api/v1/vendor/orders/${vendorOrderId}`)
  } catch {
    return null
  }
}

export async function executeVendorOrderLifecycleAction(
  vendorOrderId: string,
  action: string,
  payload?: any
): Promise<VendorOrderDetail> {
  switch (action) {
    case 'accept':
      return await apiClient.post(`/api/v1/vendor/orders/${vendorOrderId}/accept`)
    case 'decline':
      return await apiClient.post(`/api/v1/vendor/orders/${vendorOrderId}/decline`, payload || { reason: 'Declined by vendor' })
    case 'schedule_delivery':
    case 'schedule_pickup':
      return await apiClient.post(`/api/v1/vendor/orders/${vendorOrderId}/schedule-delivery`, payload)
    case 'dispatch':
      return await apiClient.post(`/api/v1/vendor/orders/${vendorOrderId}/mark-dispatched`)
    case 'mark_delivered':
      return await apiClient.post(`/api/v1/vendor/orders/${vendorOrderId}/mark-delivered`, payload)
    case 'delivery_failed':
      return await apiClient.post(`/api/v1/vendor/orders/${vendorOrderId}/delivery-failed`, payload)
    case 'reschedule_delivery':
      return await apiClient.post(`/api/v1/vendor/orders/${vendorOrderId}/reschedule-delivery`, payload)
    case 'schedule_return':
      return await apiClient.post(`/api/v1/vendor/orders/${vendorOrderId}/schedule-return`, payload)
    case 'mark_returned':
      return await apiClient.post(`/api/v1/vendor/orders/${vendorOrderId}/mark-returned`)
    case 'inspect':
      return await apiClient.post(`/api/v1/vendor/orders/${vendorOrderId}/inspect`, payload)
    case 'complete_order':
      return await apiClient.post(`/api/v1/vendor/orders/${vendorOrderId}/complete`)
    default:
      return await apiClient.post(`/api/v1/vendor/orders/${vendorOrderId}/status`, { action, ...(payload || {}) })
  }
}

export async function getVendorPayouts(): Promise<any[]> {
  try {
    const res = await apiClient.get<{ items: any[] }>('/api/v1/vendor/payouts')
    return res.items || []
  } catch {
    return []
  }
}

export async function acceptVendorOrder(bookingId: string): Promise<void> {
  await apiClient.post(`/api/v1/vendor/orders/${bookingId}/accept`)
}

export async function declineVendorOrder(bookingId: string, reason: string): Promise<void> {
  await apiClient.post(`/api/v1/vendor/orders/${bookingId}/decline`, { reason })
}

export async function markOrderDispatched(bookingId: string): Promise<void> {
  await apiClient.post(`/api/v1/vendor/orders/${bookingId}/dispatch`)
}

export async function markOrderDelivered(bookingId: string): Promise<void> {
  await apiClient.post(`/api/v1/vendor/orders/${bookingId}/deliver`)
}

export async function markOrderReturned(bookingId: string): Promise<void> {
  await apiClient.post(`/api/v1/vendor/orders/${bookingId}/return`)
}

export async function recordCashCollection(bookingId: string, amount: number, notes?: string): Promise<void> {
  await apiClient.post(`/api/v1/vendor/orders/${bookingId}/cash`, { amount, notes })
}

export async function recordDepositSettlement(bookingId: string, returnAmount: number, damageAmount: number, notes?: string): Promise<void> {
  await apiClient.post(`/api/v1/vendor/orders/${bookingId}/deposit-settlement`, {
    return_amount: returnAmount,
    damage_amount: damageAmount,
    notes,
  })
}


export async function getVendorOverview(): Promise<any> {
  try {
    return await apiClient.get('/api/v1/vendor/overview')
  } catch {
    return {
      gmv: 0,
      activeOrders: 0,
      pendingRequests: 0,
      totalEquipment: 0,
      rating: 0,
      reviewCount: 0,
      sparklines: { gmv: [], orders: [] },
    }
  }
}

export async function getVendorReviews(): Promise<{ items: any[]; total: number }> {
  try {
    const res = await apiClient.get<any>('/api/v1/vendor/reviews')
    return res || { items: [], total: 0 }
  } catch {
    return { items: [], total: 0 }
  }
}

export async function setOrderDeliveryFee(vendorOrderId: string, deliveryFee: number, notes?: string): Promise<any> {
  return await apiClient.post(`/api/v1/vendor/orders/${vendorOrderId}/set-delivery-fee`, {
    delivery_fee: deliveryFee,
    notes,
  })
}

export async function replyToVendorReview(reviewId: string, replyText: string): Promise<void> {
  await apiClient.post(`/api/v1/reviews/${reviewId}/reply`, { reply: replyText })
}
