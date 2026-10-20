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
import { Textarea } from '@/components/ui/textarea'
import { AlertTriangle } from 'lucide-react'

interface FailedDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orderId: string
  onConfirm: (reason: string) => Promise<void>
}

const COMMON_FAILURE_REASONS = [
  'Venue locked / customer representative unreachable',
  'Severe weather / waterlogging along transit route',
  'Incorrect delivery address or venue restricted access',
  'Vehicle breakdown / transit accident',
]

export function FailedDialog({
  open,
  onOpenChange,
  orderId,
  onConfirm,
}: FailedDialogProps) {
  const [selectedReason, setSelectedReason] = useState(COMMON_FAILURE_REASONS[0])
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fullReason = notes.trim()
    ? `${selectedReason} - ${notes.trim()}`
    : selectedReason

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await onConfirm(fullReason)
      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-lg font-display font-semibold text-destructive flex items-center gap-2">
              <AlertTriangle className="size-5" />
              <span>Report Delivery Exception · {orderId}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Record why delivery could not be completed. You will immediately be able to reschedule.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Exception Category</label>
              <select
                value={selectedReason}
                onChange={(e) => setSelectedReason(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-border bg-card text-xs text-foreground"
              >
                {COMMON_FAILURE_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Driver / Field Details <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Called customer 4 times between 11:15 AM and 11:45 AM, no response at gate."
                rows={3}
                className="text-xs resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="h-9 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              variant="danger"
              className="h-9 text-xs"
            >
              {isSubmitting ? 'Recording...' : 'Record Failure & Reschedule'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
