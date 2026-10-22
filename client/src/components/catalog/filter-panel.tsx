import { useState, useEffect } from 'react'
import {
  ChevronDown,
  ChevronUp,
  Search,
  Star,
  RotateCcw,
} from 'lucide-react'
import { CategoryTreeFilter } from './category-tree-filter'
import { PriceRangeSlider } from './price-range-slider'
import type { CategoryTreeGroup, CanonicalVendor } from '@/lib/api'
import type { ParsedCatalogParams } from '@/hooks/use-catalog-params'
import { CANONICAL_CATEGORIES, CANONICAL_GROUPS } from '@/lib/api/canonical-ids'
import { cn } from '@/lib/utils'

export const FILTERS_COLLAPSED_BY_DEFAULT = true

const STORAGE_KEY = 'r4f_catalog_filters_open_v1'

export interface FilterPanelProps {
  params: ParsedCatalogParams
  categoryTree: CategoryTreeGroup[]
  vendors: CanonicalVendor[]
  onUpdateParams: (
    updates: Partial<Record<string, string | number | boolean | null | undefined>>,
  ) => void
  onClearAll: () => void
  className?: string
}

function loadStoredOpenSections(): Record<string, boolean> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    // ignore
  }
  return {}
}

export function FilterPanel({
  params,
  categoryTree,
  vendors,
  onUpdateParams,
  onClearAll,
  className,
}: FilterPanelProps) {
  // Check which sections have active values
  const hasActiveCategory = Boolean(params.category && params.category !== 'all')
  const hasActivePrice = Boolean(params.price_min !== undefined || params.price_max !== undefined)
  const hasActiveRating = Boolean(params.rating !== undefined)
  const hasActivePreferences = Boolean(params.delivery || params.available)
  const hasActiveVendor = Boolean(params.vendor && params.vendor !== 'all')

  // Initialize open/closed state:
  // 1. If stored in sessionStorage, respect it
  // 2. If group has an active value, automatically open it
  // 3. Otherwise, collapse by default
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    const stored = loadStoredOpenSections()
    return {
      category: hasActiveCategory ? true : (stored.category ?? !FILTERS_COLLAPSED_BY_DEFAULT),
      price: hasActivePrice ? true : (stored.price ?? !FILTERS_COLLAPSED_BY_DEFAULT),
      rating: hasActiveRating ? true : (stored.rating ?? !FILTERS_COLLAPSED_BY_DEFAULT),
      preferences: hasActivePreferences ? true : (stored.preferences ?? !FILTERS_COLLAPSED_BY_DEFAULT),
      vendor: hasActiveVendor ? true : (stored.vendor ?? !FILTERS_COLLAPSED_BY_DEFAULT),
    }
  })

  // Automatically open any section that gains an active value
  useEffect(() => {
    setOpenSections((prev) => {
      let changed = false
      const next = { ...prev }
      if (hasActiveCategory && !next.category) {
        next.category = true
        changed = true
      }
      if (hasActivePrice && !next.price) {
        next.price = true
        changed = true
      }
      if (hasActiveRating && !next.rating) {
        next.rating = true
        changed = true
      }
      if (hasActivePreferences && !next.preferences) {
        next.preferences = true
        changed = true
      }
      if (hasActiveVendor && !next.vendor) {
        next.vendor = true
        changed = true
      }
      return changed ? next : prev
    })
  }, [
    hasActiveCategory,
    hasActivePrice,
    hasActiveRating,
    hasActivePreferences,
    hasActiveVendor,
  ])

  // Vendor search query state
  const [vendorSearch, setVendorSearch] = useState('')

  const toggleSection = (section: string) => {
    setOpenSections((prev) => {
      const next = {
        ...prev,
        [section]: !prev[section],
      }
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        // ignore
      }
      return next
    })
  }

  const filteredVendors = vendors.filter((v) =>
    v.name.toLowerCase().includes(vendorSearch.toLowerCase()),
  )

  const hasEventDates = Boolean(params.from && params.to)

  // Value Summaries
  const categorySummary = (() => {
    if (!params.category || params.category === 'all') return 'All categories'
    const cat = CANONICAL_CATEGORIES.find((c) => c.id === params.category)
    if (cat) return cat.name
    const group = CANONICAL_GROUPS.find((g) => g.id === params.category)
    if (group) return group.name
    return params.category
  })()

  const priceSummary = (() => {
    if (params.price_min !== undefined || params.price_max !== undefined) {
      return `₹${params.price_min ?? 0} to ₹${params.price_max ?? 10000}`
    }
    return 'All prices'
  })()

  const ratingSummary = (() => {
    if (params.rating !== undefined) {
      return `${params.rating.toFixed(1)}★ and above`
    }
    return 'Any rating'
  })()

  const preferencesSummary = (() => {
    const parts: string[] = []
    if (params.delivery) parts.push('Delivery')
    if (params.available) parts.push('Available for dates')
    return parts.length > 0 ? parts.join(', ') : 'All'
  })()

  const vendorSummary = (() => {
    if (!params.vendor || params.vendor === 'all') return 'All vendors'
    const v = vendors.find((ven) => ven.id === params.vendor)
    return v ? v.name : params.vendor
  })()

  return (
    <div
      className={cn(
        'rounded-[16px] border border-border bg-surface shadow-xs divide-y divide-border/80 overflow-hidden',
        className,
      )}
    >
      {/* Panel Header */}
      <div className="flex items-center justify-between px-5 py-4 bg-muted/20">
        <div className="flex items-center gap-2">
          <span className="font-serif text-base font-semibold text-foreground">
            Filters
          </span>
          {params.activeFilterCount > 0 && (
            <span className="size-5 rounded-full bg-brand text-white text-[11px] font-bold flex items-center justify-center">
              {params.activeFilterCount}
            </span>
          )}
        </div>

        {params.activeFilterCount > 0 && (
          <button
            type="button"
            onClick={onClearAll}
            className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:text-brand-hover hover:underline transition-colors cursor-pointer"
          >
            <RotateCcw className="size-3" />
            <span>Clear all</span>
          </button>
        )}
      </div>

      {/* 1. Category Tree Section */}
      <div className="p-4 sm:p-5">
        <button
          type="button"
          onClick={() => toggleSection('category')}
          aria-expanded={openSections.category}
          className="w-full flex items-center justify-between text-left group cursor-pointer"
        >
          <div className="pr-2">
            <span className="text-sm font-semibold text-foreground group-hover:text-brand transition-colors block">
              Event Category
            </span>
            <span className="text-xs text-muted-foreground block mt-0.5 truncate max-w-[200px]">
              {categorySummary}
            </span>
          </div>
          {openSections.category ? (
            <ChevronUp className="size-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronDown className="size-4 text-muted-foreground shrink-0" />
          )}
        </button>

        {openSections.category && (
          <div className="mt-3.5 pt-2 border-t border-border/50">
            <CategoryTreeFilter
              tree={categoryTree}
              selectedCategory={params.category}
              onSelectCategory={(catId) => onUpdateParams({ category: catId })}
            />
          </div>
        )}
      </div>

      {/* 2. Price Range Slider Section */}
      <div className="p-4 sm:p-5">
        <button
          type="button"
          onClick={() => toggleSection('price')}
          aria-expanded={openSections.price}
          className="w-full flex items-center justify-between text-left group cursor-pointer"
        >
          <div className="pr-2">
            <span className="text-sm font-semibold text-foreground group-hover:text-brand transition-colors block">
              Price per day
            </span>
            <span className="text-xs text-muted-foreground block mt-0.5">
              {priceSummary}
            </span>
          </div>
          {openSections.price ? (
            <ChevronUp className="size-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronDown className="size-4 text-muted-foreground shrink-0" />
          )}
        </button>

        {openSections.price && (
          <div className="mt-3.5 pt-2 border-t border-border/50">
            <PriceRangeSlider
              min={params.price_min ?? 0}
              max={params.price_max ?? 10000}
              onChange={({ min, max }) => {
                onUpdateParams({ price_min: min, price_max: max })
              }}
            />
          </div>
        )}
      </div>

      {/* 3. Minimum Rating Section */}
      <div className="p-4 sm:p-5">
        <button
          type="button"
          onClick={() => toggleSection('rating')}
          aria-expanded={openSections.rating}
          className="w-full flex items-center justify-between text-left group cursor-pointer"
        >
          <div className="pr-2">
            <span className="text-sm font-semibold text-foreground group-hover:text-brand transition-colors block">
              Minimum Rating
            </span>
            <span className="text-xs text-muted-foreground block mt-0.5">
              {ratingSummary}
            </span>
          </div>
          {openSections.rating ? (
            <ChevronUp className="size-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronDown className="size-4 text-muted-foreground shrink-0" />
          )}
        </button>

        {openSections.rating && (
          <div className="mt-3.5 pt-2 border-t border-border/50 space-y-1" role="radiogroup" aria-label="Minimum rating">
            {/* Any rating radio option */}
            <label
              className={cn(
                'flex items-center justify-between p-2 rounded-[8px] cursor-pointer transition-colors text-xs',
                params.rating === undefined
                  ? 'bg-brand/10 text-brand font-semibold'
                  : 'text-foreground hover:bg-muted/40 font-medium',
              )}
            >
              <div className="flex items-center gap-2.5">
                <input
                  type="radio"
                  name="rating-filter"
                  checked={params.rating === undefined}
                  onChange={() => {
                    onUpdateParams({ rating: undefined })
                  }}
                  className="size-4 accent-brand focus:ring-2 focus:ring-brand cursor-pointer"
                />
                <span>Any rating</span>
              </div>
            </label>

            {[
              { val: 4.5, label: '4.5 and above' },
              { val: 4.0, label: '4.0 and above' },
              { val: 3.5, label: '3.5 and above' },
              { val: 3.0, label: '3.0 and above' },
            ].map(({ val, label }) => {
              const isChecked = params.rating === val
              return (
                <label
                  key={val}
                  className={cn(
                    'flex items-center justify-between p-2 rounded-[8px] cursor-pointer transition-colors text-xs',
                    isChecked
                      ? 'bg-brand/10 text-brand font-semibold'
                      : 'text-foreground hover:bg-muted/40 font-medium',
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <input
                      type="radio"
                      name="rating-filter"
                      checked={isChecked}
                      onChange={() => {
                        onUpdateParams({ rating: val })
                      }}
                      className="size-4 accent-brand focus:ring-2 focus:ring-brand cursor-pointer"
                    />
                    <span>{label}</span>
                  </div>

                  <div className="flex items-center gap-1 text-warning">
                    <Star className="size-3.5 fill-warning text-warning" />
                    <span className="tabular-nums font-semibold">{val.toFixed(1)}</span>
                  </div>
                </label>
              )
            })}
          </div>
        )}
      </div>

      {/* 4. Delivery & Availability Preferences */}
      <div className="p-4 sm:p-5">
        <button
          type="button"
          onClick={() => toggleSection('preferences')}
          aria-expanded={openSections.preferences}
          className="w-full flex items-center justify-between text-left group cursor-pointer"
        >
          <div className="pr-2">
            <span className="text-sm font-semibold text-foreground group-hover:text-brand transition-colors block">
              Booking Preferences
            </span>
            <span className="text-xs text-muted-foreground block mt-0.5 truncate max-w-[200px]">
              {preferencesSummary}
            </span>
          </div>
          {openSections.preferences ? (
            <ChevronUp className="size-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronDown className="size-4 text-muted-foreground shrink-0" />
          )}
        </button>

        {openSections.preferences && (
          <div className="mt-3.5 pt-2 border-t border-border/50 space-y-3">
            {/* Delivery Switch */}
            <label className="flex items-center justify-between cursor-pointer group">
              <span className="text-xs font-medium text-foreground group-hover:text-brand transition-colors">
                Delivery available
              </span>
              <input
                type="checkbox"
                checked={Boolean(params.delivery)}
                onChange={(e) =>
                  onUpdateParams({ delivery: e.target.checked ? '1' : undefined })
                }
                className="size-4 rounded accent-brand focus:ring-2 focus:ring-brand cursor-pointer"
              />
            </label>

            {/* Availability for Dates Switch */}
            <div>
              <label
                className={cn(
                  'flex items-center justify-between transition-colors',
                  !hasEventDates
                    ? 'opacity-60 cursor-not-allowed'
                    : 'cursor-pointer group',
                )}
              >
                <span
                  className={cn(
                    'text-xs font-medium',
                    hasEventDates
                      ? 'text-foreground group-hover:text-brand'
                      : 'text-muted-foreground',
                  )}
                >
                  Only show available for my dates
                </span>
                <input
                  type="checkbox"
                  disabled={!hasEventDates}
                  checked={Boolean(params.available && hasEventDates)}
                  onChange={(e) =>
                    onUpdateParams({
                      available: e.target.checked ? '1' : undefined,
                    })
                  }
                  className="size-4 rounded accent-brand focus:ring-2 focus:ring-brand cursor-pointer disabled:cursor-not-allowed"
                />
              </label>

              {!hasEventDates && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  Pick event dates to filter by availability
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 5. Verified Vendors Section */}
      <div className="p-4 sm:p-5">
        <button
          type="button"
          onClick={() => toggleSection('vendor')}
          aria-expanded={openSections.vendor}
          className="w-full flex items-center justify-between text-left group cursor-pointer"
        >
          <div className="pr-2">
            <span className="text-sm font-semibold text-foreground group-hover:text-brand transition-colors block">
              Verified Vendors
            </span>
            <span className="text-xs text-muted-foreground block mt-0.5 truncate max-w-[200px]">
              {vendorSummary}
            </span>
          </div>
          {openSections.vendor ? (
            <ChevronUp className="size-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronDown className="size-4 text-muted-foreground shrink-0" />
          )}
        </button>

        {openSections.vendor && (
          <div className="mt-3.5 pt-2 border-t border-border/50 space-y-2.5">
            {/* Vendor search input */}
            <div className="relative flex items-center mb-2">
              <Search className="absolute left-2.5 size-3.5 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={vendorSearch}
                onChange={(e) => setVendorSearch(e.target.value)}
                placeholder="Search vendors..."
                className="w-full h-8 pl-8 pr-2 rounded-[6px] border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand"
              />
            </div>

            <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
              <button
                type="button"
                onClick={() => onUpdateParams({ vendor: undefined })}
                className={cn(
                  'w-full flex items-center justify-between px-2 py-1.5 rounded-[6px] text-xs transition-colors text-left cursor-pointer',
                  !params.vendor || params.vendor === 'all'
                    ? 'bg-brand/10 text-brand font-semibold'
                    : 'text-foreground hover:bg-muted/40 font-medium',
                )}
              >
                <span>All vendors</span>
              </button>

              {filteredVendors.map((v) => {
                const isSelected = params.vendor === v.id
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => onUpdateParams({ vendor: v.id })}
                    className={cn(
                      'w-full flex items-center justify-between px-2 py-1.5 rounded-[6px] text-xs transition-colors text-left cursor-pointer',
                      isSelected
                        ? 'bg-brand/10 text-brand font-semibold'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/40 font-medium',
                    )}
                  >
                    <span className="truncate mr-1">{v.name}</span>
                    <span className="text-[11px] tabular-nums text-muted-foreground shrink-0">
                      {v.item_count} items
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
