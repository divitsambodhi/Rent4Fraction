import type {
  EquipmentAvailability,
  EquipmentDetail,
  EquipmentListingView,
  ReviewsResponse,
} from '@/types'
import { apiClient } from '@/lib/api/client'

export async function getEquipmentDetail(equipmentId: string, _simulateParam?: string): Promise<EquipmentDetail> {
  const numericId = equipmentId.replace(/\D/g, '') || equipmentId
  return await apiClient.get<EquipmentDetail>(`/api/v1/equipment/${numericId}`)
}

export async function getEquipmentAvailability(
  equipmentId: string,
  fromDate?: string | null,
  toDate?: string | null,
): Promise<EquipmentAvailability> {
  const numericId = equipmentId.replace(/\D/g, '') || equipmentId
  const params: Record<string, string> = {}
  if (fromDate) params.start_date = fromDate
  if (toDate) params.end_date = toDate

  try {
    return await apiClient.get<EquipmentAvailability>(
      `/api/v1/equipment/${numericId}/availability`,
      { params },
    )
  } catch {
    return {
      available_quantity: 1,
      next_available_from: null,
      unavailable_days: [],
    }
  }
}

export async function getEquipmentReviews(
  equipmentId: string,
  params: {
    page?: number
    pageSize?: number
    rating?: number
    sort?: 'newest' | 'highest' | 'lowest'
  } = {},
): Promise<ReviewsResponse> {
  const numericId = equipmentId.replace(/\D/g, '') || equipmentId
  try {
    return await apiClient.get<ReviewsResponse>(
      `/api/v1/equipment/${numericId}/reviews`,
      { params },
    )
  } catch {
    return {
      items: [],
      total: 0,
      summary: {
        avg: 0,
        count: 0,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      },
    }
  }
}

export async function getRelatedEquipment(
  equipmentId: string,
  categoryId?: string,
): Promise<EquipmentListingView[]> {
  try {
    const params: Record<string, any> = { pageSize: 4 }
    if (categoryId) params.category = categoryId
    const res = await apiClient.get<{ items: EquipmentListingView[] }>(
      '/api/v1/equipment',
      { params },
    )
    return (res.items || []).filter((eq) => String(eq.equipment_id) !== String(equipmentId))
  } catch {
    return []
  }
}

export const getSimilarEquipment = getRelatedEquipment

export async function getVendorEquipment(vendorId?: string, excludeEquipmentId?: string): Promise<EquipmentListingView[]> {
  try {
    const params = vendorId ? { vendor_id: vendorId } : undefined
    const res = await apiClient.get<{ items: EquipmentListingView[] }>('/api/v1/equipment', { params })
    const items = res.items || []
    if (excludeEquipmentId) {
      return items.filter((eq) => String(eq.equipment_id) !== String(excludeEquipmentId))
    }
    return items
  } catch {
    return []
  }
}
