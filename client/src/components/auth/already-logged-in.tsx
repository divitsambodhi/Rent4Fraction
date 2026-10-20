import { ArrowRight, CheckCircle2, LogOut, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AppLink } from '@/components/shared/app-link'
import { getHomeForRole, sanitizeRedirect } from '@/lib/auth'
import type { AuthUser } from '@/types/auth'

export interface AlreadyLoggedInProps {
  user: AuthUser
  onLogout: () => void
  redirectPath?: string | null
}

export function AlreadyLoggedIn({
  user,
  onLogout,
  redirectPath,
}: AlreadyLoggedInProps) {
  // Destination calculation
  const sanitizedRedirect = sanitizeRedirect(redirectPath)
  const homePath =
    user.role === 'customer' && sanitizedRedirect
      ? sanitizedRedirect
      : getHomeForRole(user.role)

  const roleLabelMap: Record<string, string> = {
    customer: 'Customer',
    vendor: user.vendor?.approval_status === 'pending' ? 'Vendor (Pending Review)' : 'Equipment Vendor',
    admin: 'Administrator',
  }

  const roleBadgeVariantMap: Record<string, 'brand' | 'warning' | 'info' | 'success'> = {
    customer: 'brand',
    vendor: user.vendor?.approval_status === 'pending' ? 'warning' : 'brand',
    admin: 'info',
  }

  return (
    <div className="w-full text-center space-y-6 animate-in fade-in-50 duration-200">
      <div className="size-16 rounded-full bg-brand/10 text-brand flex items-center justify-center mx-auto shadow-xs">
        <User className="size-8 stroke-[1.8]" />
      </div>

      <div className="space-y-2">
        <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          You&apos;re already signed in
        </h1>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          Currently signed in as{' '}
          <span className="font-semibold text-foreground">{user.name}</span>
        </p>
        <p className="text-xs text-muted-foreground">{user.email}</p>
      </div>

      <div className="flex items-center justify-center gap-2">
        <Badge variant={roleBadgeVariantMap[user.role] || 'brand'} className="capitalize py-1 px-3 text-xs font-semibold">
          {roleLabelMap[user.role] || user.role}
        </Badge>
        {user.email_verified && (
          <Badge variant="success" className="py-1 px-2.5 text-[11px] font-medium flex items-center gap-1">
            <CheckCircle2 className="size-3" />
            <span>Verified</span>
          </Badge>
        )}
      </div>

      <div className="space-y-3 pt-3 max-w-sm mx-auto">
        <AppLink to={homePath}>
          <Button
            type="button"
            className="w-full h-12 bg-brand hover:bg-brand-hover text-white font-medium shadow-xs"
          >
            <span>Continue</span>
            <ArrowRight className="size-4 ml-1.5" />
          </Button>
        </AppLink>

        <Button
          type="button"
          variant="outline"
          onClick={onLogout}
          className="w-full h-11 text-sm font-medium text-danger border-danger/20 hover:bg-danger/10 hover:text-danger"
        >
          <LogOut className="size-4 mr-1.5" />
          <span>Log out</span>
        </Button>
      </div>
    </div>
  )
}
