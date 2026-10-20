import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { StarRatingInput } from './star-rating-input'
import { Loader2, Star } from 'lucide-react'
import { toast } from 'sonner'
import { submitReview } from '@/lib/api'

interface ReviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bookingId: string
  equipmentId: string
  equipmentName: string
  vendorName?: string
  onReviewSubmitted?: () => void
}

export function ReviewDialog({
  open,
  onOpenChange,
  bookingId,
  equipmentId,
  equipmentName,
  vendorName,
  onReviewSubmitted,
}: ReviewDialogProps) {
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const charLimit = 500
  const charRemaining = charLimit - comment.length

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (rating < 1 || !comment.trim() || submitting) return

    setSubmitting(true)
    try {
      await submitReview(bookingId, equipmentId, rating, comment.trim())
      toast.success('Review submitted successfully', {
        description: `Thank you for sharing your experience with ${equipmentName}.`,
      })
      onOpenChange(false)
      onReviewSubmitted?.()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit review.'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-surface border-border">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2 text-brand">
            <Star className="size-5 fill-brand" />
            <span className="text-xs font-bold uppercase tracking-wider">
              Item Review
            </span>
          </div>
          <DialogTitle className="text-xl font-bold font-serif text-foreground">
            Review {equipmentName}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {vendorName ? `Provided by ${vendorName}` : 'Share feedback on equipment quality and condition.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Star Rating Input */}
          <StarRatingInput
            value={rating}
            onChange={setRating}
            label="Overall experience"
          />

          {/* Comment with 500 char counter */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-foreground">
              <label htmlFor="review-comment">Your review</label>
              <span className={charRemaining < 0 ? 'text-danger' : 'text-muted-foreground'}>
                {charRemaining} left
              </span>
            </div>
            <textarea
              id="review-comment"
              rows={4}
              maxLength={charLimit}
              required
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="How did the equipment perform at your event? Was the condition as expected?"
              className="w-full p-3 rounded-[8px] border border-border bg-surface text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand resize-none leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="h-10 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || rating < 1 || !comment.trim()}
              className="h-10 px-4 text-xs font-semibold gap-1.5"
            >
              {submitting && <Loader2 className="size-4 animate-spin" />}
              <span>Submit review</span>
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
