import { useState } from 'react'
import { PasswordInput } from '@/components/auth/password-input'
import { PasswordStrength } from '@/components/auth/password-strength'
import { Button } from '@/components/ui/button'
import { ReauthDialog } from './reauth-dialog'
import { auth } from '@/lib/firebase'
import { updatePassword } from 'firebase/auth'
import { KeyRound, Loader2, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'

export function ChangePasswordCard() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reauthOpen, setReauthOpen] = useState(false)

  const executeChangePassword = async (_currPass = currentPassword, newPass = newPassword) => {
    if (newPass !== confirmPassword) {
      setError('New passwords do not match.')
      return
    }

    if (newPass.length < 8) {
      setError('Password must be at least 8 characters long.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      if (!auth.currentUser) throw new Error('Not logged in');
      await updatePassword(auth.currentUser, newPass);
      toast.success('Password updated successfully')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: unknown) {
      if ((err as { code?: string })?.code === 'auth/requires-recent-login') {
        setReauthOpen(true);
      } else {
        setError('Failed to update password. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    executeChangePassword()
  }

  const handleReauthSuccess = () => {
    // Retry changing password after successful re-authentication
    executeChangePassword()
  }

  return (
    <article className="p-5 sm:p-6 rounded-[16px] bg-surface border border-border shadow-xs space-y-5">
      <div className="flex items-center gap-3.5 pb-4 border-b border-border">
        <div className="size-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground shrink-0 border border-border">
          <KeyRound className="size-5 stroke-[1.75]" />
        </div>
        <div>
          <h3 className="font-serif font-bold text-base text-foreground">
            Account Security & Password
          </h3>
          <p className="text-xs text-muted-foreground">
            Use a unique password with at least 8 characters to protect your account.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        {/* Current Password */}
        <div className="space-y-1">
          <label
            htmlFor="current-password"
            className="text-xs font-semibold text-foreground"
          >
            Current password
          </label>
          <PasswordInput
            id="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />
        </div>

        {/* New Password with PasswordStrength */}
        <div className="space-y-1">
          <label
            htmlFor="new-password"
            className="text-xs font-semibold text-foreground"
          >
            New password
          </label>
          <PasswordInput
            id="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="At least 8 characters"
            autoComplete="new-password"
            required
          />
          <PasswordStrength password={newPassword} />
        </div>

        {/* Confirm New Password */}
        <div className="space-y-1">
          <label
            htmlFor="confirm-password"
            className="text-xs font-semibold text-foreground"
          >
            Confirm new password
          </label>
          <PasswordInput
            id="confirm-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter new password"
            autoComplete="new-password"
            required
          />
        </div>

        {error && (
          <div className="p-2.5 rounded-lg bg-danger/10 border border-danger/20 text-xs text-danger">
            {error}
          </div>
        )}

        <div className="pt-2">
          <Button
            type="submit"
            disabled={
              submitting ||
              !currentPassword ||
              !newPassword ||
              !confirmPassword ||
              newPassword.length < 8
            }
            className="h-10 px-5 text-xs font-semibold gap-1.5"
          >
            {submitting && <Loader2 className="size-4 animate-spin" />}
            <ShieldCheck className="size-4" />
            <span>Update password</span>
          </Button>
        </div>
      </form>

      {/* Reauth Dialog */}
      {reauthOpen && (
        <ReauthDialog
          open={reauthOpen}
          onOpenChange={setReauthOpen}
          onSuccess={handleReauthSuccess}
        />
      )}
    </article>
  )
}
