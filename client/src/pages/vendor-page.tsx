import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/providers/auth-provider'
import { usePageTitle } from '@/hooks/use-page-title'
import { useAppSearchParams } from '@/components/shared/app-link'
import { VendorShell } from '@/components/vendor/vendor-shell'
import { VendorTabs } from '@/components/vendor/vendor-tabs'
import { ApprovalGate } from '@/components/vendor/approval-gate'
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
} from '@/lib/api/vendor-store'
import { getAllStoredEquipment } from '@/lib/api/equipment-store'
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
  const [profile, setProfile] = useState<VendorProfile | null>(null)
  const [equipmentList, setEquipmentList] = useState<{ id: string; name: string }[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Load all data
  const loadAllData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // 1. Profile
      const prof = getVendorProfile('1')
      setProfile(prof)

      // 2. Equipment for review filters
      const eq = getAllStoredEquipment().filter((e) => e.vendor_id === '1' && e.status !== 'archived')
      setEquipmentList(eq.map((e) => ({ id: e.equipment_id, name: e.name })))

      // 3. Overview
      const ov = getVendorOverview(rangeParam, '1')
      setOverview(ov)

      // 4. Payouts
      const statusQuery = searchParams.get('status')
      const payoutStatus =
        statusQuery === 'pending' || statusQuery === 'processing' || statusQuery === 'paid'
          ? statusQuery
          : undefined
      const payoutsRes = getVendorPayouts(
        {
          status: payoutStatus,
          range: searchParams.get('range') || undefined,
          page: parseInt(searchParams.get('page') || '1', 10),
        },
        '1',
      )
      setPayoutsData(payoutsRes)

      // 5. Reviews
      const sortQuery = searchParams.get('sort')
      const sortOption = sortQuery === 'newest' || sortQuery === 'highest' || sortQuery === 'lowest' ? sortQuery : undefined
      const revsRes = getVendorReviews(
        {
          rating: searchParams.get('rating') ? parseInt(searchParams.get('rating')!, 10) : undefined,
          reply: searchParams.get('reply') === 'needs' ? 'needs' : 'all',
          equipment: searchParams.get('equipment') || undefined,
          sort: sortOption,
          page: parseInt(searchParams.get('page') || '1', 10),
        },
        '1',
      )
      setReviewsData(revsRes)

      // ----------------------------------------------------------------------
      // DEV INVARIANT CHECKS (prompt section 5)
      // ----------------------------------------------------------------------
      if (import.meta.env.DEV) {
        // Invariant 1: Payout net = gross - commission
        payoutsRes.payouts.forEach((p) => {
          const expectedNet = p.gross_amount - p.commission_amount
          if (p.net_amount !== expectedNet) {
            console.error(
              `[Invariant Error] Payout ${p.payout_id} net calculation mismatch: net=${p.net_amount}, expected=${expectedNet}`,
            )
          }
        })

        // Invariant 2: Earnings chart sum vs range total
        if (ov) {
          const chartSum = ov.earnings_series.reduce((sum, pt) => sum + pt.amount, 0)
          if (Math.abs(chartSum - ov.kpis.net_earnings) > 1) {
            console.error(
              `[Invariant Error] Overview KPI net earnings (${ov.kpis.net_earnings}) disagrees with chart series total (${chartSum})`,
            )
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      setLoading(false)
    }
  }, [rangeParam, searchParams])

  useEffect(() => {
    loadAllData()
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
    updateVendorProfile(
      {
        business_name: formData.name,
        description: formData.description,
        address: formData.address,
        city: formData.city,
        phone: formData.phone,
        gst: formData.gst,
        logo: formData.logo,
      },
      '1',
    )
    toast.success('Business profile updated successfully.')
    await loadAllData()
  }

  const businessName = profile?.business_name || user?.vendor?.business_name || 'Sargam Sound Systems'

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
        inboxBadge={2}
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
