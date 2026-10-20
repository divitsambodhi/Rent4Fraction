import { useMemo, useCallback } from 'react'
import { useAppSearchParams } from '@/components/shared/app-link'
import type { CatalogSearchParams } from '@/lib/api'

export interface ParsedCatalogParams {
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
  sort: 'relevance' | 'price_asc' | 'price_desc' | 'rating' | 'reviews' | 'newest'
  page: number
  simulate?: 'empty' | 'error'
  rentalDays: number
  activeFilterCount: number
}

const VALID_SORTS = [
  'relevance',
  'price_asc',
  'price_desc',
  'rating',
  'reviews',
  'newest',
] as const

const VALID_RATINGS = [3.5, 4, 4.5]

function isValidDate(dateStr?: string | null): boolean {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false
  const d = new Date(dateStr)
  return !isNaN(d.getTime())
}

/**
 * Hook to parse, sanitize, and manipulate catalog search URL query params.
 */
export function useCatalogParams() {
  const [searchParams, setSearchParams] = useAppSearchParams()

  const parsed = useMemo<ParsedCatalogParams>(() => {
    const rawQ = searchParams.get('q')?.trim() || undefined
    const rawCat = searchParams.get('category')?.trim() || undefined
    const rawVendor = searchParams.get('vendor')?.trim() || undefined
    const rawFrom = searchParams.get('from')?.trim() || undefined
    const rawTo = searchParams.get('to')?.trim() || undefined
    const rawPriceMin = searchParams.get('price_min')
    const rawPriceMax = searchParams.get('price_max')
    const rawRating = searchParams.get('rating')
    const rawDelivery = searchParams.get('delivery')
    const rawAvailable = searchParams.get('available')
    const rawSort = searchParams.get('sort')
    const rawPage = searchParams.get('page')
    const rawSimulate = searchParams.get('simulate')

    // 1. Date Sanitization
    let from: string | undefined = isValidDate(rawFrom) ? rawFrom : undefined
    let to: string | undefined = isValidDate(rawTo) ? rawTo : undefined

    if (from && to) {
      if (to < from) {
        // Swap or clamp
        const temp = from
        from = to
        to = temp
      }
    }

    // 2. Rental days calculation: (to - from) + 1 inclusive
    let rentalDays = 0
    if (from && to) {
      const d1 = new Date(from)
      const d2 = new Date(to)
      rentalDays = Math.max(1, Math.round((d2.getTime() - d1.getTime()) / 86400000) + 1)
    }

    // 3. Price Sanitization (clamped 0 to 10,000)
    let price_min: number | undefined
    if (rawPriceMin !== null && rawPriceMin !== '') {
      const parsedMin = parseInt(rawPriceMin, 10)
      if (!isNaN(parsedMin)) {
        price_min = Math.max(0, Math.min(10000, parsedMin))
      }
    }

    let price_max: number | undefined
    if (rawPriceMax !== null && rawPriceMax !== '') {
      const parsedMax = parseInt(rawPriceMax, 10)
      if (!isNaN(parsedMax)) {
        price_max = Math.max(0, Math.min(10000, parsedMax))
      }
    }

    if (price_min !== undefined && price_max !== undefined && price_min > price_max) {
      const temp = price_min
      price_min = price_max
      price_max = temp
    }

    // 4. Rating Sanitization (only 3.5, 4, 4.5)
    let rating: number | undefined
    if (rawRating) {
      const numR = parseFloat(rawRating)
      if (VALID_RATINGS.includes(numR)) {
        rating = numR
      }
    }

    // 5. Switches
    const delivery = rawDelivery === '1'
    const available = rawAvailable === '1' && Boolean(from && to)

    // 6. Sort
    let sort: ParsedCatalogParams['sort'] = 'relevance'
    if (rawSort && (VALID_SORTS as readonly string[]).includes(rawSort)) {
      sort = rawSort as ParsedCatalogParams['sort']
    }

    // 7. Page
    let page = 1
    if (rawPage) {
      const p = parseInt(rawPage, 10)
      if (!isNaN(p) && p > 1) {
        page = p
      }
    }

    // 8. Simulate
    const simulate = rawSimulate === 'empty' || rawSimulate === 'error' ? rawSimulate : undefined

    // 9. Active Filter Count
    let activeFilterCount = 0
    if (rawQ) activeFilterCount++
    if (rawCat && rawCat !== 'all') activeFilterCount++
    if (rawVendor && rawVendor !== 'all') activeFilterCount++
    if (from || to) activeFilterCount++
    if (price_min !== undefined || price_max !== undefined) activeFilterCount++
    if (rating !== undefined) activeFilterCount++
    if (delivery) activeFilterCount++
    if (available) activeFilterCount++

    return {
      q: rawQ,
      category: rawCat,
      vendor: rawVendor,
      from,
      to,
      price_min,
      price_max,
      rating,
      delivery,
      available,
      sort,
      page,
      simulate,
      rentalDays,
      activeFilterCount,
    }
  }, [searchParams])

  /**
   * Update search params.
   * If filters change, resets page to 1 automatically.
   * Uses replace: true by default; push: true when page changes.
   */
  const setParams = useCallback(
    (
      updates: Partial<
        Record<
          | 'q'
          | 'category'
          | 'vendor'
          | 'from'
          | 'to'
          | 'price_min'
          | 'price_max'
          | 'rating'
          | 'delivery'
          | 'available'
          | 'sort'
          | 'page'
          | 'simulate',
          string | number | boolean | null | undefined
        >
      >,
      options: { push?: boolean } = {},
    ) => {
      const next = new URLSearchParams(searchParams)

      const isPageOnlyUpdate = Object.keys(updates).length === 1 && 'page' in updates

      // If any filter other than page changes, reset page to 1
      if (!isPageOnlyUpdate && !('page' in updates)) {
        next.delete('page')
      }

      Object.entries(updates).forEach(([key, val]) => {
        if (val === undefined || val === null || val === '' || val === false) {
          next.delete(key)
        } else if (typeof val === 'boolean') {
          if (val) next.set(key, '1')
          else next.delete(key)
        } else {
          next.set(key, String(val))
        }
      })

      setSearchParams(next, { replace: !options.push })
    },
    [searchParams, setSearchParams],
  )

  const clearAllFilters = useCallback(() => {
    const next = new URLSearchParams()
    // Preserve simulate if present in dev
    const sim = searchParams.get('simulate')
    if (sim) next.set('simulate', sim)
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  // Convert to clean CatalogSearchParams object for API search
  const apiSearchParams = useMemo<CatalogSearchParams>(() => {
    return {
      q: parsed.q,
      category: parsed.category,
      vendor: parsed.vendor,
      from: parsed.from,
      to: parsed.to,
      price_min: parsed.price_min,
      price_max: parsed.price_max,
      rating: parsed.rating,
      delivery: parsed.delivery,
      available: parsed.available,
      sort: parsed.sort,
      page: parsed.page,
      simulate: parsed.simulate,
    }
  }, [parsed])

  return {
    params: parsed,
    apiSearchParams,
    setParams,
    clearAllFilters,
  }
}
