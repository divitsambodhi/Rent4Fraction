import { useState } from 'react'
import { ArrowLeft, ArrowRight, Info } from 'lucide-react'
import { AppLink } from '@/components/shared/app-link'
import { Button } from '@/components/ui/button'
import { OrderReview } from './order-review'
import { PaymentMethodPicker } from './payment-method-picker'
import { MockGatewayDialog } from './mock-gateway-dialog'
import { formatINR } from '@/lib/format'
import type { CartPeriod, CheckoutDraft, Quote } from '@/types/checkout'
import type { Address } from '@/types/account'

interface PaymentStepProps {
  period: CartPeriod
  draft: CheckoutDraft
  quote: Quote
  address?: Address | null
  onUpdateDraft: (patch: Partial<CheckoutDraft>) => void
  onBack: () => void
  onEditStep: (step: 'cart' | 'details') => void
  onCompletePayment: (success: boolean) => Promise<void>
}

export function PaymentStep({
  period,
  draft,
  quote,
  address,
  onUpdateDraft,
  onBack,
  onEditStep,
  onCompletePayment,
}: PaymentStepProps) {
  const [gatewayOpen, setGatewayOpen] = useState(false)
  const [cancelledAlert, setCancelledAlert] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handlePayClick = () => {
    if (!draft.terms_agreed || submitting) return

    // If COD, place order directly without gateway modal
    if (draft.payment_method === 'cod') {
      setSubmitting(true)
      onCompletePayment(true).finally(() => setSubmitting(false))
      return
    }

    // Otherwise launch mock gateway simulator
    setCancelledAlert(false)
    setGatewayOpen(true)
  }

  const handleGatewayOutcome = (outcome: 'success' | 'failure' | 'cancel') => {
    setGatewayOpen(false)
    if (outcome === 'cancel') {
      setCancelledAlert(true)
      return
    }

    setSubmitting(true)
    onCompletePayment(outcome === 'success').finally(() => setSubmitting(false))
  }

  const isCod = draft.payment_method === 'cod'
  const primaryButtonLabel = isCod ? 'Place order' : `Pay ${formatINR(quote.total)}`

  return (
    <div className="space-y-6">
      {/* Payment Cancelled Info Alert */}
      {cancelledAlert && (
        <div
          role="status"
          className="p-4 rounded-[12px] bg-muted/60 border border-border text-xs flex items-center gap-3 animate-in fade-in"
        >
          <Info className="size-4 text-brand shrink-0" />
          <span className="text-foreground leading-relaxed">
            Payment was cancelled. You have not been charged.
          </span>
        </div>
      )}

      {/* 1. Order Review (Collapsible) */}
      <OrderReview
        period={period}
        draft={draft}
        address={address}
        onEditStep={onEditStep}
      />

      {/* 2. Payment Method Picker */}
      <PaymentMethodPicker
        selectedMethod={draft.payment_method}
        onChange={(method) => onUpdateDraft({ payment_method: method })}
      />

      {/* 3. Terms & Conditions Agreement */}
      <div className="p-4 rounded-[12px] bg-muted/30 border border-border/80 text-xs">
        <label className="flex items-start gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={draft.terms_agreed}
            onChange={(e) => onUpdateDraft({ terms_agreed: e.target.checked })}
            className="size-4 rounded border-border text-brand focus:ring-brand accent-brand cursor-pointer mt-0.5 shrink-0"
          />
          <span className="text-muted-foreground leading-relaxed">
            I agree to Rent4Fraction's{' '}
            <AppLink to="/help?tab=terms" className="text-brand font-semibold hover:underline">
              Terms of Service
            </AppLink>{' '}
            and the{' '}
            <AppLink to="/help?tab=refunds" className="text-brand font-semibold hover:underline">
              Cancellation & Refund Policy
            </AppLink>
            . I understand that security deposits are held in escrow until equipment return inspection.
          </span>
        </label>
      </div>

      {/* Bottom Actions (Desktop) */}
      <div className="hidden lg:flex items-center justify-between pt-6 border-t border-border/70">
        <Button
          type="button"
          variant="ghost"
          onClick={onBack}
          disabled={submitting}
          className="gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          <span>Back to details</span>
        </Button>

        <Button
          type="button"
          onClick={handlePayClick}
          disabled={!draft.terms_agreed || submitting}
          className="h-12 px-8 text-sm font-semibold rounded-[12px] shadow-sm gap-2"
        >
          <span>{submitting ? 'Placing order...' : primaryButtonLabel}</span>
          {!submitting && <ArrowRight className="size-4" />}
        </Button>
      </div>

      {/* Mock Gateway Simulator Dialog */}
      <MockGatewayDialog
        open={gatewayOpen}
        amount={quote.total}
        paymentMethod={draft.payment_method}
        onOutcome={handleGatewayOutcome}
      />
    </div>
  )
}
