import { useState } from 'react'
import {
  CheckCircle2,
  Clock,
  Home,
  Loader2,
  MailCheck,
  RefreshCw,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AppLink } from '@/components/shared/app-link'
import { FormAlert } from './form-alert'
import { useCooldown } from '@/hooks/use-cooldown'
import { mockAuthService } from '@/lib/auth'

export interface ApplicationSubmittedPanelProps {
  businessName: string
  email: string
}

export function ApplicationSubmittedPanel({
  businessName,
  email,
}: ApplicationSubmittedPanelProps) {
  const { secondsLeft, start } = useCooldown(60)
  const [resending, setResending] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const handleResend = async () => {
    if (secondsLeft > 0 || resending) return
    setResending(true)
    setFeedback(null)
    try {
      await mockAuthService.sendEmailVerification()
      start(60)
      setFeedback({
        type: 'success',
        message: 'A verification link has been resent to your email.',
      })
    } catch {
      setFeedback({
        type: 'error',
        message: 'Failed to send verification email. Please try again shortly.',
      })
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="w-full text-left space-y-6 animate-in fade-in-50 duration-200">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="size-16 rounded-full bg-success/15 text-success flex items-center justify-center mx-auto shadow-xs">
          <CheckCircle2 className="size-8 stroke-[2]" />
        </div>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Application submitted
        </h1>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Thank you for applying to partner with Rent4Fraction as a vendor for{' '}
          <span className="font-semibold text-foreground">{businessName}</span>.
        </p>
      </div>

      {feedback && (
        <FormAlert
          type={feedback.type}
          message={feedback.message}
          onDismiss={() => setFeedback(null)}
        />
      )}

      {/* 3-Step Timeline */}
      <div className="rounded-xl border border-border/80 bg-muted/20 p-4 sm:p-5 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Application Progress
        </p>

        <div className="space-y-4">
          {/* Step 1: Email Verification */}
          <div className="flex items-start gap-3.5">
            <div className="size-8 rounded-full bg-brand/15 text-brand flex items-center justify-center shrink-0 mt-0.5">
              <MailCheck className="size-4.5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                1. Verify your email
              </p>
              <p className="text-xs text-muted-foreground">
                We sent a link to <span className="font-medium text-foreground">{email}</span>. Click the link to confirm your contact address.
              </p>
            </div>
          </div>

          {/* Step 2: Admin Review (Current) */}
          <div className="flex items-start gap-3.5">
            <div className="size-8 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5 ring-2 ring-amber-500/20">
              <Clock className="size-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-foreground">
                  2. Admin review
                </p>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300">
                  Current
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Our verification team reviews your business information and catalogs. We will notify you by email once your application has been evaluated.
              </p>
            </div>
          </div>

          {/* Step 3: Start Listing */}
          <div className="flex items-start gap-3.5 opacity-60">
            <div className="size-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles className="size-4.5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                3. Start listing equipment
              </p>
              <p className="text-xs text-muted-foreground">
                Once approved, you will have access to the vendor dashboard to manage listings, inventory, and rental bookings.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-3 pt-2">
        <AppLink to="/">
          <Button
            type="button"
            className="w-full h-12 bg-brand hover:bg-brand-hover text-white font-medium"
          >
            <Home className="size-4.5 mr-2" />
            <span>Back to home</span>
          </Button>
        </AppLink>

        <Button
          type="button"
          variant="outline"
          onClick={handleResend}
          disabled={secondsLeft > 0 || resending}
          className="w-full h-11 text-sm font-medium"
        >
          {resending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : secondsLeft > 0 ? (
            `Resend verification email (${secondsLeft}s)`
          ) : (
            <span className="flex items-center gap-1.5">
              <RefreshCw className="size-3.5" />
              <span>Resend verification email</span>
            </span>
          )}
        </Button>
      </div>
    </div>
  )
}
