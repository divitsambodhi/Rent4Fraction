import { apiClient } from '@/lib/api/client'
import type { VendorProfile, VendorOrderSummary } from '@/types/vendor'

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

export async function getVendorOrders(status?: string): Promise<VendorOrderSummary[]> {
  try {
    const params = status ? { status } : undefined
    const res = await apiClient.get<{ items: VendorOrderSummary[] }>('/api/v1/vendor/orders', { params })
    return res.items || []
  } catch {
    return []
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

export async function replyToVendorReview(reviewId: string, replyText: string): Promise<void> {
  await apiClient.post(`/api/v1/reviews/${reviewId}/reply`, { reply: replyText })
}
