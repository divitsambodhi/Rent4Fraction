import { useState, useMemo } from 'react'
import { FilterBar } from '@/components/shared/filter-bar'
import { DataTable, type Column } from '@/components/shared/data-table'
import { StatusBadge } from '@/components/shared/status-badge'
import { Button } from '@/components/ui/button'
import { getStoredVendorProfiles, updateVendorProfile } from '@/lib/api/vendor-store'
import { updateVendorApprovalStatus } from '@/lib/api/admin-store'
import { VendorReviewSheet } from './vendor-review-sheet'
import type { VendorProfile } from '@/types/vendor'
import { ExternalLink } from 'lucide-react'

interface VendorsSectionProps {
  statusFilter?: string
  searchQuery?: string
  selectedVendorId?: string | null
  onStatusChange: (status: string) => void
  onSearchChange: (q: string) => void
  onSelectVendor: (id: string | null) => void
}

export function VendorsSection({
  statusFilter = 'all',
  searchQuery = '',
  selectedVendorId,
  onStatusChange,
  onSearchChange,
  onSelectVendor,
}: VendorsSectionProps) {
  const [vendorListVersion, setVendorListVersion] = useState(0)

  const allVendors: VendorProfile[] = useMemo(() => {
    const profiles = getStoredVendorProfiles()
    return Object.values(profiles)
  }, [vendorListVersion])

  const counts = useMemo(() => {
    return {
      all: allVendors.length,
      pending: allVendors.filter((v) => v.approval_status === 'pending').length,
      approved: allVendors.filter((v) => v.approval_status === 'approved').length,
      rejected: allVendors.filter((v) => v.approval_status === 'rejected').length,
      suspended: allVendors.filter((v) => v.approval_status === 'suspended').length,
    }
  }, [allVendors])

  const filteredVendors = useMemo(() => {
    return allVendors.filter((vendor) => {
      if (statusFilter !== 'all' && vendor.approval_status !== statusFilter) {
        return false
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchName = vendor.business_name.toLowerCase().includes(q)
        const matchCity = vendor.city?.toLowerCase().includes(q)
        const matchOwner = vendor.owner_name?.toLowerCase().includes(q)
        const matchGst = vendor.gst_number?.toLowerCase().includes(q)
        if (!matchName && !matchCity && !matchOwner && !matchGst) {
          return false
        }
      }
      return true
    })
  }, [allVendors, statusFilter, searchQuery])

  const selectedVendor = useMemo(() => {
    if (!selectedVendorId) return null
    return allVendors.find((v) => v.vendor_id === selectedVendorId) || null
  }, [allVendors, selectedVendorId])

  const columns: Column<VendorProfile>[] = [
    {
      id: 'vendor',
      header: 'Vendor & Store',
      accessor: (vendor: VendorProfile) => (
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-full bg-brand/10 text-brand font-bold text-xs flex items-center justify-center shrink-0 border border-brand/20">
            {vendor.business_name.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-foreground truncate">{vendor.business_name}</div>
            <div className="text-xs text-muted-foreground truncate">{vendor.city || 'Bengaluru'}</div>
          </div>
        </div>
      ),
      sortable: true,
    },
    {
      id: 'owner',
      header: 'Contact / Owner',
      accessor: (vendor: VendorProfile) => (
        <div className="text-xs">
          <div className="text-foreground font-medium">{vendor.owner_name || vendor.business_name}</div>
          <div className="text-muted-foreground">{vendor.email || vendor.owner_email || '—'}</div>
        </div>
      ),
    },
    {
      id: 'gst',
      header: 'GSTIN',
      accessor: (vendor: VendorProfile) => (
        <div className="font-mono text-xs text-muted-foreground">
          {vendor.gst_number || vendor.gst || <span className="italic text-muted-foreground/60">Not provided</span>}
        </div>
      ),
    },
    {
      id: 'commission',
      header: 'Commission',
      accessor: (vendor: VendorProfile) => (
        <span className="font-mono font-semibold text-xs text-foreground bg-muted/60 px-2 py-0.5 rounded border border-border/60">
          {vendor.commission_rate ?? 10}%
        </span>
      ),
      sortable: true,
    },
    {
      id: 'status',
      header: 'Approval Status',
      accessor: (vendor: VendorProfile) => <StatusBadge status={vendor.approval_status} size="sm" />,
      sortable: true,
    },
    {
      id: 'actions',
      header: 'Action',
      accessor: (vendor: VendorProfile) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onSelectVendor(vendor.vendor_id)}
          className="h-8 text-xs font-semibold gap-1.5"
        >
          <span>Review</span>
          <ExternalLink className="size-3 text-muted-foreground" />
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <FilterBar
        searchPlaceholder="Search by vendor, city, owner, GSTIN..."
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        activeStatus={statusFilter}
        onStatusChange={onStatusChange}
        statusPills={[
          { id: 'all', label: 'All Vendors', count: counts.all },
          { id: 'pending', label: 'Pending Review', count: counts.pending },
          { id: 'approved', label: 'Approved', count: counts.approved },
          { id: 'suspended', label: 'Suspended', count: counts.suspended },
          { id: 'rejected', label: 'Rejected', count: counts.rejected },
        ]}
      />

      <DataTable<VendorProfile>
        columns={columns}
        data={filteredVendors}
        keyExtractor={(v) => v.vendor_id}
        emptyTitle="No vendors found"
        emptyDescription="No vendors found matching your filter criteria."
        onRowClick={(vendor) => onSelectVendor(vendor.vendor_id)}
      />

      <VendorReviewSheet
        open={Boolean(selectedVendorId)}
        onOpenChange={(open) => !open && onSelectVendor(null)}
        vendor={selectedVendor}
        onApprove={async (id) => {
          updateVendorApprovalStatus(id, 'approved')
          setVendorListVersion((v) => v + 1)
        }}
        onReject={async (id, reason) => {
          updateVendorApprovalStatus(id, 'rejected', reason)
          setVendorListVersion((v) => v + 1)
        }}
        onSuspend={async (id, reason) => {
          updateVendorApprovalStatus(id, 'suspended', reason)
          setVendorListVersion((v) => v + 1)
        }}
        onReinstate={async (id) => {
          updateVendorApprovalStatus(id, 'approved')
          setVendorListVersion((v) => v + 1)
        }}
        onUpdateCommission={async (id, rate) => {
          updateVendorProfile({ commission_rate: rate }, id)
          setVendorListVersion((v) => v + 1)
        }}
      />
    </div>
  )
}
