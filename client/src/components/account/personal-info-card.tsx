import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/providers/auth-provider'
import { auth } from '@/lib/firebase'
import { sendEmailVerification } from 'firebase/auth'
import { CheckCircle2, Edit, Loader2, Mail } from 'lucide-react'
import { toast } from 'sonner'

export function PersonalInfoCard() {
  const { user, updateProfile } = useAuth()

  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState(user?.name || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [saving, setSaving] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [sendingVerify, setSendingVerify] = useState(false)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || saving) return

    setSaving(true)
    try {
      await updateProfile({
        name: name.trim(),
        phone: phone.trim() || null,
      })
      toast.success('Profile updated successfully')
      setIsEditing(false)
    } catch {
      toast.error('Failed to update profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setName(user?.name || '')
    setPhone(user?.phone || '')
    setIsEditing(false)
  }

  const handleSendVerification = async () => {
    if (cooldown > 0 || sendingVerify) return
    setSendingVerify(true)
    try {
      if (auth.currentUser) await sendEmailVerification(auth.currentUser)
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
      toast.error('Could not send verification email.')
    } finally {
      setSendingVerify(false)
    }
  }

  const displayName = user?.name || 'Aarav Mehta'
  const displayEmail = user?.email || 'aarav@eventpro.in'
  const displayPhone = user?.phone || '9876543210'
  const initials = user?.avatarInitials || 'AM'
  const isVerified = user?.email_verified ?? true

  return (
    <article className="p-5 sm:p-6 rounded-[16px] bg-surface border border-border shadow-none space-y-5">
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="flex items-center gap-3.5">
          {/* Avatar (48px) */}
          <div className="size-12 rounded-full bg-brand/10 border border-brand/20 text-brand font-bold text-base flex items-center justify-center shrink-0 shadow-xs">
            {initials}
          </div>
          <div>
            <h3 className="font-serif font-bold text-base text-foreground">
              Personal Information
            </h3>
            <p className="text-xs text-muted-foreground">
              Update your name and primary contact details for bookings.
            </p>
          </div>
        </div>

        {!isEditing && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(true)}
            className="h-8 text-xs px-3 gap-1.5"
          >
            <Edit className="size-3" />
            <span>Edit</span>
          </Button>
        )}
      </div>

      {isEditing ? (
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="profile-name" className="text-xs font-semibold text-foreground">
              Full name
            </label>
            <input
              id="profile-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-10 px-3 rounded-[8px] border border-border bg-surface text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">
              Email address (read-only)
            </label>
            <input
              type="email"
              disabled
              value={displayEmail}
              className="w-full h-10 px-3 rounded-[8px] border border-border bg-muted/60 text-xs text-muted-foreground cursor-not-allowed"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="profile-phone" className="text-xs font-semibold text-foreground">
              Mobile number
            </label>
            <div className="flex items-center rounded-[8px] border border-border bg-surface focus-within:ring-2 focus-within:ring-brand overflow-hidden">
              <span className="px-3 py-2 text-xs font-semibold text-muted-foreground bg-muted border-r border-border select-none">
                +91
              </span>
              <input
                id="profile-phone"
                type="tel"
                inputMode="numeric"
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                className="w-full h-10 px-3 text-xs text-foreground focus:outline-none bg-transparent tabular-nums"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={saving}
              onClick={handleCancel}
              className="h-9 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={saving || !name.trim()}
              className="h-9 px-4 text-xs font-semibold gap-1.5"
            >
              {saving && <Loader2 className="size-3.5 animate-spin" />}
              <span>Save changes</span>
            </Button>
          </div>
        </form>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-3 rounded-[10px] bg-muted/30 border border-border space-y-1">
            <span className="text-[11px] text-muted-foreground font-medium">Full name</span>
            <div className="font-semibold text-foreground text-sm truncate">{displayName}</div>
          </div>

          <div className="p-3 rounded-[10px] bg-muted/30 border border-border space-y-1.5">
            <span className="text-[11px] text-muted-foreground font-medium">Email address</span>
            <div className="font-semibold text-foreground text-xs truncate">{displayEmail}</div>
            <div>
              {isVerified ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-success bg-success/15 px-2 py-0.5 rounded-full border border-success/30">
                  <CheckCircle2 className="size-3" />
                  <span>Verified</span>
                </span>
              ) : (
                <button
                  type="button"
                  disabled={sendingVerify || cooldown > 0}
                  onClick={handleSendVerification}
                  className="inline-flex items-center gap-1 text-[10px] font-bold text-brand bg-brand/10 hover:bg-brand/15 px-2 py-0.5 rounded-full border border-brand/20 transition-colors"
                >
                  <Mail className="size-3" />
                  <span>{cooldown > 0 ? `Wait ${cooldown}s` : 'Verify email'}</span>
                </button>
              )}
            </div>
          </div>

          <div className="p-3 rounded-[10px] bg-muted/30 border border-border space-y-1">
            <span className="text-[11px] text-muted-foreground font-medium">Mobile number</span>
            <div className="font-semibold text-foreground text-sm tabular-nums">
              +91 {displayPhone}
            </div>
          </div>
        </div>
      )}
    </article>
  )
}
