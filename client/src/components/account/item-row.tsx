import { useState } from 'react'
import { AppLink } from '@/components/shared/app-link'
import { StatusBadge } from '@/components/shared/status-badge'
import { StarRating } from '@/components/shared/star-rating'
import { ReviewDialog } from './review-dialog'
import { formatINR } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { MessageSquare, Star } from 'lucide-react'
import type { BookingItemDetail } from '@/types/account'
import { format, parseISO } from 'date-fns'
import { cn } from '@/lib/utils'

interface ItemRowProps {
  item: BookingItemDetail
  bookingId: string
  bookingStatus: string
  onReviewSubmitted?: () => void
  className?: string
}

function formatDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'dd MMM yyyy')
  } catch {
    return dateStr
  }
}

export function ItemRow({
  item,
  bookingId,
  bookingStatus,
  onReviewSubmitted,
  className,
}: ItemRowProps) {
  const [reviewOpen, setReviewOpen] = useState(false)

  const isReturned = item.status === 'returned' || bookingStatus === 'completed'
  const canReview = isReturned && item.review === null && item.status !== 'cancelled'

  return (
    <div
      className={cn(
        'p-3.5 rounded-[12px] bg-surface border border-border space-y-3 transition-colors',
        className
      )}
    >
      <div className="flex items-start gap-3">
        {/* Equipment Thumbnail linking to /equipment/ID */}
        <AppLink
          to={`/equipment/${item.equipment_id}`}
          className="size-16 rounded-[10px] bg-muted/40 border border-border/80 overflow-hidden shrink-0 flex items-center justify-center group"
        >
          <img
            src={item.image_url}
            alt={item.name}
            className="w-full h-full object-contain p-1 group-hover:scale-105 transition-transform duration-200"
          />
        </AppLink>

        {/* Item Info */}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <AppLink
              to={`/equipment/${item.equipment_id}`}
              className="font-serif font-bold text-xs sm:text-sm text-foreground hover:text-brand transition-colors line-clamp-1"
            >
              {item.name}
            </AppLink>
            <StatusBadge status={item.status} size="sm" />
          </div>

          <div className="text-[11px] text-muted-foreground tabular-nums">
            {item.quantity} {item.quantity === 1 ? 'unit' : 'units'} × {formatINR(item.unit_price)} × {item.days} {item.days === 1 ? 'day' : 'days'}
          </div>

          <div className="flex items-center justify-between pt-0.5">
            <span className="text-[11px] text-muted-foreground font-medium">
              Item total
            </span>
            <span className="font-bold text-xs sm:text-sm text-foreground tabular-nums font-sans">
              {formatINR(item.total_price)}
            </span>
          </div>
        </div>
      </div>

      {/* Review Section */}
      {canReview && (
        <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-2">
          <span className="text-[11px] text-muted-foreground">
            Returned equipment is eligible for review.
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setReviewOpen(true)}
            className="h-7 text-[11px] font-semibold gap-1.5 px-3"
          >
            <Star className="size-3 text-brand" />
            <span>Write review</span>
          </Button>
        </div>
      )}

      {/* Existing Review Display (Read-Only) */}
      {item.review && (
        <div className="pt-2 border-t border-border/60 space-y-2">
          <div className="p-3 rounded-lg bg-muted/30 border border-border/70 space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground">Your review</span>
              <div className="flex items-center gap-2">
                <StarRating rating={item.review.rating} size="sm" />
                <span className="text-[10px] text-muted-foreground">
                  {formatDate(item.review.created_at)}
                </span>
              </div>
            </div>
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              &ldquo;{item.review.comment}&rdquo;
            </p>

            {/* Vendor Reply */}
            {item.review.vendor_reply && (
              <div className="mt-2 pl-3 border-l-2 border-brand/40 bg-surface/80 p-2 rounded-r-md space-y-0.5">
                <div className="text-[10px] font-bold text-brand flex items-center gap-1">
                  <MessageSquare className="size-3" />
                  <span>Vendor Reply:</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed italic">
                  &ldquo;{item.review.vendor_reply}&rdquo;
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {reviewOpen && (
        <ReviewDialog
          open={reviewOpen}
          onOpenChange={setReviewOpen}
          bookingId={bookingId}
          equipmentId={item.equipment_id}
          equipmentName={item.name}
          vendorName={item.vendor_name}
          onReviewSubmitted={onReviewSubmitted}
        />
      )}
    </div>
  )
}
