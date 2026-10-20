import { ArrowRight, LogOut, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AppLink } from '@/components/shared/app-link'
import { useAuth } from '@/providers/auth-provider'
import { getHomeForRole } from '@/lib/auth'
import { usePageTitle } from '@/hooks/use-page-title'
import type { Role } from '@/types/auth'

export interface ForbiddenProps {
  requiredRoles?: Role[]
  message?: string
}

export function Forbidden({ requiredRoles, message }: ForbiddenProps) {
  usePageTitle('403 · Access Denied')
  const { user, role, logout } = useAuth()

  const homeHref = getHomeForRole(user?.role || role)

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md mx-auto text-center rounded-[16px] border border-border/80 bg-surface p-6 sm:p-10 shadow-xs">
        <div className="size-16 rounded-full bg-danger/10 text-danger flex items-center justify-center mx-auto mb-5">
          <ShieldAlert className="size-8 stroke-[1.8]" />
        </div>

        <span className="inline-block px-2.5 py-0.5 rounded-full bg-danger/15 text-danger text-xs font-mono font-bold tracking-wider mb-2">
          403 · FORBIDDEN
        </span>

        <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-2">
          Access Restricted
        </h1>

        <p className="text-sm text-muted-foreground leading-relaxed mb-6">
          {message ||
            (requiredRoles && requiredRoles.length > 0
              ? `You do not have permission to view this section. This area requires ${requiredRoles.join(' or ')} access.`
              : 'You do not have permission to view this resource with your current account role.')}
        </p>

        <div className="space-y-3">
          <AppLink to={homeHref}>
            <Button className="w-full h-11 bg-brand hover:bg-brand-hover text-white font-medium">
              <span>Go to my home</span>
              <ArrowRight className="size-4 ml-1.5" />
            </Button>
          </AppLink>

          <Button
            type="button"
            variant="outline"
            onClick={logout}
            className="w-full h-10 text-xs text-muted-foreground hover:text-foreground"
          >
            <LogOut className="size-3.5 mr-1.5" />
            <span>Switch account</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
