import React from 'react'
import { ArrowLeft, Moon, Package, ShieldCheck, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AppLink } from '@/components/shared/app-link'
import { useTheme } from '@/providers/theme-provider'
import { AuthBrandPanel } from './auth-brand-panel'
import type { AuthMode } from '@/types/auth'

export interface AuthLayoutProps {
  mode: AuthMode
  children: React.ReactNode
}

export function AuthLayout({ mode, children }: AuthLayoutProps) {
  const { resolvedTheme, toggleTheme } = useTheme()

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground selection:bg-brand/15 selection:text-brand">
      {/* Slim Top Bar */}
      <header className="w-full border-b border-border/60 bg-surface/80 backdrop-blur-md sticky top-0 z-30 h-14 sm:h-16">
        <div className="max-w-[1200px] mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          {/* Logo */}
          <AppLink
            to="/"
            className="flex items-center gap-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-lg"
            aria-label="Rent4Fraction Home"
          >
            <div className="size-8 rounded-[10px] bg-brand text-white flex items-center justify-center shadow-xs shrink-0">
              <Package className="size-4.5 stroke-[2.2]" />
            </div>
            <span className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-foreground select-none">
              rent<span className="text-brand">4</span>fraction
            </span>
          </AppLink>

          {/* Right actions */}
          <div className="flex items-center gap-2 sm:gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              aria-label={resolvedTheme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              className="size-9 rounded-full text-foreground/80 hover:text-foreground"
            >
              {resolvedTheme === 'dark' ? (
                <Sun className="size-4.5" />
              ) : (
                <Moon className="size-4.5" />
              )}
            </Button>

            <AppLink
              to="/"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-2.5 py-1.5 rounded-lg hover:bg-muted/50"
            >
              <ArrowLeft className="size-3.5 sm:size-4" />
              <span>Back to home</span>
            </AppLink>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex items-center justify-center py-6 sm:py-8 lg:py-10 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-[1200px] mx-auto">
          {/* Split Screen Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-stretch">
            {/* Left 5/12 Brand Panel */}
            <div className="lg:col-span-5 flex flex-col">
              <AuthBrandPanel mode={mode} />
            </div>

            {/* Right 7/12 Form Card Container */}
            <div className="lg:col-span-7 flex flex-col justify-center">
              <div className="w-full max-w-[520px] mx-auto flex flex-col gap-4">
                {children}

                {/* Legal & Security Line */}
                <div className="text-center text-xs text-muted-foreground/80 space-y-1.5 pt-2">
                  <div className="flex items-center justify-center gap-1.5 text-muted-foreground font-medium text-[11px]">
                    <ShieldCheck className="size-3.5 text-brand" />
                    <span>Protected by enterprise-grade security</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    By continuing, you agree to Rent4Fraction&apos;s{' '}
                    <AppLink
                      to="/help?tab=terms"
                      className="underline underline-offset-2 hover:text-foreground"
                    >
                      Terms of Service
                    </AppLink>{' '}
                    and{' '}
                    <AppLink
                      to="/help?tab=privacy"
                      className="underline underline-offset-2 hover:text-foreground"
                    >
                      Privacy Policy
                    </AppLink>
                    .
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
