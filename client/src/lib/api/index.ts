import type {
  Category,
  EquipmentListingView,
  FAQItem,
  Vendor,
} from '@/types'
import {
  CANONICAL_CATEGORIES,
  CANONICAL_GROUPS,
  CANONICAL_VENDORS,
  resolveCategoryIds,
  type CanonicalCategory,
  type CanonicalGroup,
  type CanonicalVendor,
} from './canonical-ids'
import {
  MOCK_CATEGORIES,
  MOCK_EQUIPMENT,
  MOCK_FAQS,
  MOCK_NOTIFICATIONS,
  MOCK_VENDORS,
} from './mock-data'

export * from './canonical-ids'
export * from './equipment-detail'
export { MOCK_CATEGORIES, MOCK_EQUIPMENT, MOCK_FAQS, MOCK_NOTIFICATIONS, MOCK_VENDORS }

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

const DEFAULT_DELAY = 140

function shouldSimulate(type: 'error' | 'empty', paramSimulate?: string): boolean {
  if (paramSimulate === type) return true
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search)
    return params.get('simulate') === type
  }
  return false
}

/**
 * Deterministically computes available quantity for an item given rental dates.
 * Returns:
 * - 0: Unavailable for selected dates
 * - 1..3: Low inventory soft-warning
 * - 4+: Fully available
 * - undefined: When no dates provided
 */
export function computeMockAvailability(
  itemId: string | number,
  fromDate?: string | null,
  toDate?: string | null,
): number | undefined {
  if (!fromDate || !toDate) return undefined
  const numId = typeof itemId === 'number' ? itemId : parseInt(itemId, 10) || 1
  const dSum =
    fromDate.split('-').reduce((a, b) => a + parseInt(b, 10), 0) +
    toDate.split('-').reduce((a, b) => a + parseInt(b, 10), 0)

  // Predictable rotation giving realistic distribution:
  // ~14% unavailable (0), ~42% low inventory (1..3), ~44% ample stock (6)
  const mod = (numId + (dSum % 7)) % 7
  if (mod === 0) return 0
  if (mod === 1) return 1
  if (mod === 2) return 2
  if (mod === 3) return 3
  return 6
}

/**
 * Core Catalog Search API with filtering, facets, sorting, and pagination.
 */
export async function searchEquipment(
  params: CatalogSearchParams = {},
): Promise<SearchEquipmentResult> {
  await new Promise((resolve) => setTimeout(resolve, DEFAULT_DELAY))

  if (shouldSimulate('error', params.simulate)) {
    throw new Error('Failed to retrieve equipment listings. Simulated error active (?simulate=error).')
  }

  // Calculate facets from complete catalog
  const facetCategories = CANONICAL_CATEGORIES.map((c) => ({
    id: c.id,
    count: MOCK_EQUIPMENT.filter((eq) => eq.category_id === c.id).length,
  }))

  const facetVendors = CANONICAL_VENDORS.map((v) => ({
    id: v.id,
    count: MOCK_EQUIPMENT.filter((eq) => eq.vendor_id === v.id).length,
  }))

  const allPrices = MOCK_EQUIPMENT.map((eq) => eq.price_per_day)
  const priceMin = Math.min(...allPrices)
  const priceMax = Math.max(...allPrices)

  if (shouldSimulate('empty', params.simulate)) {
    return {
      items: [],
      total: 0,
      page: 1,
      pageSize: params.pageSize || 12,
      facets: {
        categories: facetCategories,
        vendors: facetVendors,
        priceMin,
        priceMax,
      },
    }
  }

  // 1. Resolve matching category IDs if filtered
  const targetCategoryIds = params.category ? resolveCategoryIds(params.category) : null

  // 2. Filter dataset
  const filtered = MOCK_EQUIPMENT.filter((item) => {
    // Keyword search (name, description, category name)
    if (params.q && params.q.trim()) {
      const q = params.q.trim().toLowerCase()
      const searchTarget = `${item.name} ${item.description} ${item.category_name} ${item.vendor_name}`.toLowerCase()
      if (!searchTarget.includes(q)) return false
    }

    // Category filter
    if (targetCategoryIds !== null) {
      if (!targetCategoryIds.includes(item.category_id)) return false
    }

    // Vendor filter
    if (params.vendor && params.vendor !== 'all') {
      if (item.vendor_id !== params.vendor) return false
    }

    // Price range
    if (typeof params.price_min === 'number' && item.price_per_day < params.price_min) {
      return false
    }
    if (typeof params.price_max === 'number' && item.price_per_day > params.price_max) {
      return false
    }

    // Rating
    if (typeof params.rating === 'number' && item.avg_rating < params.rating) {
      return false
    }

    // Delivery available
    if (params.delivery && !item.delivery_available) {
      return false
    }

    // Date-based availability filter ("Only show available for my dates")
    if (params.from && params.to) {
      const avail = computeMockAvailability(item.equipment_id, params.from, params.to)
      if (params.available && avail === 0) {
        return false
      }
    }

    return true
  })

  // 3. Attach availability quantity to items
  const itemsWithAvailability: EquipmentListingWithAvailability[] = filtered.map((item) => {
    const avail = computeMockAvailability(item.equipment_id, params.from, params.to)
    return {
      ...item,
      available_quantity: avail,
    }
  })

  // 4. Sort
  const sort = params.sort || 'relevance'
  const sorted = [...itemsWithAvailability].sort((a, b) => {
    switch (sort) {
      case 'price_asc':
        return a.price_per_day - b.price_per_day
      case 'price_desc':
        return b.price_per_day - a.price_per_day
      case 'rating':
        return b.avg_rating - a.avg_rating
      case 'reviews':
        return b.review_count - a.review_count
      case 'newest':
        return parseInt(b.equipment_id, 10) - parseInt(a.equipment_id, 10)
      case 'relevance':
      default:
        return 0
    }
  })

  // 5. Pagination
  const page = Math.max(1, params.page || 1)
  const pageSize = params.pageSize || 12
  const startIndex = (page - 1) * pageSize
  const paginatedItems = sorted.slice(startIndex, startIndex + pageSize)

  return {
    items: paginatedItems,
    total: sorted.length,
    page,
    pageSize,
    facets: {
      categories: facetCategories,
      vendors: facetVendors,
      priceMin,
      priceMax,
    },
  }
}

