import { StarRating } from '@/components/shared/star-rating'
import { RatingDistribution } from './rating-distribution'
import { cn } from '@/lib/utils'

interface ReviewSummaryProps {
  avgRating: number
  totalCount: number
  distribution: Record<1 | 2 | 3 | 4 | 5, number>
  activeRating?: number
  onSelectRating: (rating?: number) => void
  className?: string
}

export function ReviewSummary({
  avgRating,
  totalCount,
  distribution,
  activeRating,
  onSelectRating,
  className,
}: ReviewSummaryProps) {
  return (
    <div
      className={cn(
        'p-5 sm:p-6 rounded-[14px] bg-muted/30 border border-border flex flex-col md:flex-row items-center gap-6',
        className,
      )}
    >
      {/* Big Rating Left Column */}
      <div className="flex flex-col items-center justify-center text-center shrink-0 min-w-[140px]">
        <span className="font-serif text-4xl sm:text-5xl font-bold text-foreground tabular-nums tracking-tight">
          {avgRating.toFixed(1)}
        </span>

        <div className="mt-1">
          <StarRating rating={avgRating} size="md" />
        </div>

        <span className="text-xs text-muted-foreground mt-1 tabular-nums">
          Based on {totalCount} verified {totalCount === 1 ? 'rental' : 'rentals'}
        </span>
      </div>

      <div className="hidden md:block w-px h-28 bg-border/80 self-center" />

      {/* Distribution Bars Right Column */}
      <div className="flex-1 w-full">
        <RatingDistribution
          distribution={distribution}
          totalCount={totalCount}
          activeRating={activeRating}
          onSelectRating={onSelectRating}
        />
      </div>
    </div>
  )
}
