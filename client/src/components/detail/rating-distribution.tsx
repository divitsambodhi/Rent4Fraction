import { cn } from '@/lib/utils'

interface RatingDistributionProps {
  distribution: Record<1 | 2 | 3 | 4 | 5, number>
  totalCount: number
  activeRating?: number
  onSelectRating: (rating?: number) => void
  className?: string
}

export function RatingDistribution({
  distribution,
  totalCount,
  activeRating,
  onSelectRating,
  className,
}: RatingDistributionProps) {
  const stars: (1 | 2 | 3 | 4 | 5)[] = [5, 4, 3, 2, 1]

  return (
    <div className={cn('space-y-1.5 w-full', className)} role="group" aria-label="Rating filter breakdown">
      {stars.map((star) => {
        const count = distribution[star] || 0
        const percentage = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0
        const isSelected = activeRating === star

        return (
          <button
            key={star}
            type="button"
            onClick={() => onSelectRating(isSelected ? undefined : star)}
            aria-pressed={isSelected}
            aria-label={`Filter by ${star} star reviews, ${count} reviews`}
            className={cn(
              'w-full flex items-center gap-2 py-1 px-2 rounded-[8px] text-xs font-medium transition-colors text-left group cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-brand',
              isSelected
                ? 'bg-brand/10 text-brand font-semibold'
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
            )}
          >
            <span className="w-12 shrink-0">{star} stars</span>

            {/* Progress Track */}
            <div className="flex-1 h-2 bg-muted/60 rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-300',
                  isSelected ? 'bg-brand' : 'bg-brand/60 group-hover:bg-brand',
                )}
                style={{ width: `${percentage}%` }}
              />
            </div>

            <span className="w-10 text-right tabular-nums text-[11px] shrink-0 opacity-80 group-hover:opacity-100">
              {count}
            </span>
          </button>
        )
      })}
    </div>
  )
}
