import { Package, ShieldCheck, HelpCircle } from 'lucide-react'
import { PriceSummary } from '@/components/account/price-summary'
import type { Quote, CartPeriod } from '@/types/checkout'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface OrderSummaryProps {
  quote: Quote
  period?: CartPeriod
  vendorCount?: number
  itemCount?: number
  className?: string
  showNote?: boolean
}

export function OrderSummary({
  quote,
  period,
  vendorCount = 1,
  itemCount = 1,
  className,
  showNote = true,
}: OrderSummaryProps) {
  // Convert Quote into the PriceSummaryBreakdown shape expected by PriceSummary
  const priceBreakdown = {
    subtotal: quote.subtotal,
    discount: quote.discount,
    coupon_code: quote.applied_coupon?.code,
    tax: quote.tax,
    delivery_fee: quote.delivery_fee,
    security_deposit: quote.security_deposit,
    total: quote.total,
  }

  return (
    <aside
      className={cn(
        'w-full lg:w-[380px] shrink-0 bg-surface border border-border rounded-[16px] p-5 shadow-xs space-y-4',
        className,
      )}
      aria-label="Order summary"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 pb-3 border-b border-border/70">
        <div className="space-y-0.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
            ORDER SUMMARY
          </span>
          <h2 className="font-serif font-bold text-base text-foreground">
            {itemCount} {itemCount === 1 ? 'item' : 'items'} · {vendorCount}{' '}
            {vendorCount === 1 ? 'vendor' : 'vendors'}
          </h2>
          {period && (
            <p className="text-xs text-muted-foreground">
              {period.days} {period.days === 1 ? 'day rental' : 'days rental'}
            </p>
          )}
        </div>
        <div className="size-9 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground shrink-0">
          <Package className="size-4 stroke-[1.75]" />
        </div>
      </div>

      {/* Shared PriceSummary Component */}
      <PriceSummary summary={priceBreakdown} className="p-0 bg-transparent border-0 space-y-3" />

      {/* Trust & Guarantee Notes */}
      {showNote && (
        <div className="pt-2 border-t border-border/70 space-y-2">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <ShieldCheck className="size-4 shrink-0 text-brand stroke-[2]" />
            <span>Deposit is 100% refundable after return inspection.</span>
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="text-muted-foreground hover:text-foreground">
                    <HelpCircle className="size-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[240px] text-xs">
                  We hold your deposit securely in escrow until equipment is checked back in.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      )}
    </aside>
  )
}
