import { useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/account/confirm-dialog'
import { AppLink } from '@/components/shared/app-link'
import { useAuth } from '@/providers/auth-provider'
import type { AdminUser } from '@/types/admin'
import {
  User,
  Mail,
  Shield,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Store,
  PowerOff,
  Check,
  X,
} from 'lucide-react'
import { toast } from 'sonner'

interface UserSheetProps {
  user: AdminUser | null
  onClose: () => void
  onStatusToggled: (userId: string) => void
}

export function UserSheet({
  user,
  onClose,
  onStatusToggled,
}: UserSheetProps) {
  const { user: currentUser } = useAuth()
  const [confirmOpen, setConfirmOpen] = useState(false)

  if (!user) return null

  const isSelf = currentUser?.email === user.email
  const isDeactivated = user.status === 'deactivated'

  const handleToggle = () => {
    if (isSelf) {
      toast.error('You cannot deactivate your own administrative account.')
      return
    }
    onStatusToggled(user.user_id)
    toast.success(
      isDeactivated
        ? `Account ${user.email} reactivated.`
        : `Account ${user.email} deactivated. User can no longer log in.`
    )
    setConfirmOpen(false)
  }

  return (
    <>
      <Sheet open={Boolean(user)} onOpenChange={(open) => !open && onClose()}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-[540px] h-full p-0 flex flex-col bg-surface border-l border-border shadow-2xl focus:outline-none"
        >
          {/* Header */}
          <header className="px-6 py-4 border-b border-border bg-surface/95 backdrop-blur-md flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="size-10 rounded-full bg-brand/10 text-brand font-bold text-sm flex items-center justify-center shrink-0 border border-brand/20">
                {user.avatar_initials}
              </div>
              <div className="min-w-0">
                <SheetTitle className="text-base font-serif font-bold text-foreground truncate">
                  {user.name}
                </SheetTitle>
                <div className="text-xs text-muted-foreground truncate">{user.email}</div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="size-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0"
            >
              <X className="size-4.5 stroke-[2]" />
            </button>
          </header>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            {/* Status & Role Pill */}
            <div className="p-4 rounded-[14px] bg-muted/30 border border-border flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-[11px] text-muted-foreground uppercase font-bold tracking-wider">
                  Account Status
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-mono font-semibold px-2 py-0.5 rounded-full border ${
                      isDeactivated
                        ? 'bg-danger/10 text-danger border-danger/30'
                        : 'bg-success/10 text-success border-success/30'
                    }`}
                  >
                    {isDeactivated ? <XCircle className="size-3" /> : <CheckCircle2 className="size-3" />}
                    <span>{isDeactivated ? 'Deactivated' : 'Active'}</span>
                  </span>
                  <span className="font-mono text-xs uppercase px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                    {user.role}
                  </span>
                </div>
              </div>

              {user.email_verified && (
                <div className="flex items-center gap-1 text-xs text-success font-medium">
                  <CheckCircle2 className="size-3.5" />
                  <span>Verified</span>
                </div>
              )}
            </div>

            {/* Details list */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                User Information
              </h4>
              <div className="p-4 rounded-[14px] bg-muted/20 border border-border divide-y divide-border/60 text-xs">
                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <User className="size-3.5" />
                    <span>User ID</span>
                  </span>
                  <span className="font-mono text-foreground font-semibold">{user.user_id}</span>
                </div>

                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Mail className="size-3.5" />
                    <span>Email address</span>
                  </span>
                  <span className="text-foreground">{user.email}</span>
                </div>

                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="size-3.5" />
                    <span>Member since</span>
                  </span>
                  <span className="text-foreground font-mono">{user.joined_at}</span>
                </div>

                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Clock className="size-3.5" />
                    <span>Last login</span>
                  </span>
                  <span className="text-foreground font-mono">{user.last_login}</span>
                </div>

                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Shield className="size-3.5" />
                    <span>Platform bookings</span>
                  </span>
                  <span className="text-foreground font-semibold font-mono">{user.bookings_count}</span>
                </div>

                {user.vendor_id && (
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Store className="size-3.5 text-brand" />
                      <span>Linked Vendor Store</span>
                    </span>
                    <AppLink
                      to={`/admin?section=vendors&vendor=${user.vendor_id}`}
                      className="text-xs font-semibold text-brand hover:underline"
                    >
                      View Vendor Profile →
                    </AppLink>
                  </div>
                )}
              </div>
            </div>

            {/* Governance Notes */}
            <div className="p-4 rounded-[12px] bg-muted/40 border border-border/80 text-xs text-muted-foreground space-y-1">
              <div className="font-bold text-foreground">Account Governance Policy</div>
              <p>
                Deactivating an account immediately revokes login permissions and blocks checkout sessions. Past orders and audit records are preserved indefinitely.
              </p>
            </div>
          </div>

          {/* Footer */}
          <footer className="px-6 py-4 border-t border-border bg-surface/95 backdrop-blur-md flex items-center justify-between gap-3 shrink-0">
            {isSelf ? (
              <span className="text-xs text-muted-foreground italic">Current user account</span>
            ) : (
              <Button
                variant={isDeactivated ? 'outline' : 'danger'}
                size="sm"
                onClick={() => setConfirmOpen(true)}
                className="h-9 text-xs font-semibold gap-1.5"
              >
                {isDeactivated ? (
                  <>
                    <Check className="size-3.5" />
                    <span>Reactivate Account</span>
                  </>
                ) : (
                  <>
                    <PowerOff className="size-3.5" />
                    <span>Deactivate Account</span>
                  </>
                )}
              </Button>
            )}

            <Button variant="outline" size="sm" onClick={onClose} className="h-9 text-xs px-4">
              Close
            </Button>
          </footer>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={isDeactivated ? 'Reactivate User Account' : 'Deactivate User Account'}
        description={
          isDeactivated
            ? `Are you sure you want to reactivate access for ${user.email}? They will be able to log in and place orders again.`
            : `Are you sure you want to deactivate ${user.email}? They will be blocked from logging in with an account-disabled message.`
        }
        confirmLabel={isDeactivated ? 'Reactivate' : 'Deactivate'}
        variant={isDeactivated ? 'default' : 'danger'}
        onConfirm={handleToggle}
      />
    </>
  )
}
