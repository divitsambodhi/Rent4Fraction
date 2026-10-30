import { Search, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CANONICAL_CATEGORIES } from '@/lib/api/canonical-ids'
import { cn } from '@/lib/utils'

export interface EmptyResultsProps {
  onClearFilters: () => void
  onSelectCategory: (categoryId: string) => void
  hasFilters?: boolean
  className?: string
}

const POPULAR_CATEGORY_IDS = ['1', '2', '4', '5'] // Furniture & Seating, Tents, Sound & DJ, Lighting & Effects

export function EmptyResults({
  onClearFilters,
  onSelectCategory,
  hasFilters = true,
  className,
}: EmptyResultsProps) {
  const popularCategories = CANONICAL_CATEGORIES.filter((c) =>
    POPULAR_CATEGORY_IDS.includes(c.id),
  )

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center p-8 sm:p-14 rounded-[20px] border border-dashed border-border bg-surface/60',
        className,
      )}
    >
      <div className="size-16 rounded-full bg-brand/10 text-brand flex items-center justify-center mb-4 shadow-xs">
        <Search className="size-8" />
      </div>

      <h3 className="font-serif text-xl sm:text-2xl font-semibold text-foreground mb-2">
        No equipment matches your filters
      </h3>

      <p className="text-sm text-muted-foreground max-w-md mb-6 leading-relaxed">
        {hasFilters
          ? 'Try broadening your keyword, removing price or rating constraints, or clearing specific event dates to see available inventory.'
          : 'We could not find any active listings under this selection.'}
      </p>

      {/* Clear Filters CTA */}
      <Button
        type="button"
        onClick={onClearFilters}
        className="h-11 px-6 rounded-[10px] font-semibold bg-brand text-white hover:bg-brand-hover shadow-xs gap-2 mb-8"
      >
        <RotateCcw className="size-4" />
        <span>Clear all filters</span>
      </Button>

      {/* 4 Popular Category Suggestion Chips */}
      <div className="w-full pt-6 border-t border-border/80 max-w-lg">
        <p className="text-xs font-semibold text-muted-foreground mb-3">
          Or explore popular event categories:
        </p>

        <div className="flex flex-wrap items-center justify-center gap-2">
          {popularCategories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(cat.id)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium bg-surface border border-border text-foreground hover:border-brand hover:text-brand hover:bg-brand/5 transition-all shadow-2xs"
            >
              <span>{cat.name}</span>
              <span className="text-[10px] text-muted-foreground">→</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
