import { useState } from 'react'
import { CheckCircle2, Mail, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/providers/auth-provider'
import { auth } from '@/lib/firebase'
import { sendEmailVerification } from 'firebase/auth'

export function UserSummaryCard() {
  const { user } = useAuth()
  const [sending, setSending] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  const handleSendVerification = async () => {
    if (cooldown > 0 || sending) return
    setSending(true)
    try {
      if (auth.currentUser) {
        await sendEmailVerification(auth.currentUser)
      }
      toast.success('Verification email sent', {
        description: `Check your inbox at ${user?.email || 'your email'}.`,
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

  const displayName = user?.name || 'Customer'
  const displayEmail = user?.email || ''
  const displayInitials = user?.avatarInitials || 'U'
  const isVerified = Boolean(user?.email_verified)

  return (
    <div className="p-3.5 rounded-[12px] bg-muted/30 border border-border/70 flex items-center gap-3">
      {/* 40px Initials Avatar */}
      <div className="size-10 rounded-full bg-brand/10 border border-brand/20 text-brand font-bold text-xs flex items-center justify-center shrink-0 shadow-none">
        {displayInitials}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-semibold text-foreground text-sm truncate">{displayName}</span>
          {isVerified ? (
            <span
              className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-[6px]"
              title="Email address verified"
            >
              <CheckCircle2 className="size-3" />
              Verified
            </span>
          ) : (
            <button
              type="button"
              onClick={handleSendVerification}
              disabled={sending || cooldown > 0}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-[6px] transition-colors cursor-pointer disabled:opacity-60"
              title="Click to send verification link"
            >
              {sending ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <Mail className="size-3" />
              )}
              {cooldown > 0 ? `Resend (${cooldown}s)` : 'Verify email'}
            </button>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">{displayEmail}</p>
      </div>
    </div>
  )
}
