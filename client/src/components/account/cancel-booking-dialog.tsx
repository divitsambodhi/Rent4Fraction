import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AppLink } from '@/components/shared/app-link'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cancelBooking } from '@/lib/api'

interface CancelBookingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bookingId: string
  eventName: string
  onBookingCancelled?: () => void
}

const CANCEL_REASONS = [
  'Event rescheduled to another date',
  'Found alternative venue or equipment',
  'Change in event budget or guest count',
  'Event cancelled altogether',
  'Booking created by mistake',
  'Other reason',
]

export function CancelBookingDialog({
  open,
  onOpenChange,
  bookingId,
  eventName,
  onBookingCancelled,
}: CancelBookingDialogProps) {
  const [reason, setReason] = useState(CANCEL_REASONS[0])
  const [submitting, setSubmitting] = useState(false)

  const handleConfirmCancel = async () => {
    if (submitting) return
    setSubmitting(true)
    try {
      await cancelBooking(bookingId, reason)
      toast.success(`Booking ${bookingId} has been cancelled`, {
        description: 'Any eligible advance payments and security deposits are scheduled for refund.',
      })
      onOpenChange(false)
      onBookingCancelled?.()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not cancel booking.'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-surface border-border">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2 text-danger">
            <AlertTriangle className="size-5" />
            <span className="text-xs font-semibold text-danger">
              Cancel Booking
            </span>
          </div>
          <DialogTitle className="text-xl font-bold font-serif text-foreground">
            Cancel Booking {bookingId}?
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {eventName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Reason Select */}
          <div className="space-y-1.5">
            <label
              htmlFor="cancel-reason-select"
              className="text-xs font-semibold text-foreground"
            >
              Reason for cancellation (optional)
            </label>
            <select
              id="cancel-reason-select"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full h-10 px-3 rounded-[8px] border border-border bg-surface text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-brand"
            >
              {CANCEL_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Neutral Policy Text and Link */}
          <div className="p-3 rounded-[8px] bg-muted/40 border border-border/80 text-xs text-muted-foreground leading-relaxed space-y-1">
            <p>
              Refunds follow our cancellation and refund guidelines based on the time remaining before event dispatch.
            </p>
            <AppLink
              to="/help?tab=refunds"
              className="inline-block text-xs font-semibold text-brand hover:underline"
            >
              Read cancellation and refund policy
            </AppLink>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="ghost"
            disabled={submitting}
            onClick={() => onOpenChange(false)}
            className="h-10 text-xs"
          >
            Keep booking
          </Button>
          <Button
            type="button"
            variant="danger"
            disabled={submitting}
            onClick={handleConfirmCancel}
            className="h-10 px-4 text-xs font-semibold gap-1.5"
          >
            {submitting && <Loader2 className="size-4 animate-spin" />}
            <span>Confirm cancellation</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
