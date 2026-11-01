import { useState } from 'react'
import { CheckCircle2, Loader2, Mail, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FormAlert } from './form-alert'
import { useCooldown } from '@/hooks/use-cooldown'
import { authService } from '@/lib/auth'

export interface VerifyEmailPanelProps {
  email: string
  onVerified: () => void
  onChangeEmail?: () => void
  onSkip?: () => void
}

export function VerifyEmailPanel({
  email,
  onVerified,
  onChangeEmail,
  onSkip,
}: VerifyEmailPanelProps) {
  const { secondsLeft, start } = useCooldown(60)
  const [resending, setResending] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const handleResend = async () => {
    if (secondsLeft > 0 || resending) return
    setResending(true)
    setFeedback(null)
    try {
      await authService.sendEmailVerification()
      start(60)
      setFeedback({
        type: 'success',
        message: 'A new verification email has been sent. Please check your inbox.',
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

  const handleCheckVerification = async () => {
    setVerifying(true)
    setFeedback(null)
    try {
      await authService.reloadUser()
      const currentUser = authService.getCurrentUser()
      if (currentUser) {
        // Reloaded user has updated emailVerified state
      }
      onVerified()
    } catch {
      setFeedback({
        type: 'error',
        message: 'Could not confirm verification. Please click the link in your email first.',
      })
    } finally {
      setVerifying(false)
    }
  }

  return (
    <div className="w-full text-center space-y-6 animate-in fade-in-50 duration-200">
      <div className="size-16 rounded-full bg-brand/10 text-brand flex items-center justify-center mx-auto shadow-xs">
        <Mail className="size-8 stroke-[1.8]" />
      </div>

      <div className="space-y-2">
        <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Check your email
        </h1>
        <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
          We&apos;ve sent a verification link to{' '}
          <span className="font-semibold text-foreground">{email}</span>. Click
          the link in the email to activate your account and access all features.
        </p>
      </div>

      {feedback && (
        <FormAlert
          type={feedback.type}
          message={feedback.message}
          onDismiss={() => setFeedback(null)}
        />
      )}

      <div className="space-y-3 pt-2 max-w-sm mx-auto">
        <Button
          type="button"
          onClick={handleCheckVerification}
          disabled={verifying}
          className="w-full h-12 bg-brand hover:bg-brand-hover text-white font-medium shadow-xs"
        >
          {verifying ? (
            <span className="flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" />
              <span>Checking verification...</span>
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <CheckCircle2 className="size-4.5" />
              <span>I&apos;ve verified my email</span>
            </span>
          )}
        </Button>

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
            `Resend email (${secondsLeft}s)`
          ) : (
            <span className="flex items-center gap-1.5">
              <RefreshCw className="size-3.5" />
              <span>Resend verification email</span>
            </span>
          )}
        </Button>

        <div className="flex items-center justify-center gap-4 text-xs font-medium text-muted-foreground pt-2">
          {onChangeEmail && (
            <button
              type="button"
              onClick={onChangeEmail}
              className="hover:text-foreground underline underline-offset-2 transition-colors cursor-pointer"
            >
              Change email
            </button>
          )}

          {onSkip && (
            <>
              {onChangeEmail && <span>·</span>}
              <button
                type="button"
                onClick={onSkip}
                className="hover:text-foreground underline underline-offset-2 transition-colors cursor-pointer"
              >
                Skip for now
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
