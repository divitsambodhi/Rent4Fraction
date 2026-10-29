import { CloudImage } from '@/components/shared/cloud-image'
import { AppLink } from '@/components/shared/app-link'
import { StarRating } from '@/components/shared/star-rating'
import { ExternalLink, MessageSquare } from 'lucide-react'
import type { MyReview } from '@/types/account'
import { format, parseISO } from 'date-fns'

interface MyReviewCardProps {
  review: MyReview
  onOpenBooking: (bookingId: string) => void
}

function formatDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'dd MMM yyyy')
  } catch {
    return dateStr
  }
}

export function MyReviewCard({ review, onOpenBooking }: MyReviewCardProps) {
  return (
    <article className="p-5 rounded-[16px] bg-surface border border-border space-y-4 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        {/* Item Header */}
        <div className="flex items-center gap-3">
          <AppLink
            to={`/equipment/${review.equipment_id}`}
            className="size-12 rounded-[10px] bg-muted/40 border border-border/80 overflow-hidden shrink-0 flex items-center justify-center p-1"
          >
            <CloudImage
              src={review.equipment_image}
              alt={review.equipment_name}
              preset="thumb"
              aspectRatio="1/1"
              className="size-full rounded-none"
              imgClassName="w-full h-full object-contain"
            />
          </AppLink>

          <div className="space-y-0.5 min-w-0">
            <AppLink
              to={`/equipment/${review.equipment_id}`}
              className="font-serif font-bold text-sm text-foreground hover:text-brand transition-colors truncate block"
            >
              {review.equipment_name}
            </AppLink>
            <div className="text-xs text-muted-foreground">
              By {review.vendor_name}
            </div>
          </div>
        </div>

        {/* View Booking Button */}
        <button
          type="button"
          onClick={() => onOpenBooking(review.booking_id)}
          className="text-xs font-semibold text-brand hover:underline inline-flex items-center gap-1 self-start cursor-pointer"
        >
          <span>View booking #{review.booking_id}</span>
          <ExternalLink className="size-3" />
        </button>
      </div>

      {/* Rating and Date */}
      <div className="flex items-center justify-between text-xs pt-1 border-t border-border/60">
        <StarRating rating={review.rating} size="sm" />
        <span className="text-muted-foreground text-[11px]">
          Reviewed on {formatDate(review.created_at)}
        </span>
      </div>

      {/* Review Comment */}
      <p className="text-xs text-foreground/90 leading-relaxed bg-muted/20 p-3 rounded-lg border border-border/60">
        &ldquo;{review.comment}&rdquo;
      </p>

      {/* Nested Vendor Reply */}
      {review.vendor_reply && (
        <div className="ml-4 p-3 rounded-lg border border-border bg-muted/30 space-y-1 text-xs">
          <div className="font-semibold text-brand flex items-center gap-1.5 text-xs">
            <MessageSquare className="size-3.5" />
            <span>Response from {review.vendor_name}</span>
          </div>
          <p className="text-muted-foreground leading-relaxed italic text-xs">
            &ldquo;{review.vendor_reply}&rdquo;
          </p>
        </div>
      )}
    </article>
  )
}
