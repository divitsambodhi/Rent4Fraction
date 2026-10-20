import React, { useState } from 'react'
import { CheckCircle2, Loader2, Mail } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/shared/form-field'
import { FormAlert } from './form-alert'
import { useCooldown } from '@/hooks/use-cooldown'
import { mockAuthService } from '@/lib/auth'

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
      await mockAuthService.sendPasswordReset(trimmed)
      setSubmittedEmail(trimmed)
      setIsSubmitted(true)
      start(60)
    } catch {
      // Per security rules, never leak account existence; show confirmation anyway
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
      await mockAuthService.sendPasswordReset(submittedEmail)
      start(60)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px] p-6">
        {!isSubmitted ? (
          <div>
            <DialogHeader className="mb-4">
              <div className="size-11 rounded-full bg-brand/10 text-brand flex items-center justify-center mb-2">
                <Mail className="size-5.5" />
              </div>
              <DialogTitle className="font-serif text-2xl font-bold tracking-tight text-foreground">
                Reset your password
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-1">
                Enter the email associated with your account and we&apos;ll send you a link to reset your password.
              </DialogDescription>
            </DialogHeader>

            {error && (
              <FormAlert
                type="error"
                message={error}
                className="mb-4"
                onDismiss={() => setError(null)}
              />
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <FormField label="Email address" htmlFor="forgot-email" required>
                {({ id }) => (
                  <Input
                    id={id}
                    type="email"
                    autoComplete="email"
                    placeholder="name@eventpro.in"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-12"
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
                  className="h-11 sm:flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="h-11 sm:flex-1 bg-brand hover:bg-brand-hover text-white font-medium"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="size-4 animate-spin" />
                      <span>Sending...</span>
                    </span>
                  ) : (
                    'Send link'
                  )}
                </Button>
              </div>
            </form>
          </div>
        ) : (
          <div className="text-center py-2 space-y-4">
            <div className="size-14 rounded-full bg-success/10 text-success flex items-center justify-center mx-auto">
              <CheckCircle2 className="size-7" />
            </div>

            <div className="space-y-1.5">
              <DialogTitle className="font-serif text-2xl font-bold text-foreground">
                Check your inbox
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground max-w-sm mx-auto">
                If an account exists for <span className="font-medium text-foreground">{submittedEmail}</span>, you will receive password reset instructions shortly.
              </DialogDescription>
            </div>

            <div className="pt-3 space-y-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleResend}
                disabled={secondsLeft > 0 || loading}
                className="w-full h-11 text-sm font-medium"
              >
                {loading ? (
                  <Loader2 className="size-4 animate-spin" />
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
                className="w-full h-10 text-sm text-muted-foreground hover:text-foreground"
              >
                Back to log in
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
