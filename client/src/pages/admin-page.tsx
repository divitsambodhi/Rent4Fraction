import { useCallback } from 'react'
import { usePageTitle } from '@/hooks/use-page-title'
import { useAppSearchParams } from '@/components/shared/app-link'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { AdminOverview } from '@/components/admin/admin-overview'
import { VendorsSection } from '@/components/admin/vendors-section'
import { DisputesSection } from '@/components/admin/disputes-section'
import { PayoutsSection } from '@/components/admin/payouts-section'
import { CategoriesSection } from '@/components/admin/categories-section'
import { CouponsSection } from '@/components/admin/coupons-section'
import { UsersSection } from '@/components/admin/users-section'
import { BookingsSection } from '@/components/admin/bookings-section'
import type { AdminSection } from '@/types/admin'

const VALID_SECTIONS: AdminSection[] = [
  'overview',
  'vendors',
  'disputes',
  'payouts',
  'categories',
  'coupons',
  'users',
  'bookings',
]

export function AdminPage() {
  const [searchParams, setSearchParams] = useAppSearchParams()

  const rawSection = searchParams.get('section') || 'overview'
  const activeSection: AdminSection = VALID_SECTIONS.includes(rawSection as AdminSection)
    ? (rawSection as AdminSection)
    : 'overview'

  const titles: Record<AdminSection, string> = {
    overview: 'Overview · Platform Health',
    vendors: 'Vendor Partners & Applications',
    disputes: 'Dispute Cases & Claims',
    payouts: 'Vendor Payouts & Settlements',
    categories: 'Catalogue Taxonomy & Categories',
    coupons: 'Promotional Coupons & Vouchers',
    users: 'User Governance & Roles',
    bookings: 'Global Rental Bookings',
  }

  usePageTitle(`${titles[activeSection]} | Admin Console`)

  // Param update helper
  const updateParam = useCallback(
    (key: string, value: string | null, push = false) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (value === null || value === '' || (key === 'status' && value === 'all')) {
            next.delete(key)
          } else {
            next.set(key, value)
          }
          return next
        },
        { replace: !push }
      )
    },
    [setSearchParams]
  )

  return (
    <DashboardLayout
      type="admin"
      title="Admin Console"
      subtitle={titles[activeSection]}
    >
      <div className="space-y-6">
        {activeSection === 'overview' && <AdminOverview />}

        {activeSection === 'vendors' && (
          <VendorsSection
            statusFilter={searchParams.get('status') || 'all'}
            searchQuery={searchParams.get('q') || ''}
            selectedVendorId={searchParams.get('vendor')}
            onStatusChange={(status) => updateParam('status', status)}
            onSearchChange={(q) => updateParam('q', q)}
            onSelectVendor={(id) => updateParam('vendor', id, true)}
          />
        )}

        {activeSection === 'disputes' && (
          <DisputesSection
            statusFilter={searchParams.get('status') || 'open'}
            searchQuery={searchParams.get('q') || ''}
            selectedDisputeId={searchParams.get('dispute')}
            onStatusChange={(status) => updateParam('status', status)}
            onSearchChange={(q) => updateParam('q', q)}
            onSelectDispute={(id) => updateParam('dispute', id, true)}
          />
        )}

        {activeSection === 'payouts' && (
          <PayoutsSection
            statusFilter={searchParams.get('status') || 'all'}
            searchQuery={searchParams.get('q') || ''}
            onStatusChange={(status) => updateParam('status', status)}
            onSearchChange={(q) => updateParam('q', q)}
          />
        )}

        {activeSection === 'categories' && (
          <CategoriesSection
            selectedCategoryId={searchParams.get('category')}
            onSelectCategory={(id) => updateParam('category', id, true)}
          />
        )}

        {activeSection === 'coupons' && (
          <CouponsSection
            statusFilter={searchParams.get('status') || 'all'}
            searchQuery={searchParams.get('q') || ''}
            selectedCouponCode={searchParams.get('coupon')}
            onStatusChange={(status) => updateParam('status', status)}
            onSearchChange={(q) => updateParam('q', q)}
            onSelectCoupon={(code) => updateParam('coupon', code, true)}
          />
        )}

        {activeSection === 'users' && (
          <UsersSection
            roleFilter={searchParams.get('role') || 'all'}
            searchQuery={searchParams.get('q') || ''}
            selectedUserId={searchParams.get('user')}
            onRoleChange={(role) => updateParam('role', role)}
            onSearchChange={(q) => updateParam('q', q)}
            onSelectUser={(id) => updateParam('user', id, true)}
          />
        )}

        {activeSection === 'bookings' && (
          <BookingsSection
            statusFilter={searchParams.get('status') || 'all'}
            searchQuery={searchParams.get('q') || ''}
            selectedBookingId={searchParams.get('booking')}
            onStatusChange={(status) => updateParam('status', status)}
            onSearchChange={(q) => updateParam('q', q)}
            onSelectBooking={(id) => updateParam('booking', id, true)}
          />
        )}
      </div>
    </DashboardLayout>
  )
}
