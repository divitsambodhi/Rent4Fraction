import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/providers/auth-provider'
import { useAppSearchParams } from '@/components/shared/app-link'
import { usePageTitle } from '@/hooks/use-page-title'
import { VendorShell } from '@/components/vendor/vendor-shell'
import { ApprovalGate } from '@/components/vendor/approval-gate'
import { VendorTabs } from '@/components/vendor/vendor-tabs'
import { OverviewTab } from '@/components/vendor/overview-tab'
import { PayoutsTab } from '@/components/vendor/payouts-tab'
import { ReviewsTab } from '@/components/vendor/reviews-tab'
import { VendorInboxTab } from '@/components/vendor/vendor-inbox-tab'
import { ProfileTab } from '@/components/vendor/profile-tab'
import {
  getVendorOverview,
  getVendorPayouts,
  getVendorProfile,
  getVendorReviews,
  replyToVendorReview,
  updateVendorProfile,
} from '@/lib/api/vendor'
import { getNotifications, getConversations } from '@/lib/api/account'
import type { BusinessDetailsFormData } from '@/components/vendor/business-details-form'
import type {
  OverviewRange,
  VendorApprovalStatus,
  VendorDashboardTab,
  VendorOverview,
  VendorPayoutsResult,
  VendorProfile,
  VendorReviewsResult,
} from '@/types/vendor'

