import { useState } from 'react'
import { CheckCircle2, Mail, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/providers/auth-provider'
import { mockAuthService } from '@/lib/auth'

export function UserSummaryCard() {
  const { user } = useAuth()
  const [sending, setSending] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  const handleSendVerification = async () => {
    if (cooldown > 0 || sending) return
    setSending(true)
    try {
      await mockAuthService.sendEmailVerification()
      toast.success('Verification email sent', {
        description: `Check your inbox at ${user?.email}.`,
      })
      setCooldown(60)
      const interval = setInterval(() => {
        setCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(interval)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } catch {
      toast.error('Could not send verification email. Please try again.')
    } finally {
      setSending(false)
    }
  }

  const displayName = user?.name || 'Aarav Mehta'
  const displayEmail = user?.email || 'aarav@eventpro.in'
  const displayInitials = user?.avatarInitials || 'AM'
  const isVerified = user?.email_verified ?? true

  return (
    <div className="p-3.5 rounded-[12px] bg-muted/30 border border-border/70 flex items-center gap-3">
      {/* 40px Initials Avatar */}
      <div className="size-10 rounded-full bg-brand/10 border border-brand/20 text-brand font-bold text-xs flex items-center justify-center shrink-0 shadow-none">
        {displayInitials}
      </div>

      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-foreground truncate">
          {displayName}
        </div>
        <div className="text-xs text-muted-foreground truncate mb-1">
          {displayEmail}
        </div>

        {isVerified ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-success bg-success/15 px-2 py-0.5 rounded-full border border-success/30">
            <CheckCircle2 className="size-3" />
            <span>Email verified</span>
          </span>
        ) : (
          <button
            type="button"
            disabled={sending || cooldown > 0}
            onClick={handleSendVerification}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand bg-brand/10 hover:bg-brand/15 px-2 py-0.5 rounded-full border border-brand/20 transition-colors cursor-pointer disabled:opacity-50"
          >
            {sending ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <Mail className="size-3" />
            )}
            <span>
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Verify email'}
            </span>
          </button>
        )}
      </div>
    </div>
  )
}
