import { useState } from 'react'
import { Tag, X, Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { validateCoupon } from '@/lib/api/cart'
import { couponDiscount } from '@/lib/pricing'
import { formatINR } from '@/lib/format'
import type { Coupon } from '@/types/checkout'

interface CouponBoxProps {
  subtotal: number
  appliedCoupon?: Coupon
  onApplyCoupon: (coupon: Coupon) => void
  onRemoveCoupon: () => void
  disabled?: boolean
}

export function CouponBox({
  subtotal,
  appliedCoupon,
  onApplyCoupon,
  onRemoveCoupon,
  disabled = false,
}: CouponBoxProps) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleApply = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!code.trim() || disabled || loading) return

    setLoading(true)
    setError(null)

    // Simulate minor async verification
    await new Promise((r) => setTimeout(r, 120))

    const res = validateCoupon(code, subtotal)
    setLoading(false)

    if (res.valid && res.coupon) {
      onApplyCoupon(res.coupon)
      setCode('')
      setError(null)
    } else {
      setError(res.error || "This code isn't valid.")
    }
  }

  const discountAmount = appliedCoupon
    ? couponDiscount(appliedCoupon, subtotal).discount
    : 0

  return (
    <div className="p-4 rounded-[14px] bg-surface border border-border space-y-3 shadow-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tag className="size-4 text-brand" />
          <span className="text-xs font-bold text-foreground">Have a promo code?</span>
        </div>
        <span className="text-[11px] text-muted-foreground">1 code per order</span>
      </div>

      {appliedCoupon ? (
        /* Applied Coupon Chip */
        <div className="flex items-center justify-between p-2.5 rounded-[10px] bg-success/10 border border-success/30 text-xs">
          <div className="flex items-center gap-2">
            <span className="size-5 rounded-full bg-success/20 text-success flex items-center justify-center">
              <Check className="size-3 stroke-[2.5]" />
            </span>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-foreground tracking-wide font-mono">
                {appliedCoupon.code}
              </span>
              <span className="text-muted-foreground">·</span>
              <span className="font-semibold text-success">
                {formatINR(discountAmount)} off
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onRemoveCoupon}
            disabled={disabled}
            className="size-7 rounded-full hover:bg-success/20 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            aria-label={`Remove coupon ${appliedCoupon.code}`}
          >
            <X className="size-3.5 stroke-[2]" />
          </button>
        </div>
      ) : (
        /* Coupon Input Form */
        <form onSubmit={handleApply} className="space-y-2">
          <div className="flex gap-2">
            <Input
              type="text"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase())
                if (error) setError(null)
              }}
              placeholder="e.g. WELCOME100"
              disabled={disabled || loading}
              className="h-10 text-sm font-mono uppercase tracking-wide"
              aria-label="Enter coupon code"
            />
            <Button
              type="submit"
              variant="outline"
              disabled={!code.trim() || disabled || loading}
              className="h-10 px-4 text-xs font-semibold shrink-0"
            >
              {loading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                'Apply'
              )}
            </Button>
          </div>

          {error && (
            <p className="text-[11px] font-medium text-danger" role="alert">
              {error}
            </p>
          )}
        </form>
      )}
    </div>
  )
}
