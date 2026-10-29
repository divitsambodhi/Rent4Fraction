import type {
  EquipmentListingView,
  FAQItem,
  Vendor,
} from '@/types'
import {
  CANONICAL_CATEGORIES,
  CANONICAL_GROUPS,
  type CanonicalCategory,
  type CanonicalGroup,
  type CanonicalVendor,
} from './canonical-ids'
import { apiClient } from '@/lib/api/client'

export * from './canonical-ids'
export * from './equipment-detail'
export * from './latency'
export * from './admin'
export * from './vendor'
export * from './inventory'
export * from './account'
export * from './cart'

export interface CatalogSearchParams {
  q?: string
  category?: string
  vendor?: string
  from?: string
  to?: string
  price_min?: number
  price_max?: number
  rating?: number
  delivery?: boolean
  available?: boolean
  sort?: 'relevance' | 'price_asc' | 'price_desc' | 'rating' | 'reviews' | 'newest'
  page?: number
  pageSize?: number
  simulate?: 'empty' | 'error'
}

export interface EquipmentListingWithAvailability extends EquipmentListingView {
  available_quantity?: number
}

export interface SearchEquipmentResult {
  items: EquipmentListingWithAvailability[]
  total: number
  page: number
  pageSize: number
  facets: {
    categories: { id: string; count: number }[]
    vendors: { id: string; count: number }[]
    priceMin: number
    priceMax: number
  }
}

export interface CategoryTreeGroup {
  group: CanonicalGroup
  categories: (CanonicalCategory & { count: number })[]
  totalCount: number
}

export function computeMockAvailability(
  _itemId: string | number,
  _fromDate?: string | null,
  _toDate?: string | null,
): number | undefined {
  return undefined
}

/**
 * Core Catalog Search API connecting directly to backend /api/v1/equipment.
 */
export async function searchEquipment(
  params: CatalogSearchParams = {},
): Promise<SearchEquipmentResult> {
  const queryParams: Record<string, any> = {}
  if (params.q) queryParams.q = params.q
  if (params.category && params.category !== 'all') queryParams.category = params.category
  if (params.vendor) queryParams.vendor_id = params.vendor
  if (params.price_min) queryParams.price_min = params.price_min
  if (params.price_max) queryParams.price_max = params.price_max
  if (params.from) queryParams.start_date = params.from
  if (params.to) queryParams.end_date = params.to
  if (params.sort) queryParams.sort = params.sort
  if (params.page) queryParams.page = params.page
  if (params.pageSize) queryParams.pageSize = params.pageSize

  try {
    const res = await apiClient.get<any>('/api/v1/equipment', { params: queryParams })
    const items = (res.items || []).map((it: any) => ({
      ...it,
      equipment_id: String(it.equipment_id),
      category_id: String(it.category_id),
      vendor_id: String(it.vendor_id),
      price_per_day: Number(it.price_per_day || 0),
      security_deposit: Number(it.security_deposit || 0),
    }))

    const categoriesFacet = CANONICAL_CATEGORIES.map((c) => ({
      id: c.id,
      count: res.facets?.category_counts?.[c.id] || 0,
    }))

    return {
      items,
      total: res.total || 0,
      page: res.page || 1,
      pageSize: res.pageSize || 24,
      facets: {
        categories: categoriesFacet,
        vendors: [],
        priceMin: res.facets?.price_min || 0,
        priceMax: res.facets?.price_max || 0,
      },
    }
  } catch {
    return {
      items: [],
      total: 0,
      page: 1,
      pageSize: 24,
      facets: {
        categories: CANONICAL_CATEGORIES.map((c) => ({ id: c.id, count: 0 })),
        vendors: [],
        priceMin: 0,
        priceMax: 0,
      },
    }
  }
}

/**
 * Retrieves the full category tree with counts from backend or canonical metadata.
 */
export async function getCategoryTree(): Promise<CategoryTreeGroup[]> {
  try {
    const backendCategories = await apiClient.get<any[]>('/api/v1/categories')
    if (Array.isArray(backendCategories) && backendCategories.length > 0) {
      // Map groups from canonical with live counts
      return CANONICAL_GROUPS.map((grp) => {
        const groupCats = CANONICAL_CATEGORIES.filter((c) => c.groupId === grp.id).map((c) => {
          const match = backendCategories.find((bc) => String(bc.category_id) === c.id)
          return {
            ...c,
            count: match?.equipment_count ?? 0,
          }
        })
        const totalCount = groupCats.reduce((acc, it) => acc + it.count, 0)
        return {
          group: grp,
          categories: groupCats,
          totalCount,
        }
      })
    }
  } catch {
    // Fall back to canonical categories with 0 count
  }

  return CANONICAL_GROUPS.map((grp) => {
    const groupCats = CANONICAL_CATEGORIES.filter((c) => c.groupId === grp.id).map((c) => ({
      ...c,
      count: 0,
    }))
    return {
      group: grp,
      categories: groupCats,
      totalCount: 0,
    }
  })
}

/**
 * Retrieves vendor list for storefront browsing and filtering.
 */
export async function getVendors(): Promise<CanonicalVendor[]> {
  return []
}

/**
 * Retrieves an individual vendor by identifier.
 */
export async function getVendorById(vendorId: string): Promise<Vendor | null> {
  try {
    return await apiClient.get<Vendor>(`/api/v1/vendor/${vendorId}`)
  } catch {
    return null
  }
}

export async function getFAQs(): Promise<FAQItem[]> {
  try {
    return await apiClient.get<FAQItem[]>('/api/v1/help/faqs')
  } catch {
    return []
  }
}


export async function getFeaturedEquipment(): Promise<EquipmentListingView[]> {
  try {
    const res = await apiClient.get<{ items: EquipmentListingView[] }>('/api/v1/equipment', {
      params: { pageSize: 8 },
    })
    return res.items || []
  } catch {
    return []
  }
}

export async function getTopVendors(): Promise<CanonicalVendor[]> {
  return []
}

export const getFaqs = getFAQs

export async function getCategories(): Promise<CanonicalCategory[]> {
  try {
    const res = await apiClient.get<CanonicalCategory[]>('/api/v1/categories')
    if (Array.isArray(res) && res.length > 0) return res
  } catch {
    // fallback to canonical
  }
  return CANONICAL_CATEGORIES
}

export async function sendVendorMessage(payload: {
  vendor_id: string
  equipment_id?: string
  subject?: string
  message: string
  customer_name?: string
}): Promise<void> {
  await apiClient.post('/api/v1/messages', {
    recipient_id: payload.vendor_id,
    equipment_id: payload.equipment_id,
    text: payload.message,
  })
}
