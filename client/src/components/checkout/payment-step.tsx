import { useState } from 'react'
import { ArrowLeft, ArrowRight, Clock, Mail } from 'lucide-react'
import { useAuth } from '@/providers/auth-provider'
import { authService } from '@/lib/auth'
import { useCooldown } from '@/hooks/use-cooldown'
import { toast } from 'sonner'
import { AppLink } from '@/components/shared/app-link'
import { Button } from '@/components/ui/button'
import { OrderReview } from './order-review'
import { PaymentMethodPicker } from './payment-method-picker'
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
  const [submitting, setSubmitting] = useState(false)
  const { user, role } = useAuth()
  const { secondsLeft: cooldown, start: startCooldown } = useCooldown(60)
  const [resendingEmail, setResendingEmail] = useState(false)

  const isEmailUnverified = Boolean(user && user.email_verified === false && role !== 'admin')

  const handleResendEmail = async () => {
    if (cooldown > 0 || resendingEmail) return
    setResendingEmail(true)
    try {
      await authService.sendEmailVerification()
      startCooldown(60)
      toast.success('Verification email sent', {
        description: `Check your inbox at ${user?.email || 'your email address'}.`,
      })
    } catch {
      toast.error('Could not send verification email. Please try again shortly.')
    } finally {
      setResendingEmail(false)
    }
  }

  const handleRequestBooking = () => {
    if (!draft.terms_agreed || submitting || isEmailUnverified) return
    setSubmitting(true)
    onCompletePayment(true).finally(() => setSubmitting(false))
  }

  return (
    <div className="space-y-6">
      {/* 1. Order Review (Collapsible) */}
      <OrderReview
        period={period}
        draft={draft}
        address={address}
        onEditStep={onEditStep}
      />

      {/* 2. Payment Method Picker (COD Authoritative) */}
      <PaymentMethodPicker
        selectedMethod={draft.payment_method || 'cod'}
        onChange={(method) => onUpdateDraft({ payment_method: method })}
      />

      {/* 3. Cancellation Policy Preview */}
      <div className="p-4 rounded-[12px] bg-muted/40 border border-border/80 space-y-2 text-xs">
        <div className="flex items-center gap-2 font-semibold text-foreground">
          <Clock className="size-4 text-brand shrink-0" />
          <span>Cancellation & Cash Settlement Rules</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px] text-muted-foreground">
          <div className="p-2.5 rounded-lg bg-surface border border-border/60">
            <div className="font-semibold text-emerald-600">≥ 48 Hours Before</div>
            <div>100% free cancellation. No charges or penalties.</div>
          </div>
          <div className="p-2.5 rounded-lg bg-surface border border-border/60">
            <div className="font-semibold text-amber-600">24 - 48 Hours</div>
            <div>50% penalty on rental fee if vendor already prepared gear.</div>
          </div>
          <div className="p-2.5 rounded-lg bg-surface border border-border/60">
            <div className="font-semibold text-destructive">&lt; 24 Hours / No-Show</div>
            <div>Direct settlement with vendor. Repeated no-shows limit booking privileges.</div>
          </div>
        </div>
      </div>

      {/* 3b. Email Verification Warning */}
      {isEmailUnverified && (
        <div className="p-4 rounded-[12px] bg-amber-500/10 border border-amber-500/30 space-y-2 text-xs">
          <div className="flex items-center gap-2 font-semibold text-amber-700 dark:text-amber-400">
            <Mail className="size-4 shrink-0" />
            <span>Email Verification Required</span>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            Your email address (<span className="font-semibold text-foreground">{user?.email}</span>) has not been verified yet. Rent4Fraction requires a verified email before requesting Cash on Delivery bookings.
          </p>
          <div className="pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={resendingEmail || cooldown > 0}
              onClick={handleResendEmail}
              className="text-xs h-8 cursor-pointer"
            >
              {resendingEmail ? 'Sending...' : cooldown > 0 ? `Resend email in ${cooldown}s` : 'Resend verification email'}
            </Button>
          </div>
        </div>
      )}

      {/* 4. Terms & Conditions Agreement */}
      <div className="p-4 rounded-[12px] bg-muted/30 border border-border/80 text-xs">
        <label className="flex items-start gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={draft.terms_agreed}
            onChange={(e) => onUpdateDraft({ terms_agreed: e.target.checked })}
            className="size-4 rounded border-border text-brand focus:ring-brand accent-brand cursor-pointer mt-0.5 shrink-0"
          />
          <span className="text-muted-foreground leading-relaxed">
            I agree to Rent4Fraction&apos;s{' '}
            <AppLink to="/help?tab=terms" className="text-brand font-semibold hover:underline">
              Terms of Service
            </AppLink>{' '}
            and the{' '}
            <AppLink to="/help?tab=refunds" className="text-brand font-semibold hover:underline">
              Cancellation & Settlement Policy
            </AppLink>
            . I understand that Rent4Fraction is a vendor-to-customer platform with Cash on Delivery; all rental fees and refundable deposits are settled directly in cash with the vendor.
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
          className="gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
        >
          <ArrowLeft className="size-4" />
          <span>Back to details</span>
        </Button>

        <Button
          type="button"
          onClick={handleRequestBooking}
          disabled={!draft.terms_agreed || submitting || isEmailUnverified}
          className="h-12 px-8 text-sm font-semibold rounded-[12px] bg-brand hover:bg-brand-hover text-white shadow-sm gap-2 cursor-pointer"
        >
          <span>{submitting ? 'Submitting booking request…' : `Request Booking (Pay ${formatINR(quote.total)} on Delivery)`}</span>
          {!submitting && <ArrowRight className="size-4" />}
        </Button>
      </div>
    </div>
  )
}
