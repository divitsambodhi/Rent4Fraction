import { X, RotateCcw } from 'lucide-react'
import type { ParsedCatalogParams } from '@/hooks/use-catalog-params'
import {
  CANONICAL_CATEGORIES,
  CANONICAL_GROUPS,
  CANONICAL_VENDORS,
} from '@/lib/api/canonical-ids'
import { formatINR } from '@/lib/format'
import { cn } from '@/lib/utils'

export interface ActiveFilterChipsProps {
  params: ParsedCatalogParams
  onRemoveParam: (key: string) => void
  onClearAll: () => void
  className?: string
}

export function ActiveFilterChips({
  params,
  onRemoveParam,
  onClearAll,
  className,
}: ActiveFilterChipsProps) {
  if (params.activeFilterCount === 0) return null

  // Resolve Category name
  let categoryLabel: string | undefined
  if (params.category) {
    const directCat = CANONICAL_CATEGORIES.find((c) => c.id === params.category)
    if (directCat) {
      categoryLabel = directCat.name
    } else {
      const group = CANONICAL_GROUPS.find((g) => g.id === params.category)
      if (group) {
        categoryLabel = `${group.name} (All)`
      } else {
        categoryLabel = params.category
      }
    }
  }

  // Resolve Vendor name
  let vendorLabel: string | undefined
  if (params.vendor) {
    const v = CANONICAL_VENDORS.find((ven) => ven.id === params.vendor)
    vendorLabel = v ? v.name : `Vendor ${params.vendor}`
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-2 pt-2.5', className)}>
      <span className="text-xs text-muted-foreground mr-1 font-medium">
        Active filters:
      </span>

      {/* 1. Keyword Chip */}
      {params.q && (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-surface border border-border text-foreground shadow-2xs">
          <span>&ldquo;{params.q}&rdquo;</span>
          <button
            type="button"
            onClick={() => onRemoveParam('q')}
            aria-label={`Remove filter keyword ${params.q}`}
            className="p-0.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="size-3" />
          </button>
        </span>
      )}

      {/* 2. Category Chip */}
      {categoryLabel && (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-brand/10 border border-brand/20 text-brand shadow-2xs">
          <span>{categoryLabel}</span>
          <button
            type="button"
            onClick={() => onRemoveParam('category')}
            aria-label={`Remove filter ${categoryLabel}`}
            className="p-0.5 rounded-full text-brand/80 hover:text-brand hover:bg-brand/20 transition-colors"
          >
            <X className="size-3" />
          </button>
        </span>
      )}

      {/* 3. Vendor Chip */}
      {vendorLabel && (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-surface border border-border text-foreground shadow-2xs">
          <span>{vendorLabel}</span>
          <button
            type="button"
            onClick={() => onRemoveParam('vendor')}
            aria-label={`Remove vendor filter ${vendorLabel}`}
            className="p-0.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="size-3" />
          </button>
        </span>
      )}

      {/* 4. Dates Chip */}
      {params.from && params.to && (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-surface border border-border text-foreground shadow-2xs">
          <span>
            {params.from} → {params.to} ({params.rentalDays}d)
          </span>
          <button
            type="button"
            onClick={() => {
              onRemoveParam('from')
              onRemoveParam('to')
            }}
            aria-label="Remove date range filter"
            className="p-0.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="size-3" />
          </button>
        </span>
      )}

      {/* 5. Price Range Chip */}
      {(params.price_min !== undefined || params.price_max !== undefined) && (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-surface border border-border text-foreground shadow-2xs">
          <span>
            {formatINR(params.price_min ?? 0)} –{' '}
            {formatINR(params.price_max ?? 10000)}
          </span>
          <button
            type="button"
            onClick={() => {
              onRemoveParam('price_min')
              onRemoveParam('price_max')
            }}
            aria-label="Remove price range filter"
            className="p-0.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="size-3" />
          </button>
        </span>
      )}

      {/* 6. Rating Chip */}
      {params.rating !== undefined && (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-surface border border-border text-foreground shadow-2xs">
          <span>{params.rating}+ Stars</span>
          <button
            type="button"
            onClick={() => onRemoveParam('rating')}
            aria-label={`Remove rating filter ${params.rating} stars`}
            className="p-0.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="size-3" />
          </button>
        </span>
      )}

      {/* 7. Delivery Chip */}
      {params.delivery && (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-surface border border-border text-foreground shadow-2xs">
          <span>Delivery Available</span>
          <button
            type="button"
            onClick={() => onRemoveParam('delivery')}
            aria-label="Remove delivery available filter"
            className="p-0.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="size-3" />
          </button>
        </span>
      )}

      {/* 8. Availability Chip */}
      {params.available && (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-surface border border-border text-foreground shadow-2xs">
          <span>Available for dates</span>
          <button
            type="button"
            onClick={() => onRemoveParam('available')}
            aria-label="Remove available dates filter"
            className="p-0.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="size-3" />
          </button>
        </span>
      )}

      {/* Clear All Button */}
      <button
        type="button"
        onClick={onClearAll}
        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-brand hover:text-brand-hover hover:underline transition-colors"
      >
        <RotateCcw className="size-3" />
        <span>Clear all</span>
      </button>
    </div>
  )
}
