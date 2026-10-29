import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Navbar } from './navbar'
import { Footer } from './footer'
import { AppLink, useAppNavigate, useAppPathname, useAppSearchParams } from '@/components/shared/app-link'
import { useAuth } from '@/providers/auth-provider'
import { evaluateRoutePolicy } from '@/lib/route-policy'
import { Forbidden } from '@/components/auth/forbidden'

export function PublicShell() {
  const { role, status } = useAuth()
  const pathname = useAppPathname()
  const [searchParams] = useAppSearchParams()
  const navigate = useAppNavigate()

  const isPreview = searchParams.get('preview') === '1' && (role === 'vendor' || role === 'admin')
  const isHelpForDashboardRole = pathname === '/help' && (role === 'vendor' || role === 'admin')

  useEffect(() => {
    if (status !== 'ready') return

    const decision = evaluateRoutePolicy(role, pathname, searchParams)
    if (decision.action === 'redirect' && decision.to) {
      navigate(decision.to, { replace: true })
    }
  }, [role, status, pathname, searchParams, navigate])

  if (status === 'ready') {
    const decision = evaluateRoutePolicy(role, pathname, searchParams)
    if (decision.action === 'forbidden') {
      return (
        <div className="min-h-dvh flex flex-col bg-background text-foreground">
          <Navbar />
          <main className="flex-1">
            <Forbidden requiredRoles={['customer']} />
          </main>
          <Footer />
        </div>
      )
    }
    if (decision.action === 'redirect') {
      return null
    }
  }

  // If viewing help as a vendor or admin, render raw outlet (which renders in their respective dashboard shell)
  if (isHelpForDashboardRole) {
    return (
      <div className="min-h-dvh bg-background text-foreground antialiased selection:bg-brand selection:text-white relative">
        <Outlet />
      </div>
    )
  }

  // Preview exception: vendor or admin viewing public page with ?preview=1
  if (isPreview) {
    return (
      <div className="min-h-dvh flex flex-col bg-background text-foreground antialiased selection:bg-brand selection:text-white relative">
        {/* Slim top notice for preview mode */}
        <header className="h-10 bg-surface border-b border-border px-4 flex items-center justify-between text-xs sticky top-0 z-50 select-none">
          <div className="flex items-center gap-2.5">
            <span className="font-bold tracking-tight text-foreground">Rent4Fraction</span>
            <span className="text-border">|</span>
            <span className="text-muted-foreground">Preview of the customer view</span>
          </div>
          <AppLink
            to={role === 'admin' ? '/admin' : '/vendor'}
            className="font-medium text-brand hover:underline"
          >
            Back to dashboard
          </AppLink>
        </header>

        <main id="main" className="flex-1">
          <Outlet />
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-dvh flex flex-col bg-background text-foreground antialiased selection:bg-brand selection:text-white relative">
      {/* Skip to Main Content Link for Keyboard Accessibility */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-brand focus:text-white focus:rounded-md focus:shadow-lg focus:outline-none"
      >
        Skip to main content
      </a>

      {/* App Shell Sticky Navbar */}
      <Navbar />

      {/* Main Content Area */}
      <main id="main" className="flex-1">
        <Outlet />
      </main>

      {/* App Shell Footer */}
      <Footer />

      {/* Non-intrusive Dev Role Switcher */}
    </div>
  )
}
