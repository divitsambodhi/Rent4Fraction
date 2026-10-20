import { Check, CornerDownRight, MessageSquareQuote } from 'lucide-react'
import { StarRating } from '@/components/shared/star-rating'
import type { Review } from '@/types'
import { cn } from '@/lib/utils'

interface ReviewCardProps {
  review: Review
  vendorName?: string
  className?: string
}

function getInitials(name: string): string {
  const parts = name.trim().split(' ')
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

export function ReviewCard({ review, vendorName, className }: ReviewCardProps) {
  const initials = getInitials(review.user_name)

  return (
    <article
      className={cn(
        'p-4 sm:p-5 rounded-[12px] border border-border/80 bg-surface space-y-3 shadow-2xs',
        className,
      )}
    >
      {/* Top Header: Avatar, Name, Stars, Date */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-full bg-brand/10 text-brand font-semibold text-xs flex items-center justify-center shrink-0 border border-brand/20">
            {initials}
          </div>

          <div>
            <div className="font-semibold text-foreground text-sm leading-tight">
              {review.user_name}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <StarRating rating={review.rating} size="sm" />
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {review.review_date}
              </span>
            </div>
          </div>
        </div>

        {/* Verified Rental Badge */}
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand/10 text-brand text-[11px] font-medium shrink-0">
          <Check className="size-3 stroke-[2.5]" />
          <span>Verified rental</span>
        </span>
      </div>

      {/* Review Comment */}
      {review.comment && (
        <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed pl-12">
          {review.comment}
        </p>
      )}

      {/* Optional Nested Vendor Reply */}
      {review.vendor_reply && (
        <div className="ml-10 sm:ml-12 mt-2 p-3 sm:p-3.5 rounded-[10px] bg-muted/40 border-l-2 border-brand/70 text-xs text-foreground/80 space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-foreground text-[11px]">
            <CornerDownRight className="size-3 text-brand" />
            <MessageSquareQuote className="size-3.5 text-brand" />
            <span>Response from {vendorName || 'the vendor'}</span>
          </div>
          <p className="leading-relaxed pl-4">{review.vendor_reply}</p>
        </div>
      )}
    </article>
  )
}
