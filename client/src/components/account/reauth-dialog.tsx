import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { PasswordInput } from '@/components/auth/password-input'
import { Lock, Loader2 } from 'lucide-react'
import { mockAuthService } from '@/lib/auth'
import { toast } from 'sonner'

interface ReauthDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function ReauthDialog({ open, onOpenChange, onSuccess }: ReauthDialogProps) {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password.trim() || loading) return

    setLoading(true)
    setError(null)

    try {
      await mockAuthService.reauthenticate(password)
      toast.success('Identity verified')
      onOpenChange(false)
      onSuccess()
    } catch {
      setError('Incorrect password. Please enter your current account password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-surface border-border">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2 text-brand">
            <Lock className="size-5" />
            <span className="text-xs font-bold uppercase tracking-wider">
              Security Verification
            </span>
          </div>
          <DialogTitle className="text-xl font-bold font-serif text-foreground">
            Confirm your identity
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            This action requires recent authentication. Please enter your account password to continue.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1">
            <label
              htmlFor="reauth-password"
              className="text-xs font-semibold text-foreground"
            >
              Account password
            </label>
            <PasswordInput
              id="reauth-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter current password"
              autoComplete="current-password"
              required
            />
            {error && <p className="text-[11px] text-danger mt-1">{error}</p>}
          </div>

          <DialogFooter className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="h-10 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !password.trim()}
              className="h-10 px-4 text-xs font-semibold gap-1.5"
            >
              {loading && <Loader2 className="size-4 animate-spin" />}
              <span>Verify & Continue</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
