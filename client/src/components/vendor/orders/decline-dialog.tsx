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
import { AlertCircle } from 'lucide-react'

interface DeclineDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orderId: string
  onConfirm: (reason: string) => Promise<void>
}

const COMMON_REASONS = [
  'Equipment booked on external offline platform',
  'Maintenance or scheduled hardware servicing',
  'Logistics or delivery route capacity reached',
  'Venue outside operational radius',
  'Custom order terms could not be accommodated',
]

export function DeclineDialog({
  open,
  onOpenChange,
  orderId,
  onConfirm,
}: DeclineDialogProps) {
  const [selectedReason, setSelectedReason] = useState(COMMON_REASONS[0])
  const [customDetails, setCustomDetails] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fullReason = customDetails.trim()
    ? `${selectedReason}: ${customDetails.trim()}`
    : selectedReason

  const handleDecline = async () => {
    if (fullReason.length < 10) {
      setError('Please provide a reason with at least 10 characters.')
      return
    }

    setIsSubmitting(true)
    setError(null)
    try {
      await onConfirm(fullReason)
      onOpenChange(false)
      setCustomDetails('')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-display font-semibold text-foreground">
            Decline Order {orderId}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Please let the customer and platform operations know why you are unable to fulfil this rental order.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Primary Reason</label>
            <select
              value={selectedReason}
              onChange={(e) => setSelectedReason(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-border bg-card text-sm text-foreground focus:ring-1 focus:ring-brand"
            >
              {COMMON_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Additional Details <span className="text-muted-foreground font-normal">(optional, min 10 chars total)</span>
            </label>
            <Textarea
              value={customDetails}
              onChange={(e) => setCustomDetails(e.target.value)}
              placeholder="e.g. Sub-woofers undergoing routine driver replacement until Friday afternoon."
              rows={3}
              className="text-xs resize-none"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 text-destructive text-xs">
              <AlertCircle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="h-9 text-xs"
          >
            Keep Order
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={handleDecline}
            disabled={isSubmitting || fullReason.length < 10}
            className="h-9 text-xs"
          >
            {isSubmitting ? 'Declining...' : 'Confirm Decline'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
