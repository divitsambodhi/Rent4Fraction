import { useState } from 'react'
import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StarRatingInputProps {
  value: number
  onChange: (value: number) => void
  label?: string
  className?: string
}

export function StarRatingInput({
  value,
  onChange,
  label = 'Rating',
  className,
}: StarRatingInputProps) {
  const [hoverRating, setHoverRating] = useState<number | null>(null)

  const activeRating = hoverRating !== null ? hoverRating : value

  const handleKeyDown = (e: React.KeyboardEvent, star: number) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault()
      onChange(Math.min(5, star + 1))
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault()
      onChange(Math.max(1, star - 1))
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onChange(star)
    }
  }

  const ratingDescriptions = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent']

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center justify-between text-xs">
        <label className="font-semibold text-foreground">{label}</label>
        {activeRating > 0 && (
          <span className="text-xs font-medium text-brand">
            {ratingDescriptions[activeRating]} ({activeRating} of 5)
          </span>
        )}
      </div>

      <div
        role="radiogroup"
        aria-label={label}
        className="flex items-center gap-1.5"
        onMouseLeave={() => setHoverRating(null)}
      >
        {[1, 2, 3, 4, 5].map((star) => {
          const isFilled = star <= activeRating

          return (
            <button
              key={star}
              type="button"
              role="radio"
              aria-checked={value === star}
              aria-label={`${star} star${star > 1 ? 's' : ''}`}
              tabIndex={value === star || (value === 0 && star === 1) ? 0 : -1}
              onKeyDown={(e) => handleKeyDown(e, star)}
              onClick={() => onChange(star)}
              onMouseEnter={() => setHoverRating(star)}
              className="p-1 rounded-md text-muted-foreground hover:text-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand transition-colors cursor-pointer"
            >
              <Star
                className={cn(
                  'size-6 stroke-[1.75] transition-all transform hover:scale-110',
                  isFilled ? 'fill-brand text-brand' : 'fill-transparent text-muted-foreground/40'
                )}
              />
            </button>
          )
        })}
      </div>
    </div>
  )
}
