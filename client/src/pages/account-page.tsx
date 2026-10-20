import { useEffect, useState } from 'react'
import { AccountLayout } from '@/components/account/account-layout'
import { BookingsTab } from '@/components/account/bookings-tab'
import { InboxTab } from '@/components/account/inbox-tab'
import { WishlistTab } from '@/components/account/wishlist-tab'
import { AddressesTab } from '@/components/account/addresses-tab'
import { ProfileTab } from '@/components/account/profile-tab'
import { PaymentsTab } from '@/components/account/payments-tab'
import { ReviewsTab } from '@/components/account/reviews-tab'
import { useAppSearchParams } from '@/components/shared/app-link'
import { usePageTitle } from '@/hooks/use-page-title'
import { getAccountBadges } from '@/lib/api'
import type { AccountTabKey, AccountBadges } from '@/types/account'

const VALID_TABS: AccountTabKey[] = [
  'bookings',
  'inbox',
  'wishlist',
  'addresses',
  'profile',
  'payments',
  'reviews',
]

const TAB_PAGE_TITLES: Record<AccountTabKey, string> = {
  bookings: 'My bookings',
  inbox: 'Inbox & messages',
  wishlist: 'Saved equipment',
  addresses: 'Saved addresses',
  profile: 'Profile & security',
  payments: 'Payments & deposits',
  reviews: 'My reviews',
}

export function AccountPage() {
  const [searchParams] = useAppSearchParams()

  const rawTab = searchParams.get('tab') as AccountTabKey | null
  const activeTab: AccountTabKey =
    rawTab && VALID_TABS.includes(rawTab) ? rawTab : 'bookings'

  usePageTitle(TAB_PAGE_TITLES[activeTab] || 'My account')

  const [badges, setBadges] = useState<AccountBadges | null>(null)

  const loadBadges = () => {
    getAccountBadges().then((res) => {
      setBadges(res)
    })
  }

  useEffect(() => {
    loadBadges()
  }, [activeTab])

  // Listen for account store changes to update badges simultaneously across tabs
  useEffect(() => {
    const handleStoreUpdated = () => {
      loadBadges()
    }
    window.addEventListener('r4f-account-store-updated', handleStoreUpdated)
    return () => window.removeEventListener('r4f-account-store-updated', handleStoreUpdated)
  }, [])

  return (
    <AccountLayout activeTab={activeTab} badges={badges}>
      {activeTab === 'bookings' && <BookingsTab />}
      {activeTab === 'inbox' && <InboxTab />}
      {activeTab === 'wishlist' && <WishlistTab />}
      {activeTab === 'addresses' && <AddressesTab />}
      {activeTab === 'profile' && <ProfileTab />}
      {activeTab === 'payments' && <PaymentsTab />}
      {activeTab === 'reviews' && <ReviewsTab />}
    </AccountLayout>
  )
}
