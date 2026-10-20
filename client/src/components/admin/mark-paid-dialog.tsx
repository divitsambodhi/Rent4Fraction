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
import { Input } from '@/components/ui/input'
import { CheckCircle2 } from 'lucide-react'

interface MarkPaidDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  payoutId: string
  amount: number
  vendorName: string
  onConfirm: (paidDate: string, reference?: string) => Promise<void>
}

export function MarkPaidDialog({
  open,
  onOpenChange,
  payoutId,
  amount,
  vendorName,
  onConfirm,
}: MarkPaidDialogProps) {
  const todayStr = new Date().toISOString().slice(0, 10)
  const [paidDate, setPaidDate] = useState(todayStr)
  const [reference, setReference] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (paidDate > todayStr) {
      setError('Payment date cannot be in the future.')
      return
    }

    setIsSubmitting(true)
    setError(null)
    try {
      await onConfirm(paidDate, reference.trim() || undefined)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-lg font-display font-semibold text-foreground flex items-center gap-2">
              <CheckCircle2 className="size-5 text-emerald-600" />
              <span>Mark Payout Paid</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Confirm bank transfer execution for <strong>{vendorName}</strong> ({payoutId}).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-3.5 rounded-xl bg-muted/40 border border-border flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Net Payout Amount</span>
              <strong className="text-sm font-display text-emerald-600 dark:text-emerald-400 tabular-nums">
                ₹{amount.toLocaleString('en-IN')}
              </strong>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>Transfer Execution Date</span>
                <span className="text-[11px] text-muted-foreground">Cannot be future</span>
              </label>
              <Input
                type="date"
                max={todayStr}
                value={paidDate}
                onChange={(e) => {
                  setPaidDate(e.target.value)
                  setError(null)
                }}
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Bank / UTR Reference <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <Input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="e.g. UTR-90218821034"
                className="h-9 text-xs font-mono"
              />
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="h-9 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || paidDate > todayStr}
              className="h-9 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isSubmitting ? 'Recording...' : 'Confirm Paid'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
