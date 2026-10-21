import React from 'react'
import { useLocation } from 'react-router-dom'
import { Navbar } from './navbar'
import { Footer } from './footer'
import { DevRoleSwitcher } from '@/components/shared/dev-role-switcher'

interface PublicLayoutProps {
  children: React.ReactNode
}

export function PublicLayout({ children }: PublicLayoutProps) {
  const location = useLocation()
  const isDashboardRoute =
    location.pathname.startsWith('/vendor') ||
    location.pathname.startsWith('/admin') ||
    location.pathname.startsWith('/preview')

  if (isDashboardRoute) {
    return (
      <div className="min-h-dvh bg-background text-foreground antialiased selection:bg-brand selection:text-white relative">
        {children}
        <DevRoleSwitcher />
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
        {children}
      </main>

      {/* App Shell Footer */}
      <Footer />

      {/* Non-intrusive Dev Role Switcher */}
      <DevRoleSwitcher />
    </div>
  )
}
