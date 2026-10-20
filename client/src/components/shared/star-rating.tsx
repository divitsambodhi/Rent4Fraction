import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StarRatingProps {
  rating: number
  reviewCount?: number
  showCount?: boolean
  className?: string
  starSize?: number
  size?: 'sm' | 'md' | 'lg'
}

export function StarRating({
  rating,
  reviewCount,
  showCount = true,
  className,
  starSize,
  size = 'sm',
}: StarRatingProps) {
  const resolvedStarSize =
    starSize || (size === 'lg' ? 22 : size === 'md' ? 18 : 14)
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 text-[13px] text-foreground font-medium',
        className,
      )}
    >
      <div className="flex items-center text-warning" aria-hidden="true">
        <Star
          size={resolvedStarSize}
          className="fill-warning stroke-warning shrink-0"
        />
      </div>
      <span className="font-semibold tabular-nums">{rating.toFixed(1)}</span>
      {showCount && reviewCount !== undefined && (
        <span className="text-muted-foreground text-xs tabular-nums">
          ({reviewCount})
        </span>
      )}
    </div>
  )
}
