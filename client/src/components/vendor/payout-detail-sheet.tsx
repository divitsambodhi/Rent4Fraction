import { CheckCircle2, Clock, ExternalLink, ShieldCheck } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { AppLink } from '@/components/shared/app-link'
import { StatusBadge } from '@/components/shared/status-badge'
import type { VendorPayout } from '@/types/vendor'
import { cn } from '@/lib/utils'

interface PayoutDetailSheetProps {
  payout: VendorPayout | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PayoutDetailSheet({
  payout,
  open,
  onOpenChange,
}: PayoutDetailSheetProps) {
  if (!payout) return null

  // Timeline steps: Pending -> Processing -> Paid
  const timelineSteps = [
    {
      label: 'Pending',
      status: 'complete',
      description: 'Order placed, rental underway',
    },
    {
      label: 'Processing',
      status: payout.status === 'processing' || payout.status === 'paid' ? 'complete' : 'upcoming',
      description: 'Equipment returned and inspected',
    },
    {
      label: 'Paid out',
      status: payout.status === 'paid' ? 'complete' : 'upcoming',
      description: payout.paid_at ? `Settled on ${payout.paid_at}` : 'Transferred to registered bank account',
    },
  ]

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="p-6 border-b border-border">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              Payout Details
            </span>
            <StatusBadge
              status={
                payout.status === 'paid'
                  ? 'completed'
                  : payout.status === 'processing'
                  ? 'processing'
                  : 'pending'
              }
              label={payout.status === 'paid' ? 'Paid' : payout.status === 'processing' ? 'Processing' : 'Pending'}
            />
          </div>
          <SheetTitle className="font-serif text-xl sm:text-2xl mt-1">
            {payout.order_number}
          </SheetTitle>
          <p className="text-xs text-muted-foreground">
            Customer: <strong className="text-foreground">{payout.customer_name}</strong>
          </p>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Payout Timeline: Pending -> Processing -> Paid */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground">
              Settlement Timeline
            </h4>
            <div className="space-y-3 relative pl-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-[2px] before:bg-border">
              {timelineSteps.map((step) => {
                const isComplete = step.status === 'complete'

                return (
                  <div key={step.label} className="relative">
                    <div
                      className={cn(
                        'absolute -left-6 top-0.5 size-5 rounded-full flex items-center justify-center border text-white',
                        isComplete
                          ? 'bg-brand border-brand'
                          : 'bg-muted text-muted-foreground border-border',
                      )}
                    >
                      {isComplete ? (
                        <CheckCircle2 className="size-3" />
                      ) : (
                        <Clock className="size-3" />
                      )}
                    </div>
                    <div className="space-y-0.5">
                      <span className={cn('text-xs font-semibold', isComplete ? 'text-foreground' : 'text-muted-foreground')}>
                        {step.label}
                      </span>
                      <p className="text-[11px] text-muted-foreground">
                        {step.description}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Line Items Breakdown */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground">
              Equipment Rented
            </h4>
            <div className="rounded-xl border border-border divide-y divide-border/60 overflow-hidden text-xs">
              {payout.items.map((item, idx) => (
                <div key={idx} className="p-3 bg-surface/50 flex items-center justify-between gap-2">
                  <div>
                    <span className="font-semibold text-foreground block truncate">
                      {item.equipment_name}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {item.quantity} unit(s) · ₹{item.daily_rate}/day × {item.days} days
                    </span>
                  </div>
                  <span className="font-bold text-foreground tabular-nums">
                    ₹{item.subtotal.toLocaleString('en-IN')}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Financial Math Summary (Exact paise-precision integer guarantee) */}
          <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2.5 text-xs">
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Gross Rental Subtotal</span>
              <span className="font-semibold text-foreground tabular-nums">
                ₹{payout.gross_amount.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="flex items-center justify-between text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <span>Commission ({payout.commission_rate}%)</span>
                <ShieldCheck className="size-3 text-brand" />
              </span>
              <span className="font-semibold text-danger tabular-nums">
                -₹{payout.commission_amount.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="border-t border-border pt-2 flex items-center justify-between text-sm">
              <span className="font-bold text-foreground">Net Payout</span>
              <span className="font-bold text-brand text-base tabular-nums">
                ₹{payout.net_amount.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Link to Order */}
        <div className="p-4 border-t border-border bg-surface">
          <AppLink to={`/vendor/orders?order=${payout.order_id}`}>
            <Button variant="outline" className="w-full gap-2 text-xs">
              <ExternalLink className="size-3.5" />
              <span>View full order #{payout.order_number}</span>
            </Button>
          </AppLink>
        </div>
      </SheetContent>
    </Sheet>
  )
}
