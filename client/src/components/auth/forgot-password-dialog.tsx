import React, { useState } from 'react'
import { ResponsiveDialog } from '@/components/ui/responsive-dialog'
import { Icon } from '@/components/ui/icon'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/shared/form-field'
import { FormAlert } from './form-alert'
import { useCooldown } from '@/hooks/use-cooldown'
import { authService } from '@/lib/auth'

export interface ForgotPasswordDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialEmail?: string
}

export function ForgotPasswordDialog({
  open,
  onOpenChange,
  initialEmail = '',
}: ForgotPasswordDialogProps) {
  const [email, setEmail] = useState(initialEmail)
  const [submittedEmail, setSubmittedEmail] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { secondsLeft, start } = useCooldown(60)

  // Reset state when opening/closing
  React.useEffect(() => {
    if (open) {
      if (initialEmail) {
        setEmail(initialEmail)
      }
    } else {
      setIsSubmitted(false)
      setError(null)
    }
  }, [open, initialEmail])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = email.trim().toLowerCase()
    if (!trimmed || !trimmed.includes('@')) {
      setError('Please enter a valid email address.')
      return
    }

    setLoading(true)
    setError(null)
    try {
      await authService.sendPasswordReset(trimmed)
      setSubmittedEmail(trimmed)
      setIsSubmitted(true)
      start(60)
    } catch {
      setSubmittedEmail(trimmed)
      setIsSubmitted(true)
      start(60)
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (secondsLeft > 0 || !submittedEmail) return
    setLoading(true)
    try {
      await authService.sendPasswordReset(submittedEmail)
      start(60)
    } finally {
      setLoading(false)
    }
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      overlayId="forgot-password-dialog"
      title={isSubmitted ? 'Check your inbox' : 'Reset your password'}
      description={
        isSubmitted
          ? `If an account exists for ${submittedEmail}, password reset instructions have been sent.`
          : "Enter your email address and we'll send you a link to reset your password."
      }
      className="sm:max-w-[440px]"
    >
      {!isSubmitted ? (
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {error && (
            <FormAlert
              type="error"
              message={error}
              className="mb-2"
              onDismiss={() => setError(null)}
            />
          )}

          <FormField label="Email address" htmlFor="forgot-email" required>
            {({ id }) => (
              <Input
                id={id}
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="name@eventpro.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 text-base sm:text-sm"
                disabled={loading}
                autoFocus
              />
            )}
          </FormField>

          <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="h-11 min-h-[44px] sm:flex-1 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !email.trim()}
              className="h-11 min-h-[44px] sm:flex-1 bg-brand hover:bg-brand-hover text-white font-medium cursor-pointer"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Icon name="loader" size={16} className="animate-spin" />
                  <span>Sending...</span>
                </span>
              ) : (
                'Send link'
              )}
            </Button>
          </div>
        </form>
      ) : (
        <div className="text-center py-2 space-y-4">
          <div className="size-14 rounded-full bg-success/10 text-success flex items-center justify-center mx-auto">
            <Icon name="check" size={28} />
          </div>

          <div className="pt-2 space-y-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleResend}
              disabled={secondsLeft > 0 || loading}
              className="w-full h-11 min-h-[44px] text-sm font-medium cursor-pointer"
            >
              {loading ? (
                <Icon name="loader" size={16} className="animate-spin" />
              ) : secondsLeft > 0 ? (
                `Resend instructions (${secondsLeft}s)`
              ) : (
                'Resend instructions'
              )}
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="w-full h-11 min-h-[44px] text-sm text-muted-foreground hover:text-foreground cursor-pointer"
            >
              Back to log in
            </Button>
          </div>
        </div>
      )}
    </ResponsiveDialog>
  )
}