/**
 * Returns hierarchical category tree grouped by Sound, Lighting, Furniture, Tents & decor.
 */
export async function getCategoryTree(): Promise<CategoryTreeGroup[]> {
  await new Promise((resolve) => setTimeout(resolve, 60))

  return CANONICAL_GROUPS.map((group) => {
    const groupCategories = CANONICAL_CATEGORIES.filter((c) =>
      group.categoryIds.includes(c.id),
    ).map((c) => {
      const count = MOCK_EQUIPMENT.filter((eq) => eq.category_id === c.id).length
      return {
        ...c,
        count,
      }
    })

    const totalCount = groupCategories.reduce((acc, c) => acc + c.count, 0)

    return {
      group,
      categories: groupCategories,
      totalCount,
    }
  })
}

export async function getCategories(): Promise<Category[]> {
  await new Promise((resolve) => setTimeout(resolve, 80))
  if (shouldSimulate('error')) {
    throw new Error('Failed to load categories. Simulated error active.')
  }
  return [...MOCK_CATEGORIES]
}

export async function getVendor(id: string): Promise<CanonicalVendor | null> {
  await new Promise((resolve) => setTimeout(resolve, 60))
  const vendor = CANONICAL_VENDORS.find((v) => v.id === id)
  return vendor ? { ...vendor } : null
}

export async function getVendors(): Promise<CanonicalVendor[]> {
  await new Promise((resolve) => setTimeout(resolve, 60))
  return [...CANONICAL_VENDORS]
}

export async function getTopVendors(): Promise<Vendor[]> {
  await new Promise((resolve) => setTimeout(resolve, 80))
  if (shouldSimulate('error')) {
    throw new Error('Failed to load verified vendors.')
  }
  return [...MOCK_VENDORS]
}

export async function getFeaturedEquipment(): Promise<EquipmentListingView[]> {
  await new Promise((resolve) => setTimeout(resolve, 100))
  if (shouldSimulate('error')) {
    throw new Error('Failed to load featured event equipment. Simulated error active (?simulate=error).')
  }
  // Featured items: 1 through 8 (one from each canonical category)
  return MOCK_EQUIPMENT.slice(0, 8).map((eq) => ({ ...eq }))
}

export async function getEquipmentById(id: string): Promise<EquipmentListingView | null> {
  await new Promise((resolve) => setTimeout(resolve, 80))
  const item = MOCK_EQUIPMENT.find((eq) => eq.equipment_id === id)
  return item ? { ...item } : null
}

export async function getFaqs(): Promise<FAQItem[]> {
  await new Promise((resolve) => setTimeout(resolve, 50))
  return [...MOCK_FAQS]
}

export * from './account'
export * from './account-store'
