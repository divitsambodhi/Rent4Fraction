import { CreditCard, QrCode, Building, Wallet, Banknote, ShieldCheck, Check } from 'lucide-react'
import type { CheckoutPaymentMethod } from '@/types/checkout'
import { cn } from '@/lib/utils'

interface PaymentMethodPickerProps {
  selectedMethod: CheckoutPaymentMethod
  onChange: (method: CheckoutPaymentMethod) => void
  className?: string
}

interface PaymentOption {
  id: CheckoutPaymentMethod
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}

const PAYMENT_OPTIONS: PaymentOption[] = [
  {
    id: 'upi',
    label: 'UPI (Instant Transfer)',
    description: 'Google Pay, PhonePe, Paytm, BHIM, or any UPI app',
    icon: QrCode,
  },
  {
    id: 'card',
    label: 'Credit or Debit Card',
    description: 'Visa, MasterCard, RuPay, and American Express',
    icon: CreditCard,
  },
  {
    id: 'netbanking',
    label: 'Net Banking',
    description: 'HDFC, ICICI, SBI, Axis, and 50+ major Indian banks',
    icon: Building,
  },
  {
    id: 'wallet',
    label: 'Digital Wallets',
    description: 'Paytm, Amazon Pay, Mobikwik, and PhonePe Wallet',
    icon: Wallet,
  },
  {
    id: 'cod',
    label: 'Cash on Delivery / Setup',
    description: 'Pay cash upon delivery and verification at your venue',
    icon: Banknote,
  },
]

export function PaymentMethodPicker({
  selectedMethod,
  onChange,
  className,
}: PaymentMethodPickerProps) {
  return (
    <div className={cn('p-5 rounded-[16px] bg-surface border border-border space-y-4 shadow-xs', className)}>
      <div className="flex items-center gap-2.5 pb-2 border-b border-border/70">
        <div className="size-8 rounded-full bg-brand/10 text-brand flex items-center justify-center">
          <CreditCard className="size-4" />
        </div>
        <div>
          <h3 className="font-serif font-bold text-sm text-foreground">Select Payment Method</h3>
          <p className="text-[11px] text-muted-foreground">
            You'll complete payment on our secure payment partner's page.
          </p>
        </div>
      </div>

      <div className="space-y-2.5" role="radiogroup" aria-label="Select payment method">
        {PAYMENT_OPTIONS.map((opt) => {
          const Icon = opt.icon
          const isSelected = selectedMethod === opt.id

          return (
            <label
              key={opt.id}
              className={cn(
                'relative flex items-center justify-between gap-3 p-4 rounded-[12px] border min-h-[64px] transition-all cursor-pointer',
                isSelected
                  ? 'border-brand bg-brand/5 ring-1 ring-brand/20'
                  : 'border-border bg-surface hover:border-brand/40',
              )}
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <input
                  type="radio"
                  name="payment_method"
                  value={opt.id}
                  checked={isSelected}
                  onChange={() => onChange(opt.id)}
                  className="sr-only"
                />

                <div
                  className={cn(
                    'size-9 rounded-full flex items-center justify-center shrink-0',
                    isSelected ? 'bg-brand text-white' : 'bg-muted text-muted-foreground',
                  )}
                >
                  <Icon className="size-4" />
                </div>

                <div className="space-y-0.5 min-w-0">
                  <div className="font-semibold text-xs text-foreground truncate">
                    {opt.label}
                  </div>
                  <div className="text-[11px] text-muted-foreground leading-tight">
                    {opt.description}
                  </div>
                </div>
              </div>

              {isSelected && (
                <div className="size-5 rounded-full bg-brand text-white flex items-center justify-center shrink-0">
                  <Check className="size-3.5 stroke-[2.5]" />
                </div>
              )}
            </label>
          )
        })}
      </div>

      <div className="pt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
        <ShieldCheck className="size-4 text-brand shrink-0" />
        <span>256-bit encrypted bank-grade payment processing with instant escrow hold.</span>
      </div>
    </div>
  )
}
