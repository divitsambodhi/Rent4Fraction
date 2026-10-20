import { MOCK_COUPONS } from '@/lib/config/pricing-placeholders'
import { Sparkles } from 'lucide-react'
import type { Coupon } from '@/types/checkout'

interface TestCouponsPanelProps {
  onSelectCoupon: (coupon: Coupon) => void
  disabled?: boolean
}

export function TestCouponsPanel({
  onSelectCoupon,
  disabled = false,
}: TestCouponsPanelProps) {
  const coupons = Object.values(MOCK_COUPONS)

  return (
    <div className="p-3 rounded-[12px] bg-muted/40 border border-dashed border-border space-y-2 text-xs">
      <div className="flex items-center gap-1.5 text-muted-foreground font-semibold text-[11px]">
        <Sparkles className="size-3.5 text-brand" />
        <span>Dev test coupons (click to fill & test rules)</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {coupons.map((c) => (
          <button
            key={c.code}
            type="button"
            disabled={disabled}
            onClick={() => onSelectCoupon(c)}
            className="px-2 py-1 rounded-[6px] bg-surface hover:bg-muted border border-border text-[11px] font-mono font-medium text-foreground hover:border-brand/40 transition-colors cursor-pointer"
            title={`${c.description || c.code} (Min: ₹${c.min_order_amount})`}
          >
            {c.code}
            <span className="text-[10px] text-muted-foreground ml-1">
              ({c.type === 'flat' ? `₹${c.value}` : `${c.value}%`})
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
