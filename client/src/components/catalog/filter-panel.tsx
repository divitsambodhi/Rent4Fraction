import { useState } from 'react'
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
import { cn } from '@/lib/utils'

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

export function FilterPanel({
  params,
  categoryTree,
  vendors,
  onUpdateParams,
  onClearAll,
  className,
}: FilterPanelProps) {
  // Collapsible sections (all open by default)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    category: true,
    price: true,
    rating: true,
    preferences: true,
    vendor: true,
  })

  // Vendor search query state
  const [vendorSearch, setVendorSearch] = useState('')

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  const filteredVendors = vendors.filter((v) =>
    v.name.toLowerCase().includes(vendorSearch.toLowerCase()),
  )

  const hasEventDates = Boolean(params.from && params.to)

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
            className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:text-brand-hover hover:underline transition-colors"
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
          className="w-full flex items-center justify-between text-left group"
        >
          <span className="text-sm font-semibold text-foreground group-hover:text-brand transition-colors">
            Event Category
          </span>
          {openSections.category ? (
            <ChevronUp className="size-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="size-4 text-muted-foreground" />
          )}
        </button>

        {openSections.category && (
          <div className="mt-3.5">
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
          className="w-full flex items-center justify-between text-left group"
        >
          <span className="text-sm font-semibold text-foreground group-hover:text-brand transition-colors">
            Price per day
          </span>
          {openSections.price ? (
            <ChevronUp className="size-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="size-4 text-muted-foreground" />
          )}
        </button>

        {openSections.price && (
          <div className="mt-3.5">
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
          className="w-full flex items-center justify-between text-left group"
        >
          <span className="text-sm font-semibold text-foreground group-hover:text-brand transition-colors">
            Minimum Rating
          </span>
          {openSections.rating ? (
            <ChevronUp className="size-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="size-4 text-muted-foreground" />
          )}
        </button>

        {openSections.rating && (
          <div className="mt-3.5 space-y-2">
            {[
              { val: 4.5, label: '4.5 & up' },
              { val: 4.0, label: '4.0 & up' },
              { val: 3.5, label: '3.5 & up' },
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
                        onUpdateParams({ rating: isChecked ? undefined : val })
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
          className="w-full flex items-center justify-between text-left group"
        >
          <span className="text-sm font-semibold text-foreground group-hover:text-brand transition-colors">
            Booking Preferences
          </span>
          {openSections.preferences ? (
            <ChevronUp className="size-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="size-4 text-muted-foreground" />
          )}
        </button>

        {openSections.preferences && (
          <div className="mt-3.5 space-y-3">
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
                  Pick event dates in the search bar to filter by availability
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 5. Vendor Checklist Section */}
      <div className="p-4 sm:p-5">
        <button
          type="button"
          onClick={() => toggleSection('vendor')}
          aria-expanded={openSections.vendor}
          className="w-full flex items-center justify-between text-left group"
        >
          <span className="text-sm font-semibold text-foreground group-hover:text-brand transition-colors">
            Verified Vendors
          </span>
          {openSections.vendor ? (
            <ChevronUp className="size-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="size-4 text-muted-foreground" />
          )}
        </button>

        {openSections.vendor && (
          <div className="mt-3.5 space-y-2.5">
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
                  'w-full flex items-center justify-between px-2 py-1.5 rounded-[6px] text-xs transition-colors text-left',
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
                    onClick={() =>
                      onUpdateParams({
                        vendor: isSelected ? undefined : v.id,
                      })
                    }
                    className={cn(
                      'w-full flex items-center justify-between px-2 py-1.5 rounded-[6px] text-xs transition-colors text-left',
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
