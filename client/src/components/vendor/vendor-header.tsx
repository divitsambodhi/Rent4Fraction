import { StatusBadge } from '@/components/shared/status-badge'
import { AppLink } from '@/components/shared/app-link'
import type { VendorApprovalStatus } from '@/types/vendor'

interface VendorHeaderProps {
  businessName: string
  approvalStatus: VendorApprovalStatus
  activeTitle: string
  subtitle?: string
}

export function VendorHeader({
  businessName,
  approvalStatus,
  activeTitle,
  subtitle,
}: VendorHeaderProps) {
  const getBadgeStatus = () => {
    switch (approvalStatus) {
      case 'approved':
        return 'completed'
      case 'pending':
        return 'pending'
      case 'rejected':
      case 'suspended':
        return 'cancelled'
      default:
        return 'neutral'
    }
  }

  const getBadgeLabel = () => {
    switch (approvalStatus) {
      case 'approved':
        return 'Approved'
      case 'pending':
        return 'Under review'
      case 'rejected':
        return 'Rejected'
      case 'suspended':
        return 'Suspended'
      default:
        return approvalStatus
    }
  }

  return (
    <div className="space-y-3 mb-6">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <AppLink to="/vendor" className="hover:text-foreground transition-colors">
          Workspace
        </AppLink>
        <span>/</span>
        <span className="text-foreground font-semibold">{activeTitle}</span>
      </nav>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {businessName}
            </h1>
            <StatusBadge status={getBadgeStatus()} label={getBadgeLabel()} />
          </div>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  )
}