export function VendorPage() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useAppSearchParams()

  const tabParam = (searchParams.get('tab') as VendorDashboardTab) || 'overview'
  const rangeParam = (searchParams.get('range') as OverviewRange) || '30d'
  const simulateParam = searchParams.get('simulate')

  // Approval status resolution with dev simulation override
  const approvalStatus: VendorApprovalStatus =
    simulateParam === 'rejected' || simulateParam === 'suspended'
      ? simulateParam
      : user?.vendor?.approval_status || 'approved'

  const isApproved = approvalStatus === 'approved'
  const isPending = approvalStatus === 'pending'

  // Dynamic Page Title
  const getTabTitle = () => {
    switch (tabParam) {
      case 'payouts':
        return 'Payouts & Settlement'
      case 'reviews':
        return 'Customer Reviews'
      case 'inbox':
        return 'Messages & Notifications'
      case 'profile':
        return 'Business Profile'
      case 'overview':
      default:
        return 'Overview'
    }
  }

  usePageTitle(`${getTabTitle()} | Vendor Portal`)

  // Data states
  const [overview, setOverview] = useState<VendorOverview | null>(null)
  const [payoutsData, setPayoutsData] = useState<VendorPayoutsResult | null>(null)
  const [reviewsData, setReviewsData] = useState<VendorReviewsResult | null>(null)
  const [unreadInboxCount, setUnreadInboxCount] = useState<number>(0)
  const [profile, setProfile] = useState<VendorProfile | null>(null)
  const [equipmentList] = useState<{ id: string; name: string }[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Load all data
  const loadAllData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [prof, ov, payoutsRes, revsRes, notifs, convs] = await Promise.all([
        getVendorProfile().catch(() => null),
        getVendorOverview().catch(() => null),
        getVendorPayouts().catch(() => null),
        getVendorReviews().catch(() => null),
        getNotifications('unread').catch(() => []),
        getConversations().catch(() => []),
      ])
      setProfile(prof)
      setOverview(ov as any)
      setPayoutsData(payoutsRes as any)
      setReviewsData(revsRes as any)
      const unreadNotifs = Array.isArray(notifs) ? notifs.length : 0
      const unreadConvs = Array.isArray(convs) ? convs.reduce((acc: number, c: any) => acc + (c.unread_count || 0), 0) : 0
      setUnreadInboxCount(unreadNotifs + unreadConvs)
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      setLoading(false)
    }
  }, [rangeParam, searchParams])

  useEffect(() => {
    loadAllData()
    const handleUpdate = () => {
      loadAllData()
    }
    window.addEventListener('r4f-account-store-updated', handleUpdate)
    window.addEventListener('r4f-order-updated', handleUpdate)
    return () => {
      window.removeEventListener('r4f-account-store-updated', handleUpdate)
      window.removeEventListener('r4f-order-updated', handleUpdate)
    }
  }, [loadAllData])

  // Handlers
  const handleRangeChange = (newRange: OverviewRange) => {
    const next = new URLSearchParams(searchParams)
    next.set('range', newRange)
    setSearchParams(next)
  }

  const handleSaveReply = async (reviewId: string, replyText: string) => {
    replyToVendorReview(reviewId, replyText)
    toast.success('Reply published to customer.')
    await loadAllData()
  }

  const handleSaveProfile = async (formData: BusinessDetailsFormData) => {
    await updateVendorProfile({
      business_name: formData.name,
      description: formData.description,
      address: formData.address,
      city: formData.city,
      phone: formData.phone,
      gst_number: formData.gst || undefined,
      logo_url: formData.logo || undefined,
    })
    toast.success('Business profile updated successfully.')
    await loadAllData()
  }

  const businessName = profile?.business_name || user?.vendor?.business_name || 'My Storefront'

  // If vendor is NOT approved:
  // - Pending vendors can view/edit the Business Profile tab (tabParam === 'profile')
  // - Otherwise, or if rejected/suspended, display the ApprovalGate
  if (!isApproved) {
    if (isPending && tabParam === 'profile') {
      return (
        <VendorShell
          businessName={businessName}
          approvalStatus={approvalStatus}
          activeTitle="Business Profile"
          subtitle="Review and edit your business profile details during application review."
        >
          <ProfileTab
            profile={profile}
            loading={loading}
            error={error}
            onRefetch={loadAllData}
            onSaveProfile={handleSaveProfile}
            approvalStatus={approvalStatus}
          />
        </VendorShell>
      )
    }

    return (
      <VendorShell
        businessName={businessName}
        approvalStatus={approvalStatus}
        activeTitle="Application Status"
      >
        <ApprovalGate
          status={approvalStatus}
          businessName={businessName}
          email={profile?.owner_email || user?.email}
          phone={profile?.phone}
          city={profile?.city}
          rejectionReason={user?.vendor?.rejection_reason}
          suspensionReason={user?.vendor?.suspension_reason}
        />
      </VendorShell>
    )
  }

  // Approved vendor view with full tabs
  return (
    <VendorShell
      businessName={businessName}
      approvalStatus={approvalStatus}
      activeTitle={getTabTitle()}
    >
      <VendorTabs
        currentTab={tabParam}
        reviewsBadge={overview?.attention?.reviews_needing_reply || reviewsData?.summary.needs_reply_count}
        inboxBadge={unreadInboxCount > 0 ? unreadInboxCount : undefined}
      />

      {tabParam === 'overview' && (
        <OverviewTab
          overview={overview}
          loading={loading}
          error={error}
          onRefetch={loadAllData}
          currentRange={rangeParam}
          onRangeChange={handleRangeChange}
        />
      )}

      {tabParam === 'payouts' && (
        <PayoutsTab
          data={payoutsData}
          loading={loading}
          error={error}
          onRefetch={loadAllData}
          onFilterChange={() => loadAllData()}
        />
      )}

      {tabParam === 'reviews' && (
        <ReviewsTab
          data={reviewsData}
          loading={loading}
          error={error}
          onRefetch={loadAllData}
          onSaveReply={handleSaveReply}
          equipmentOptions={equipmentList}
        />
      )}

      {tabParam === 'inbox' && <VendorInboxTab />}

      {tabParam === 'profile' && (
        <ProfileTab
          profile={profile}
          loading={loading}
          error={error}
          onRefetch={loadAllData}
          onSaveProfile={handleSaveProfile}
          approvalStatus={approvalStatus}
        />
      )}
    </VendorShell>
  )
}
