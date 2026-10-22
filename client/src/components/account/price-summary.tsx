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

      {/* Tax */}
      <div className="flex items-center justify-between text-muted-foreground">
        <span>Taxes & GST (18%)</span>
        <span className="font-semibold text-foreground tabular-nums">
          {formatINR(summary.tax)}
        </span>
      </div>

      {/* Delivery Fee */}
      <div className="flex items-center justify-between text-muted-foreground">
        <span>Venue delivery & logistics</span>
        <span className="font-semibold text-foreground tabular-nums">
          {formatINR(summary.delivery_fee)}
        </span>
      </div>

      {/* Security Deposit */}
      <div className="flex items-center justify-between text-muted-foreground">
        <div className="flex items-center gap-1">
          <span>Security deposit</span>
          <span className="text-[10px] text-muted-foreground/80 font-normal">
            (refundable after inspection)
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
        <span className="text-sm font-serif font-bold">Total payable</span>
        <span className="text-base sm:text-lg font-bold tabular-nums font-sans">
          {formatINR(summary.total)}
        </span>
      </div>
    </div>
  )
}
