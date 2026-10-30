import { formatINR } from '@/lib/format'
import { Tag } from 'lucide-react'
import type { PriceSummaryBreakdown } from '@/types/account'
import { cn } from '@/lib/utils'

interface PriceSummaryProps {
  summary: PriceSummaryBreakdown
  className?: string
}

export function PriceSummary({ summary, className }: PriceSummaryProps) {
  return (
    <div className={cn('p-4 rounded-[12px] bg-muted/30 border border-border space-y-2.5 text-xs', className)}>
      {/* Subtotal */}
      <div className="flex items-center justify-between text-muted-foreground">
        <span>Equipment rental subtotal</span>
        <span className="font-semibold text-foreground tabular-nums">
          {formatINR(summary.subtotal)}
        </span>
      </div>

      {/* Discount */}
      {summary.discount > 0 && (
        <div className="flex items-center justify-between text-success">
          <div className="flex items-center gap-1.5">
            <span>Promotional discount</span>
            {summary.coupon_code && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-success/15 border border-success/30">
                <Tag className="size-2.5" />
                <span>{summary.coupon_code}</span>
              </span>
            )}
          </div>
          <span className="font-semibold tabular-nums">
            −{formatINR(summary.discount)}
          </span>
        </div>
      )}

      {/* Platform fee / tax */}
      <div className="flex items-center justify-between text-muted-foreground">
        <span>Taxes & platform fee</span>
        <span className="font-medium text-emerald-600 dark:text-emerald-400 tabular-nums">
          ₹0 (0% platform cut)
        </span>
      </div>

      {/* Delivery Fee */}
      <div className="flex items-center justify-between text-muted-foreground">
        <span>Venue delivery & logistics</span>
        <span className="font-semibold text-foreground tabular-nums">
          {summary.delivery_fee > 0 ? (
            formatINR(summary.delivery_fee)
          ) : (
            <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
              To be quoted by vendor
            </span>
          )}
        </span>
      </div>

      {/* Security Deposit */}
      <div className="flex items-center justify-between text-muted-foreground">
        <div className="flex items-center gap-1">
          <span>Security deposit</span>
          <span className="text-[10px] text-muted-foreground/80 font-normal">
            (refundable upon return)
          </span>
        </div>
        <span className="font-semibold text-foreground tabular-nums">
          {formatINR(summary.security_deposit)}
        </span>
      </div>

      {/* Hairline Divider */}
      <div className="h-px bg-border/80 my-1.5" />

      {/* Grand Total */}
      <div className="flex items-baseline justify-between text-foreground pt-0.5">
        <div className="space-y-0.5">
          <span className="text-sm font-serif font-bold block">Total due on delivery</span>
          <span className="text-[10px] text-muted-foreground block font-sans">Cash settlement at venue</span>
        </div>
        <span className="text-base sm:text-lg font-bold tabular-nums font-sans">
          {formatINR(summary.total)}
        </span>
      </div>
    </div>
  )
}
