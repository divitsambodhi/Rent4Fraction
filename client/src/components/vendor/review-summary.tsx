import { Star } from 'lucide-react'
import { RatingDistribution } from '@/components/detail/rating-distribution'
import { cn } from '@/lib/utils'

interface ReviewSummaryProps {
  averageRating: number
  totalReviews: number
  distribution: Record<1 | 2 | 3 | 4 | 5, number>
  repliedCount: number
  activeRating?: number
  onSelectRating: (rating?: number) => void
  className?: string
}

export function ReviewSummary({
  averageRating,
  totalReviews,
  distribution,
  repliedCount,
  activeRating,
  onSelectRating,
  className,
}: ReviewSummaryProps) {
  const replyPercentage = totalReviews > 0 ? Math.round((repliedCount / totalReviews) * 100) : 0

  return (
    <div
      className={cn(
        'rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-6 items-center',
        className,
      )}
    >
      {/* Average Score */}
      <div className="flex flex-col items-center md:items-start text-center md:text-left space-y-1">
        <span className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground tabular-nums">
          {averageRating.toFixed(1)}
        </span>
        <div className="flex items-center text-amber-500 py-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={cn(
                'size-4',
                i < Math.round(averageRating) ? 'fill-amber-500 text-amber-500' : 'text-muted-foreground/30',
              )}
            />
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Based on <strong className="text-foreground">{totalReviews}</strong> verified customer reviews
        </p>
      </div>

      {/* Rating Distribution Breakdown */}
      <div className="md:border-x md:border-border md:px-6">
        <RatingDistribution
          distribution={distribution}
          totalCount={totalReviews}
          activeRating={activeRating}
          onSelectRating={onSelectRating}
        />
      </div>

      {/* Replied to X of Y Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-foreground">Response rate</span>
          <span className="text-muted-foreground tabular-nums font-medium">
            {repliedCount} of {totalReviews} replied ({replyPercentage}%)
          </span>
        </div>
        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-brand rounded-full transition-all duration-300"
            style={{ width: `${replyPercentage}%` }}
          />
        </div>
        <p className="text-[11px] text-muted-foreground leading-snug">
          Thoughtful replies build renter confidence and resolve questions quickly.
        </p>
      </div>
    </div>
  )
}
