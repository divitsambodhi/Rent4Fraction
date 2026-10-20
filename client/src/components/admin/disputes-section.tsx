import { useState, useMemo } from 'react'
import { FilterBar } from '@/components/shared/filter-bar'
import { DataTable, type Column } from '@/components/shared/data-table'
import { StatusBadge } from '@/components/shared/status-badge'
import { Button } from '@/components/ui/button'
import { getAdminDisputes, resolveAdminDispute } from '@/lib/api/admin-store'
import { DisputeSheet } from './dispute-sheet'
import type { AdminDispute } from '@/types/admin'
import { formatRupees } from '@/lib/pricing'
import { ExternalLink } from 'lucide-react'

interface DisputesSectionProps {
  statusFilter?: string
  searchQuery?: string
  selectedDisputeId?: string | null
  onStatusChange: (status: string) => void
  onSearchChange: (q: string) => void
  onSelectDispute: (id: string | null) => void
}

export function DisputesSection({
  statusFilter = 'open',
  searchQuery = '',
  selectedDisputeId,
  onStatusChange,
  onSearchChange,
  onSelectDispute,
}: DisputesSectionProps) {
  const [version, setVersion] = useState(0)

  const allDisputes = useMemo(() => {
    return getAdminDisputes()
  }, [version])

  const counts = useMemo(() => {
    return {
      all: allDisputes.length,
      open: allDisputes.filter((d) => d.status === 'reported' || d.status === 'disputed').length,
      resolved: allDisputes.filter((d) => d.status === 'resolved').length,
    }
  }, [allDisputes])

  const filteredDisputes = useMemo(() => {
    return allDisputes.filter((dispute) => {
      if (statusFilter === 'open' && dispute.status === 'resolved') {
        return false
      }
      if (statusFilter === 'resolved' && dispute.status !== 'resolved') {
        return false
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchId = dispute.dispute_id.toLowerCase().includes(q)
        const matchBooking = dispute.booking_id.toLowerCase().includes(q)
        const matchCust = dispute.customer_name.toLowerCase().includes(q)
        const matchVendor = dispute.vendor_name.toLowerCase().includes(q)
        const matchEq = dispute.equipment_name.toLowerCase().includes(q)
        if (!matchId && !matchBooking && !matchCust && !matchVendor && !matchEq) {
          return false
        }
      }
      return true
    })
  }, [allDisputes, statusFilter, searchQuery])

  const selectedDispute = useMemo(() => {
    if (!selectedDisputeId) return null
    return allDisputes.find((d) => d.dispute_id === selectedDisputeId) || null
  }, [allDisputes, selectedDisputeId])

  const columns: Column<AdminDispute>[] = [
    {
      id: 'case',
      header: 'Case ID',
      accessor: (d) => (
        <span className="font-mono font-bold text-xs text-foreground bg-muted/60 px-2 py-0.5 rounded border border-border/60">
          {d.dispute_id}
        </span>
      ),
      sortable: true,
    },
    {
      id: 'parties',
      header: 'Customer & Vendor',
      accessor: (d) => (
        <div className="text-xs">
          <div className="font-semibold text-foreground">{d.customer_name}</div>
          <div className="text-muted-foreground flex items-center gap-1">
            <span>vs.</span>
            <span className="font-medium text-foreground">{d.vendor_name}</span>
          </div>
        </div>
      ),
    },
    {
      id: 'equipment',
      header: 'Equipment & Booking',
      accessor: (d) => (
        <div className="text-xs max-w-[200px]">
          <div className="font-semibold text-foreground truncate">{d.equipment_name}</div>
          <div className="font-mono text-muted-foreground text-[11px] truncate">
            {d.booking_id} · {d.vendor_order_id}
          </div>
        </div>
      ),
    },
    {
      id: 'claim',
      header: 'Claimed / Deposit',
      accessor: (d) => (
        <div className="text-xs">
          <div className="font-semibold font-mono text-danger">
            {formatRupees(d.claimed_amount)}
          </div>
          <div className="text-[11px] text-muted-foreground font-mono">
            Deposit: {formatRupees(d.deposit_held)}
          </div>
        </div>
      ),
      sortable: true,
    },
    {
      id: 'status',
      header: 'Status',
      accessor: (d) => <StatusBadge status={d.status} size="sm" />,
      sortable: true,
    },
    {
      id: 'actions',
      header: 'Action',
      accessor: (d) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onSelectDispute(d.dispute_id)}
          className="h-8 text-xs font-semibold gap-1.5"
        >
          <span>{d.status === 'resolved' ? 'View Case' : 'Resolve'}</span>
          <ExternalLink className="size-3 text-muted-foreground" />
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <FilterBar
        searchPlaceholder="Search by case ID, customer, vendor, equipment..."
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        activeStatus={statusFilter}
        onStatusChange={onStatusChange}
        statusPills={[
          { id: 'open', label: 'Open Disputes', count: counts.open },
          { id: 'resolved', label: 'Resolved', count: counts.resolved },
          { id: 'all', label: 'All Cases', count: counts.all },
        ]}
      />

      <DataTable<AdminDispute>
        columns={columns}
        data={filteredDisputes}
        keyExtractor={(d) => d.dispute_id}
        emptyTitle="No dispute claims found"
        emptyDescription="There are no dispute claims matching your criteria."
        onRowClick={(d) => onSelectDispute(d.dispute_id)}
      />

      <DisputeSheet
        open={Boolean(selectedDisputeId)}
        onOpenChange={(open) => !open && onSelectDispute(null)}
        dispute={selectedDispute}
        onResolve={async (reportId, outcome, finalAmount, note) => {
          resolveAdminDispute(reportId, outcome, finalAmount, note)
          setVersion((v) => v + 1)
        }}
      />
    </div>
  )
}
