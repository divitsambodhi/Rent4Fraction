import { HelpCircle, RefreshCw, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/status-badge'
import { Skeleton } from '@/components/shared/loading-skeleton'
import { BusinessDetailsForm, type BusinessDetailsFormData } from './business-details-form'
import { StorefrontPreview } from './storefront-preview'
import type { VendorApprovalStatus, VendorProfile } from '@/types/vendor'

interface ProfileTabProps {
  profile: VendorProfile | null
  loading: boolean
  error: Error | null
  onRefetch: () => void
  onSaveProfile: (data: BusinessDetailsFormData) => Promise<void>
  approvalStatus: VendorApprovalStatus
}

export function ProfileTab({
  profile,
  loading,
  error,
  onRefetch,
  onSaveProfile,
  approvalStatus,
}: ProfileTabProps) {
  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="lg:col-span-2 h-[500px] rounded-2xl" />
          <Skeleton className="h-[380px] rounded-2xl" />
        </div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="rounded-2xl border border-danger/30 bg-danger/5 p-8 text-center space-y-4 max-w-lg mx-auto my-12">
        <h2 className="font-serif text-lg font-bold text-foreground">
          Failed to load business profile
        </h2>
        <p className="text-sm text-muted-foreground">{error?.message || 'Unable to retrieve vendor profile.'}</p>
        <Button onClick={onRefetch} variant="outline" className="gap-2">
          <RefreshCw className="size-4" />
          <span>Retry</span>
        </Button>
      </div>
    )
  }

  const isReadOnly = approvalStatus === 'rejected' || approvalStatus === 'suspended'
  const readOnlyReason =
    approvalStatus === 'rejected'
      ? 'Editing business profile details is disabled for unapproved partner applications.'
      : approvalStatus === 'suspended'
      ? 'Editing business profile details is disabled while your vendor account is suspended.'
      : undefined

  const getStatusBadge = () => {
    switch (approvalStatus) {
      case 'approved':
        return <StatusBadge status="completed" label="Approved" />
      case 'pending':
        return <StatusBadge status="pending" label="Under review" />
      case 'rejected':
      case 'suspended':
        return <StatusBadge status="cancelled" label={approvalStatus === 'rejected' ? 'Rejected' : 'Suspended'} />
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Business Details Form */}
        <div className="lg:col-span-2">
          <BusinessDetailsForm
            initialProfile={profile}
            onSave={onSaveProfile}
            disabled={isReadOnly}
            readOnlyReason={readOnlyReason}
          />
        </div>

        {/* Right Column: Account Facts Card & Live Storefront Preview */}
        <div className="space-y-6">
          {/* Read-Only Account Facts Card */}
          <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <h3 className="font-serif text-base font-bold text-foreground">
                Account facts
              </h3>
              {getStatusBadge()}
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground">Account owner</span>
                <span className="font-semibold text-foreground truncate max-w-[160px]">
                  {profile.owner_name}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground">Registered email</span>
                <span className="font-semibold text-foreground truncate max-w-[160px]">
                  {profile.owner_email}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground">Member since</span>
                <span className="font-semibold text-foreground">
                  {profile.member_since || 'June 2023'}
                </span>
              </div>

              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <span>Commission rate</span>
                  <span
                    title="Set by Rent4Fraction"
                    className="cursor-help"
                  >
                    <HelpCircle className="size-3 text-muted-foreground hover:text-foreground" />
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-brand tabular-nums text-sm">
                    {profile.commission_rate}%
                  </span>
                  <ShieldCheck className="size-3.5 text-brand" />
                </div>
              </div>
            </div>
          </div>

          {/* Live Storefront Card Preview */}
          <StorefrontPreview profile={profile} />
        </div>
      </div>
    </div>
  )
}
