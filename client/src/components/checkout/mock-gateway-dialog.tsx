import { useState } from 'react'
import { ShieldCheck, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatINR } from '@/lib/format'

export const MOCK_GATEWAY_ENABLED =
  import.meta.env.DEV && import.meta.env.VITE_API_MODE === 'mock'

interface MockGatewayDialogProps {
  open: boolean
  amount: number
  paymentMethod: string
  onOutcome: (outcome: 'success' | 'failure' | 'cancel') => void
}

export function MockGatewayDialog({
  open,
  amount,
  paymentMethod,
  onOutcome,
}: MockGatewayDialogProps) {
  if (!MOCK_GATEWAY_ENABLED || !open) return null

  const [processing, setProcessing] = useState(false)
  const [chosenOutcome, setChosenOutcome] = useState<'success' | 'failure' | null>(null)

  const handleSimulate = (outcome: 'success' | 'failure') => {
    if (processing) return
    setProcessing(true)
    setChosenOutcome(outcome)

    setTimeout(() => {
      setProcessing(false)
      onOutcome(outcome)
    }, 1500)
  }

  const handleCancel = () => {
    if (processing) return
    onOutcome('cancel')
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleCancel()}>
      <DialogContent className="max-w-[480px] p-6 sm:p-7 space-y-6">
        <DialogHeader className="text-center space-y-2">
          <div className="size-14 rounded-full bg-brand/10 border border-brand/20 text-brand flex items-center justify-center mx-auto shadow-2xs">
            <ShieldCheck className="size-7 stroke-[2]" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
              DEMO PAYMENT GATEWAY (DEV ONLY)
            </span>
            <DialogTitle className="font-serif text-xl sm:text-2xl font-bold text-foreground">
              Secure Sandbox Checkout
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
            This simulator allows you to test both successful booking placement and payment failure handling.
          </DialogDescription>
        </DialogHeader>

        {/* Amount Card */}
        <div className="p-4 rounded-[14px] bg-muted/40 border border-border text-center space-y-1">
          <span className="text-xs text-muted-foreground font-medium">Total payable amount</span>
          <div className="text-2xl sm:text-3xl font-bold font-sans text-foreground tabular-nums tracking-tight">
            {formatINR(amount)}
          </div>
          <span className="text-[11px] text-muted-foreground font-mono uppercase block pt-1">
            Method: {paymentMethod.toUpperCase()}
          </span>
        </div>

        {/* Processing State */}
        {processing ? (
          <div className="py-6 flex flex-col items-center justify-center text-center space-y-3 animate-in fade-in">
            <Loader2 className="size-8 animate-spin text-brand" />
            <div className="space-y-0.5">
              <span className="font-semibold text-sm text-foreground">
                Processing {chosenOutcome === 'success' ? 'authorized' : 'declined'} transaction...
              </span>
              <p className="text-xs text-muted-foreground">Communicating with mock payment partner bank</p>
            </div>
          </div>
        ) : (
          /* Action Buttons */
          <div className="space-y-2.5 pt-1">
            <Button
              type="button"
              onClick={() => handleSimulate('success')}
              className="w-full h-12 text-sm font-semibold rounded-[12px] bg-brand hover:bg-brand-hover text-white gap-2 shadow-sm"
            >
              <CheckCircle2 className="size-4" />
              <span>Simulate Payment Success</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => handleSimulate('failure')}
              className="w-full h-11 text-xs font-semibold rounded-[12px] border-danger/40 text-danger hover:bg-danger/10 hover:border-danger gap-2"
            >
              <AlertCircle className="size-4" />
              <span>Simulate Payment Failure (Declined)</span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={handleCancel}
              className="w-full h-10 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              Cancel Payment
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
