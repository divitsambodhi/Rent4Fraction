import React, { useState } from 'react'
import { Star } from 'lucide-react'
import { useMediaQuery } from '@/hooks/use-media-query'
import { cn } from '@/lib/utils'

export interface StarRatingInputProps {
  value: number
  onChange: (value: number) => void
  label?: string
  className?: string
  disabled?: boolean
}

const RATING_TEXTS: Record<number, string> = {
  1: '1 out of 5, Poor',
  2: '2 out of 5, Fair',
  3: '3 out of 5, Good',
  4: '4 out of 5, Very good',
  5: '5 out of 5, Excellent',
}

/**
 * StarRatingInput: Accessible interactive rating control per task C2.
 * - Choosing Nth star fills stars 1 to N (cumulative)
 * - Desktop hover previews fill up to hovered star (only with hover-capable pointer)
 * - Tapping or clicking sets the value; clicking the same star keeps it selected
 * - Keyboard: radiogroup with arrow keys, Home (1) and End (5)
 * - Visible label under the stars reads "4 out of 5, Good" style text per value
 * - No half stars
 * - 44px hit areas per star
 * - Filled color uses warning token, unfilled stars use border token with outline
 */
export function StarRatingInput({
  value,
  onChange,
  label = 'Rating',
  className,
  disabled = false,
}: StarRatingInputProps) {
  const isHoverCapable = useMediaQuery('(hover: hover)')
  const [hoverRating, setHoverRating] = useState<number | null>(null)

  const activeRating = (isHoverCapable && hoverRating !== null) ? hoverRating : value

  const handleKeyDown = (e: React.KeyboardEvent, star: number) => {
    if (disabled) return

    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault()
      const next = Math.min(5, (value || star) + 1)
      onChange(next)
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault()
      const prev = Math.max(1, (value || star) - 1)
      onChange(prev)
    } else if (e.key === 'Home') {
      e.preventDefault()
      onChange(1)
    } else if (e.key === 'End') {
      e.preventDefault()
      onChange(5)
    } else if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      onChange(star)
    }
  }

  const currentLabelText = activeRating > 0 ? RATING_TEXTS[activeRating] : 'Select a rating'

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <span className="block text-xs font-semibold text-foreground">
          {label}
        </span>
      )}

      {/* Radiogroup container with 44px hit areas */}
      <div
        role="radiogroup"
        aria-label={label}
        className="flex items-center gap-1"
        onMouseLeave={() => {
          if (isHoverCapable) setHoverRating(null)
        }}
      >
        {[1, 2, 3, 4, 5].map((star) => {
          const isFilled = star <= activeRating
          const isCurrent = value === star

          return (
            <button
              key={star}
              type="button"
              role="radio"
              aria-checked={isCurrent}
              aria-label={`${star} star${star > 1 ? 's' : ''}`}
              disabled={disabled}
              tabIndex={isCurrent || (value === 0 && star === 1) ? 0 : -1}
              onKeyDown={(e) => handleKeyDown(e, star)}
              onClick={() => {
                if (!disabled) {
                  onChange(star)
                }
              }}
              onMouseEnter={() => {
                if (isHoverCapable && !disabled) {
                  setHoverRating(star)
                }
              }}
              className={cn(
                'min-w-[44px] min-h-[44px] flex items-center justify-center p-2 rounded-sm select-none transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand cursor-pointer disabled:cursor-not-allowed disabled:opacity-50',
              )}
            >
              <Star
                size={24}
                className={cn(
                  'transition-all duration-100',
                  isFilled
                    ? 'fill-warning stroke-warning text-warning'
                    : 'fill-transparent stroke-border text-border',
                )}
              />
            </button>
          )
        })}
      </div>

      {/* Visible label under stars */}
      <div className="text-xs font-medium text-text-secondary h-4">
        {currentLabelText}
      </div>
    </div>
  )
}
