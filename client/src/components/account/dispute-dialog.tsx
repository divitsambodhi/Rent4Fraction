import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertCircle, ImagePlus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { respondToDamageReport } from '@/lib/api'

interface DisputeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bookingId: string
  reportId: string
  equipmentName: string
  repairCost: number
  onDisputeSubmitted?: () => void
}

export function DisputeDialog({
  open,
  onOpenChange,
  bookingId,
  reportId,
  equipmentName,
  repairCost,
  onDisputeSubmitted,
}: DisputeDialogProps) {
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const minChars = 20
  const charLength = reason.trim().length
  const isSatisfied = charLength >= minChars

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isSatisfied || submitting) return

    setSubmitting(true)
    try {
      await respondToDamageReport(bookingId, reportId, 'dispute', reason.trim())
      toast.success('Dispute submitted for review', {
        description: 'Our support team will inspect the handover logs and mediate.',
      })
      onOpenChange(false)
      onDisputeSubmitted?.()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit dispute.'
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
            <AlertCircle className="size-5" />
            <span className="text-xs font-bold uppercase tracking-wider">
              Dispute Damage Claim
            </span>
          </div>
          <DialogTitle className="text-xl font-bold font-serif text-foreground">
            Dispute Charge: ₹{repairCost.toLocaleString('en-IN')}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Provide detailed justification regarding the reported condition of {equipmentName}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Dispute Reason Textarea with min 20 char counter */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-foreground">
              <label htmlFor="dispute-reason">Your explanation</label>
              <span
                className={
                  charLength < minChars ? 'text-danger font-medium' : 'text-success font-medium'
                }
              >
                {charLength < minChars
                  ? `Need ${minChars - charLength} more chars (min 20)`
                  : `${charLength} characters`}
              </span>
            </div>
            <textarea
              id="dispute-reason"
              rows={4}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why this charge is inaccurate (e.g. condition prior to event, handover confirmation, direct return notes)..."
              className="w-full p-3 rounded-[8px] border border-border bg-surface text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand resize-none leading-relaxed"
            />
          </div>

          {/* Photo upload disabled with tooltip */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Photographic evidence
            </label>
            <div
              title="Photo uploads will be supported in an upcoming update"
              className="p-3 rounded-[8px] border border-dashed border-border/70 bg-muted/30 flex items-center justify-between text-xs text-muted-foreground cursor-not-allowed opacity-75"
            >
              <div className="flex items-center gap-2">
                <ImagePlus className="size-4 text-muted-foreground" />
                <span>Upload handover photos (optional)</span>
              </div>
              <span className="text-[10px] font-semibold bg-muted px-2 py-0.5 rounded-full border border-border">
                Disabled in demo
              </span>
            </div>
          </div>

          <div className="p-3 rounded-[8px] bg-muted/40 border border-border/80 text-[11px] text-muted-foreground leading-relaxed">
            Rent4Fraction holds the claimed deposit amount in escrow while our mediation team reviews the vendor’s dispatch logs and your statement.
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
              variant="danger"
              disabled={submitting || !isSatisfied}
              className="h-10 px-4 text-xs font-semibold gap-1.5"
            >
              {submitting && <Loader2 className="size-4 animate-spin" />}
              <span>Submit dispute</span>
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
