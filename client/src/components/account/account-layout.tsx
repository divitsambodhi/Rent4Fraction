import React from 'react'
import { Breadcrumbs } from '@/components/shared/breadcrumbs'
import { AccountSidebar } from './account-sidebar'
import { AccountTabsMobile } from './account-tabs-mobile'
import type { AccountTabKey, AccountBadges } from '@/types/account'

interface AccountLayoutProps {
  activeTab: AccountTabKey
  badges?: AccountBadges | null
  children: React.ReactNode
}

const TAB_TITLES: Record<AccountTabKey, string> = {
  bookings: 'My bookings',
  inbox: 'Inbox',
  wishlist: 'Wishlist',
  addresses: 'Saved addresses',
  profile: 'Profile & security',
  payments: 'Payments & deposits',
  reviews: 'My reviews',
}

export function AccountLayout({
  activeTab,
  badges,
  children,
}: AccountLayoutProps) {
  const currentTabName = TAB_TITLES[activeTab] || 'Account'

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Breadcrumbs */}
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'My account', href: '/account' },
            { label: currentTabName },
          ]}
        />

        {/* Page Heading */}
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-foreground tracking-tight">
            My account
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Manage your bookings, vendor messages, saved equipment, and account settings.
          </p>
        </div>

        {/* Mobile Horizontal Snap Pill Tabs (<1024px) */}
        <AccountTabsMobile activeTab={activeTab} badges={badges} />

        {/* Desktop Layout (>=1024px) */}
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          <div className="hidden lg:block shrink-0">
            <AccountSidebar activeTab={activeTab} badges={badges} />
          </div>

          {/* Main Account Content Panel */}
          <main className="flex-1 w-full min-w-0" id="account-main-content">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
