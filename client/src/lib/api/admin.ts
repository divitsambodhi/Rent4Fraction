import { apiClient } from '@/lib/api/client'
import type {
  AdminOverviewStats,
  AdminVendorItem,
  AdminEquipmentItem,
  AdminBookingItem,
  AdminDisputeItem,
  AdminPayoutItem,
  AdminCategoryItem,
  AdminCouponItem,
  AdminUser,
} from '@/types/admin'

export async function getAdminOverview(): Promise<AdminOverviewStats> {
  try {
    return await apiClient.get<AdminOverviewStats>('/api/v1/admin/overview')
  } catch {
    return {
      grossBookingValue: 0,
      bookingsCount: 0,
      bookingsDelta: '0%',
      activeVendorsCount: 0,
      pendingApplicationsCount: 0,
      openDisputesCount: 0,
      platformCommissionEarned: 0,
      chartData: [],
      attentionItems: [],
      recentBookings: [],
      recentApplications: [],
    }
  }
}

export async function getAdminVendors(status?: string): Promise<AdminVendorItem[]> {
  try {
    const params = status ? { status } : undefined
    const res = await apiClient.get<{ items: AdminVendorItem[] }>('/api/v1/admin/vendors', { params })
    return res.items || []
  } catch {
    return []
  }
}

export async function getAdminEquipment(status?: string, category?: string): Promise<AdminEquipmentItem[]> {
  try {
    const params: Record<string, string> = {}
    if (status) params.status = status
    if (category) params.category = category
    const res = await apiClient.get<{ items: AdminEquipmentItem[] }>('/api/v1/admin/equipment', { params })
    return res.items || []
  } catch {
    return []
  }
}

export async function getAdminBookings(status?: string): Promise<AdminBookingItem[]> {
  try {
    const params = status ? { status } : undefined
    const res = await apiClient.get<{ items: AdminBookingItem[] }>('/api/v1/admin/bookings', { params })
    return res.items || []
  } catch {
    return []
  }
}

export async function getAdminDisputes(status?: string): Promise<AdminDisputeItem[]> {
  try {
    const params = status ? { status } : undefined
    const res = await apiClient.get<{ items: AdminDisputeItem[] }>('/api/v1/admin/disputes', { params })
    return res.items || []
  } catch {
    return []
  }
}

export async function getAdminPayouts(status?: string): Promise<AdminPayoutItem[]> {
  try {
    const params = status ? { status } : undefined
    const res = await apiClient.get<{ items: AdminPayoutItem[] }>('/api/v1/admin/payouts', { params })
    return res.items || []
  } catch {
    return []
  }
}

export async function getAdminCategories(): Promise<AdminCategoryItem[]> {
  try {
    const res = await apiClient.get<AdminCategoryItem[]>('/api/v1/admin/categories')
    return Array.isArray(res) ? res : []
  } catch {
    return []
  }
}

export async function getAdminCoupons(): Promise<AdminCouponItem[]> {
  try {
    const res = await apiClient.get<AdminCouponItem[]>('/api/v1/admin/coupons')
    return Array.isArray(res) ? res : []
  } catch {
    return []
  }
}

export async function getAdminUsers(role?: string, status?: string): Promise<AdminUser[]> {
  try {
    const params: Record<string, string> = {}
    if (role) params.role = role
    if (status) params.status = status
    const res = await apiClient.get<{ items: AdminUser[] }>('/api/v1/admin/users', { params })
    return res.items || []
  } catch {
    return []
  }
}

export async function approveVendor(vendorId: string): Promise<void> {
  await apiClient.post(`/api/v1/admin/vendors/${vendorId}/approve`)
}

export async function rejectVendor(vendorId: string, reason: string): Promise<void> {
  await apiClient.post(`/api/v1/admin/vendors/${vendorId}/reject`, { reason })
}

export async function suspendVendor(vendorId: string, reason: string): Promise<void> {
  await apiClient.post(`/api/v1/admin/vendors/${vendorId}/suspend`, { reason })
}

export async function updateVendorCommission(vendorId: string, rate: number): Promise<void> {
  await apiClient.put(`/api/v1/admin/vendors/${vendorId}/commission`, { commission_rate: rate })
}

export async function updateEquipmentCommission(equipmentId: string, rate: number | null): Promise<void> {
  await apiClient.put(`/api/v1/admin/equipment/${equipmentId}/commission`, { commission_rate: rate })
}

export async function toggleAdminCategoryActive(categoryId: string, active: boolean): Promise<void> {
  await apiClient.put(`/api/v1/admin/categories/${categoryId}/active`, { active })
}

export async function createAdminCategory(data: Partial<AdminCategoryItem>): Promise<AdminCategoryItem> {
  return await apiClient.post<AdminCategoryItem>('/api/v1/admin/categories', data)
}

export async function updateAdminCategory(categoryId: string, data: Partial<AdminCategoryItem>): Promise<AdminCategoryItem> {
  return await apiClient.put<AdminCategoryItem>(`/api/v1/admin/categories/${categoryId}`, data)
}

export async function createAdminCoupon(data: Partial<AdminCouponItem>): Promise<AdminCouponItem> {
  return await apiClient.post<AdminCouponItem>('/api/v1/admin/coupons', data)
}

export async function updateAdminCoupon(couponId: string, data: Partial<AdminCouponItem>): Promise<AdminCouponItem> {
  return await apiClient.put<AdminCouponItem>(`/api/v1/admin/coupons/${couponId}`, data)
}

export async function resolveAdminDispute(
  disputeId: string,
  outcome: string,
  finalAmount: number,
  notes: string,
): Promise<void> {
  await apiClient.post(`/api/v1/admin/disputes/${disputeId}/resolve`, {
    outcome,
    final_amount: finalAmount,
    resolution_note: notes,
  })
}

export async function updateAdminPayoutStatus(payoutId: string, status: string, notes?: string): Promise<void> {
  await apiClient.put(`/api/v1/admin/payouts/${payoutId}/status`, { status, notes })
}


export function getAdminOverviewKPIs() {
  return {
    grossBookingValue: 0,
    bookingsCount: 0,
    activeVendorsCount: 0,
    pendingApplicationsCount: 0,
    openDisputesCount: 0,
    commissionEarned: 0,
    recentBookings: [],
    recentApplications: [],
  }
}

export async function updateVendorApprovalStatus(vendorId: string, status: string, reason?: string): Promise<void> {
  if (status === 'approved') {
    await apiClient.post(`/api/v1/admin/vendors/${vendorId}/approve`)
  } else {
    await apiClient.post(`/api/v1/admin/vendors/${vendorId}/reject`, { reason: reason || 'Not approved' })
  }
}


export async function toggleAdminUserStatus(userId: string): Promise<void> {
  await apiClient.put(`/api/v1/admin/users/${userId}/toggle-status`)
}


export type ManagedCategory = AdminCategoryItem
export const saveAdminCategory = async (cat: Partial<AdminCategoryItem>) => {
  if (cat.id) {
    return await updateAdminCategory(cat.id, cat)
  }
  return await createAdminCategory(cat)
}

export const saveAdminCoupon = async (c: Partial<AdminCouponItem>) => {
  if (c.id) {
    return await updateAdminCoupon(c.id, c)
  }
  return await createAdminCoupon(c)
}

export const toggleAdminCouponActive = async (couponId: string, active: boolean) => {
  await updateAdminCoupon(couponId, { is_active: active } as any)
}

export type AdminPayoutRow = AdminPayoutItem
export const updatePayoutStatus = updateAdminPayoutStatus
