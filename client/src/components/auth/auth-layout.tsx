import React from 'react'
import { Icon } from '@/components/ui/icon'
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
    <div className="min-h-dvh flex flex-col bg-background text-foreground">
      <header className="w-full border-b border-border bg-surface sticky top-0 z-navbar z-50 min-h-14 sm:min-h-16 h-[calc(3.5rem+env(safe-area-inset-top,0px))] sm:h-[calc(4rem+env(safe-area-inset-top,0px))] pt-[env(safe-area-inset-top,0px)]">
        <div className="max-w-[1200px] mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <AppLink
            to="/"
            className="flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-sm py-1"
            aria-label="Rent4Fraction Home"
          >
            <span className="text-headline-sm font-bold tracking-tight text-foreground select-none">
              rent<span className="text-brand">4</span>fraction
            </span>
          </AppLink>

          <div className="flex items-center gap-2 sm:gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              aria-label={resolvedTheme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              className="text-foreground hover:text-brand min-w-[44px] min-h-[44px]"
            >
              <Icon name={resolvedTheme === 'dark' ? 'sun' : 'moon'} size={18} />
            </Button>

            <AppLink
              to="/"
              className="inline-flex items-center gap-1.5 text-body-sm font-medium text-text-secondary hover:text-foreground transition-colors px-2 py-2 min-h-[44px] rounded-sm"
            >
              <Icon name="arrow-left" size={16} />
              <span>Back to home</span>
            </AppLink>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center py-6 sm:py-8 lg:py-10 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-[1200px] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-stretch">
            <div className="hidden lg:flex lg:col-span-5 flex-col">
              <AuthBrandPanel mode={mode} />
            </div>

            <div className="lg:col-span-7 flex flex-col justify-center">
              <div className="w-full max-w-[520px] mx-auto flex flex-col gap-4">
                {children}

                <div className="text-center text-label-sm text-text-secondary space-y-1 pt-2">
                  <p className="text-[12px] leading-normal">
                    By continuing, you agree to Rent4Fraction&apos;s{' '}
                    <AppLink
                      to="/help?tab=terms"
                      className="underline underline-offset-2 hover:text-foreground"
                    >
                      Terms of service
                    </AppLink>{' '}
                    and{' '}
                    <AppLink
                      to="/help?tab=privacy"
                      className="underline underline-offset-2 hover:text-foreground"
                    >
                      Privacy policy
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
