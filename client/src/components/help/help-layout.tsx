import React from 'react'
import { HelpNav } from './help-nav'
import type { HelpTab } from '@/types/help'

interface HelpLayoutProps {
  currentTab: HelpTab
  children: React.ReactNode
}

export function HelpLayout({ currentTab, children }: HelpLayoutProps) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Page Heading */}
      <div className="mb-8 space-y-2">
        <p className="text-xs font-semibold text-muted-foreground">
          Help & Support
        </p>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
          How can we help?
        </h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Clear answers for renting, listing, and operating on the Rent4Fraction platform.
        </p>
      </div>

      {/* Main Layout Grid */}
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        <HelpNav currentTab={currentTab} />
        <main className="flex-1 w-full min-w-0">{children}</main>
      </div>
    </div>
  )
}
