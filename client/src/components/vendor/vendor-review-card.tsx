import { useState } from 'react'
import { Check, CornerDownRight, MessageSquare, Pencil, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AppLink } from '@/components/shared/app-link'
import { ReplyComposer } from './reply-composer'
import type { VendorReview } from '@/types/vendor'
import { cn } from '@/lib/utils'

interface VendorReviewCardProps {
  review: VendorReview
  onSaveReply: (reviewId: string, replyText: string) => Promise<void>
  className?: string
}

function getInitials(name: string): string {
  const parts = name.trim().split(' ')
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

export function VendorReviewCard({
  review,
  onSaveReply,
  className,
}: VendorReviewCardProps) {
  const [isReplying, setIsReplying] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handlePostReply = async (text: string) => {
    setIsSubmitting(true)
    try {
      await onSaveReply(review.review_id, text)
      setIsReplying(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const initials = getInitials(review.customer_name)

  return (
    <article
      className={cn(
        'p-5 rounded-2xl border border-border bg-surface shadow-xs space-y-3 transition-shadow hover:shadow-sm',
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-full bg-brand/10 text-brand font-semibold text-xs flex items-center justify-center shrink-0 border border-brand/20">
            {initials}
          </div>
          <div>
            <div className="font-semibold text-foreground text-sm">
              {review.customer_name}
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
              <span className="flex items-center text-amber-500">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      'size-3.5',
                      i < review.rating ? 'fill-amber-500 text-amber-500' : 'text-muted-foreground/30',
                    )}
                  />
                ))}
              </span>
              <span>·</span>
              <span className="tabular-nums">{review.created_at}</span>
            </div>
          </div>
        </div>

        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-brand/10 text-brand text-[11px] font-medium shrink-0">
          <Check className="size-3" />
          <span>Verified rental</span>
        </span>
      </div>

      {/* Equipment Reference Tag */}
      <div className="text-xs text-muted-foreground">
        Equipment:{' '}
        <AppLink
          to={`/equipment/${review.equipment_id}`}
          className="font-medium text-foreground hover:text-brand transition-colors hover:underline"
        >
          {review.equipment_name}
        </AppLink>
      </div>

      {/* Comment */}
      <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed">
        {review.comment}
      </p>

      {/* Existing Reply Display */}
      {review.vendor_reply && !isReplying && (
        <div className="p-3.5 rounded-xl bg-muted/30 border border-border text-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-foreground flex items-center gap-1.5 text-xs">
              <CornerDownRight className="size-3 text-brand" />
              Your response
              {review.replied_at && (
                <span className="text-muted-foreground font-normal">· {review.replied_at}</span>
              )}
            </span>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsReplying(true)}
              className="h-6 px-2 text-[11px] gap-1 text-brand hover:text-brand-hover hover:bg-brand/10"
            >
              <Pencil className="size-3" />
              <span>Edit reply</span>
            </Button>
          </div>

          <p className="text-foreground/90 leading-relaxed pl-4">{review.vendor_reply}</p>
        </div>
      )}

      {/* Action to Reply if None Exists */}
      {!review.vendor_reply && !isReplying && (
        <div className="pt-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsReplying(true)}
            className="text-xs h-8 gap-1.5"
          >
            <MessageSquare className="size-3.5" />
            <span>Reply to customer</span>
          </Button>
        </div>
      )}

      {/* Inline Reply Composer */}
      {isReplying && (
        <ReplyComposer
          initialValue={review.vendor_reply || ''}
          onSubmit={handlePostReply}
          onCancel={() => setIsReplying(false)}
          isSubmitting={isSubmitting}
        />
      )}
    </article>
  )
}
