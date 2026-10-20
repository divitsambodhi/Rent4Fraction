import { SlidersHorizontal } from 'lucide-react'
import { SortSelect } from './sort-select'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface ResultsHeaderProps {
  total: number
  page: number
  pageSize: number
  loading: boolean
  sort: string
  activeFilterCount: number
  onSortChange: (sort: string) => void
  onOpenMobileFilters: () => void
  className?: string
}

export function ResultsHeader({
  total,
  page,
  pageSize,
  loading,
  sort,
  activeFilterCount,
  onSortChange,
  onOpenMobileFilters,
  className,
}: ResultsHeaderProps) {
  const startItem = total === 0 ? 0 : (page - 1) * pageSize + 1
  const endItem = Math.min(page * pageSize, total)

  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 pb-4 border-b border-border',
        className,
      )}
    >
      {/* Result Count Announcement with aria-live */}
      <div>
        <p className="text-[11px] uppercase tracking-wider font-semibold text-brand mb-0.5">
          Curated Inventory
        </p>
        <h2
          aria-live="polite"
          className="font-serif text-lg sm:text-xl font-semibold text-foreground"
        >
          {loading ? (
            'Finding equipment...'
          ) : total === 0 ? (
            '0 equipment found'
          ) : (
            <span>
              Showing <span className="tabular-nums">{startItem}–{endItem}</span> of{' '}
              <span className="tabular-nums">{total}</span> equipment
            </span>
          )}
        </h2>
      </div>

      {/* Controls: Mobile Filters Button + Sort Select */}
      <div className="flex items-center justify-between sm:justify-end gap-2.5">
        {/* Mobile Filters Trigger (lg:hidden) */}
        <Button
          type="button"
          variant="outline"
          onClick={onOpenMobileFilters}
          className="lg:hidden h-10 px-3.5 rounded-[10px] border-border bg-surface text-xs font-semibold text-foreground hover:bg-muted/50 gap-2 shrink-0"
        >
          <SlidersHorizontal className="size-3.5 text-brand" />
          <span>Filters</span>
          {activeFilterCount > 0 && (
            <span className="size-4.5 rounded-full bg-brand text-white text-[10px] font-bold flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </Button>

        {/* Sort Select */}
        <SortSelect value={sort} onValueChange={onSortChange} />
      </div>
    </div>
  )
}
