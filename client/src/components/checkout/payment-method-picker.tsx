import { Banknote, ShieldCheck, Check } from 'lucide-react'
import type { CheckoutPaymentMethod } from '@/types/checkout'
import { cn } from '@/lib/utils'

interface PaymentMethodPickerProps {
  selectedMethod: CheckoutPaymentMethod
  onChange: (method: CheckoutPaymentMethod) => void
  className?: string
}

export function PaymentMethodPicker({
  selectedMethod = 'cod',
  onChange,
  className,
}: PaymentMethodPickerProps) {
  return (
    <div className={cn('p-5 rounded-[16px] bg-surface border border-border space-y-4 shadow-xs', className)}>
      <div className="flex items-center gap-2.5 pb-2 border-b border-border/70">
        <div className="size-8 rounded-full bg-brand/10 text-brand flex items-center justify-center">
          <Banknote className="size-4" />
        </div>
        <div>
          <h3 className="font-serif font-bold text-sm text-foreground">Payment & Settlement Method</h3>
          <p className="text-[11px] text-muted-foreground">
            Direct vendor-to-customer settlement on delivery
          </p>
        </div>
      </div>

      <div className="space-y-3" role="radiogroup" aria-label="Select payment method">
        {/* Active & Authoritative: Cash on Delivery */}
        <label
          className={cn(
            'relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-[12px] border transition-all cursor-pointer',
            selectedMethod === 'cod'
              ? 'border-brand bg-brand/5 ring-1 ring-brand/20'
              : 'border-border bg-surface hover:border-brand/40',
          )}
        >
          <div className="flex items-start sm:items-center gap-3.5 min-w-0">
            <input
              type="radio"
              name="payment_method"
              value="cod"
              checked={selectedMethod === 'cod'}
              onChange={() => onChange('cod')}
              className="sr-only"
            />

            <div className="size-9 rounded-full bg-brand text-white flex items-center justify-center shrink-0">
              <Banknote className="size-4.5" />
            </div>

            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-xs text-foreground">
                  Cash on Delivery / Event Venue Setup
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold">
                  Official Method
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Pay directly to your equipment vendor in cash upon delivery and verification at your venue.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <div className="size-5 rounded-full bg-brand text-white flex items-center justify-center">
              <Check className="size-3" />
            </div>
          </div>
        </label>
      </div>

      {/* COD Protection & Policy Highlights */}
      <div className="rounded-[12px] bg-muted/40 border border-border/80 p-3.5 space-y-2 text-xs">
        <div className="flex items-center gap-2 text-foreground font-semibold text-xs">
          <ShieldCheck className="size-4 text-emerald-600 shrink-0" />
          <span>Vendor-to-Customer Direct Settlement Guidelines</span>
        </div>
        <ul className="space-y-1.5 text-[11px] text-muted-foreground pl-6 list-disc">
          <li>
            <strong>0% Platform Fee:</strong> Rent4Fraction takes 0% commission and never holds your funds.
          </li>
          <li>
            <strong>24h Vendor Confirmation:</strong> Your vendor will review and accept your order within 24 hours.
          </li>
          <li>
            <strong>Security Deposit Refund:</strong> Your refundable security deposit is inspected and settled directly in cash upon post-event pickup.
          </li>
        </ul>
      </div>
    </div>
  )
}
