import { AppLink } from '@/components/shared/app-link'
import { useAuth } from '@/providers/auth-provider'

export function Footer() {
  const { role } = useAuth()

  return (
    <footer className="border-t border-border bg-surface text-foreground py-6 sm:py-8 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-5">
        {/* Top row: Brand summary & navigation links */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div className="space-y-1">
            <AppLink
              to="/"
              className="inline-flex items-center gap-2 text-base font-bold tracking-tight text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-sm"
              aria-label="Rent4Fraction Home"
            >
              <img src="/images/logo.svg" alt="" aria-hidden="true" className="size-6 shrink-0" />
              Rent4Fraction
            </AppLink>
            <p className="text-xs text-text-secondary max-w-md">
              Event equipment rental marketplace. Rent sound, lighting, staging, and seating from verified owners.
            </p>
          </div>

          {/* Compact categorized link groups per role */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-text-secondary">
            {role === 'admin' ? (
              <>
                <AppLink to="/admin" className="hover:text-brand transition-colors font-medium">
                  Admin console
                </AppLink>
                <AppLink to="/help?tab=contact" className="hover:text-brand transition-colors">
                  Contact support
                </AppLink>
                <AppLink to="/help?tab=terms" className="hover:text-brand transition-colors">
                  Terms
                </AppLink>
                <AppLink to="/help?tab=privacy" className="hover:text-brand transition-colors">
                  Privacy
                </AppLink>
              </>
            ) : role === 'vendor' ? (
              <>
                <AppLink to="/vendor" className="hover:text-brand transition-colors font-medium">
                  Vendor portal
                </AppLink>
                <AppLink to="/help?tab=how-it-works" className="hover:text-brand transition-colors">
                  How it works
                </AppLink>
                <AppLink to="/help?tab=contact" className="hover:text-brand transition-colors">
                  Contact support
                </AppLink>
                <AppLink to="/help?tab=terms" className="hover:text-brand transition-colors">
                  Terms
                </AppLink>
                <AppLink to="/help?tab=privacy" className="hover:text-brand transition-colors">
                  Privacy
                </AppLink>
              </>
            ) : role === 'customer' ? (
              <>
                <AppLink to="/equipment" className="hover:text-brand transition-colors">
                  Equipment catalog
                </AppLink>
                <AppLink to="/help?tab=how-it-works" className="hover:text-brand transition-colors">
                  How it works
                </AppLink>
                <AppLink to="/account?tab=bookings" className="hover:text-brand transition-colors">
                  My bookings
                </AppLink>
                <AppLink to="/help?tab=contact" className="hover:text-brand transition-colors">
                  Contact support
                </AppLink>
                <AppLink to="/help?tab=terms" className="hover:text-brand transition-colors">
                  Terms
                </AppLink>
                <AppLink to="/help?tab=privacy" className="hover:text-brand transition-colors">
                  Privacy
                </AppLink>
              </>
            ) : (
              <>
                <AppLink to="/equipment" className="hover:text-brand transition-colors">
                  Equipment catalog
                </AppLink>
                <AppLink to="/help?tab=how-it-works" className="hover:text-brand transition-colors">
                  How it works
                </AppLink>
                <AppLink to="/help?tab=contact" className="hover:text-brand transition-colors">
                  Contact support
                </AppLink>
                <AppLink to="/help?tab=terms" className="hover:text-brand transition-colors">
                  Terms
                </AppLink>
                <AppLink to="/help?tab=privacy" className="hover:text-brand transition-colors">
                  Privacy
                </AppLink>
              </>
            )}
          </div>
        </div>

        {/* Bottom hairline bar: Copyright & Legal */}
        <div className="pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs text-text-secondary">
          <div className="flex items-center gap-3">
            <span>© 2026 Rent4Fraction. Direct cash on delivery event equipment rentals.</span>
          </div>
          <div className="flex items-center gap-4">
            <AppLink to="/help" className="hover:text-brand hover:underline py-0.5">
              Help and support
            </AppLink>
            <AppLink to="/help?tab=terms" className="hover:text-brand hover:underline py-0.5">
              Terms
            </AppLink>
            <AppLink to="/help?tab=privacy" className="hover:text-brand hover:underline py-0.5">
              Privacy
            </AppLink>
          </div>
        </div>
      </div>
    </footer>
  )
}
