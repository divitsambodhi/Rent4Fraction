import { useState, useMemo, useEffect } from 'react'
import { FilterBar } from '@/components/shared/filter-bar'
import { DataTable, type Column } from '@/components/shared/data-table'
import { StatTile } from '@/components/shared/stat-tile'
import { StatusBadge } from '@/components/shared/status-badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/account/confirm-dialog'
import {
  getAdminPayouts,
  updatePayoutStatus,
} from '@/lib/api/admin'
import type { AdminPayoutRow } from '@/types/admin'
import { MarkPaidDialog } from './mark-paid-dialog'
import { formatRupees } from '@/lib/pricing'
import {
  Clock,
  RefreshCw,
  CheckCircle2,
  DollarSign,
  ArrowRight,
} from 'lucide-react'
import { toast } from 'sonner'

interface PayoutsSectionProps {
  statusFilter?: string
  searchQuery?: string
  onStatusChange: (status: string) => void
  onSearchChange: (q: string) => void
}

export function PayoutsSection({
  statusFilter = 'all',
  searchQuery = '',
  onStatusChange,
  onSearchChange,
}: PayoutsSectionProps) {
  const [version, setVersion] = useState(0)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [activePayoutForPayment, setActivePayoutForPayment] = useState<AdminPayoutRow | null>(null)
  const [bulkProcessingOpen, setBulkProcessingOpen] = useState(false)
  const [allPayouts, setAllPayouts] = useState<AdminPayoutRow[]>([])

  useEffect(() => {
    getAdminPayouts().then((res) => {
      const normalized = (res || []).map((p: any) => ({
        ...p,
        gross: p.gross ?? p.gross_amount ?? 0,
        net: p.net ?? p.net_amount ?? 0,
        commission: p.commission ?? p.commission_amount ?? 0,
      }))
      setAllPayouts(normalized)
    })
  }, [version])

  const totals = useMemo(() => {
    let toProcessCount = 0
    let toProcessVal = 0
    let processingCount = 0
    let processingVal = 0
    let paidCount = 0
    let paidVal = 0
    let commissionTotal = 0

    allPayouts.forEach((p: any) => {
      commissionTotal += p.commission || 0
      if (p.status === 'pending') {
        toProcessCount++
        toProcessVal += p.net || 0
      } else if (p.status === 'processing') {
        processingCount++
        processingVal += p.net || 0
      } else if (p.status === 'paid') {
        paidCount++
        paidVal += p.net || 0
      }
    })

    return {
      toProcessCount,
      toProcessVal,
      processingCount,
      processingVal,
      paidCount,
      paidVal,
      commissionTotal,
    }
  }, [allPayouts])

  const filteredPayouts = useMemo(() => {
    return allPayouts.filter((p: any) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) {
        return false
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchId = (p.payout_id || '').toLowerCase().includes(q)
        const matchVendor = (p.vendor_name || '').toLowerCase().includes(q)
        const matchOrder = (p.order_id || '').toLowerCase().includes(q)
        const matchBooking = (p.booking_id || '').toLowerCase().includes(q)
        if (!matchId && !matchVendor && !matchOrder && !matchBooking) {
          return false
        }
      }
      return true
    })
  }, [allPayouts, statusFilter, searchQuery])

  // Single transition: pending -> processing
  const handleMarkProcessing = async (payoutId: string) => {
    await updatePayoutStatus(payoutId, 'processing')
    toast.success(`Payout ${payoutId} moved to Processing batch`)
    setVersion((v) => v + 1)
  }

  // Bulk transition to processing
  const handleBulkProcessingConfirm = async () => {
    for (const id of selectedIds) {
      const p = allPayouts.find((item: any) => item.payout_id === id)
      if (p && p.status === 'pending') {
        await updatePayoutStatus(id, 'processing')
      }
    }
    toast.success(`${selectedIds.length} payouts transitioned to Processing`)
    setSelectedIds([])
    setBulkProcessingOpen(false)
    setVersion((v) => v + 1)
  }

  const columns: Column<AdminPayoutRow>[] = [
    {
      id: 'payout',
      header: 'Payout ID',
      accessor: (p) => (
        <span className="font-mono font-bold text-xs text-foreground bg-muted/60 px-2 py-0.5 rounded border border-border/60">
          {p.payout_id}
        </span>
      ),
      sortable: true,
    },
    {
      id: 'vendor',
      header: 'Vendor',
      accessor: (p) => (
        <div className="text-xs">
          <div className="font-semibold text-foreground">{p.vendor_name}</div>
          <div className="text-muted-foreground font-mono text-[11px]">{p.order_id}</div>
        </div>
      ),
      sortable: true,
    },
    {
      id: 'gross',
      header: 'Gross Order',
      accessor: (p: any) => (
        <span className="font-mono text-xs text-foreground">
          {formatRupees(p.gross ?? p.gross_amount ?? 0)}
        </span>
      ),
      sortable: true,
    },
    {
      id: 'commission',
      header: 'Commission',
      accessor: (p: any) => (
        <div className="text-xs font-mono">
          <span className="text-muted-foreground">{formatRupees(p.commission ?? p.commission_amount ?? 0)}</span>
          {p.commission_rate !== undefined && (
            <span className="text-[10px] text-muted-foreground/80 ml-1">({p.commission_rate}%)</span>
          )}
        </div>
      ),
    },
    {
      id: 'net',
      header: 'Net Vendor Payout',
      accessor: (p: any) => (
        <span className="font-mono font-bold text-xs text-foreground">
          {formatRupees(p.net ?? p.net_amount ?? 0)}
        </span>
      ),
      sortable: true,
    },
    {
      id: 'status',
      header: 'Status',
      accessor: (p) => <StatusBadge status={p.status} size="sm" />,
      sortable: true,
    },
    {
      id: 'actions',
      header: 'Action',
      accessor: (p: any) => {
        if (p.status === 'pending') {
          return (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                handleMarkProcessing(p.payout_id)
              }}
              className="h-8 text-xs font-semibold gap-1"
            >
              <span>Mark Processing</span>
              <ArrowRight className="size-3" />
            </Button>
          )
        }
        if (p.status === 'processing') {
          return (
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                setActivePayoutForPayment(p)
              }}
              className="h-8 text-xs font-semibold bg-brand text-brand-foreground hover:bg-brand-hover gap-1"
            >
              <span>Mark Paid</span>
              <CheckCircle2 className="size-3" />
            </Button>
          )
        }
        return (
          <span className="text-xs text-muted-foreground font-mono">
            {p.paid_at ? `Paid on ${p.paid_at.split('T')[0]}` : 'Completed'}
          </span>
        )
      },
    },
  ]

  return (
    <div className="space-y-6">
      {/* Stat Tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile
          label="To Process"
          value={formatRupees(totals.toProcessVal)}
          subtitle={`${totals.toProcessCount} pending orders`}
          icon={Clock}
        />
        <StatTile
          label="Processing Batch"
          value={formatRupees(totals.processingVal)}
          subtitle={`${totals.processingCount} payouts in queue`}
          icon={RefreshCw}
        />
        <StatTile
          label="Total Paid"
          value={formatRupees(totals.paidVal)}
          subtitle={`${totals.paidCount} fulfilled payouts`}
          icon={CheckCircle2}
        />
        <StatTile
          label="Platform Commission"
          value={formatRupees(totals.commissionTotal)}
          subtitle="Retained earnings"
          icon={DollarSign}
        />
      </div>

      <FilterBar
        searchPlaceholder="Search by payout ID, vendor, order number..."
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        activeStatus={statusFilter}
        onStatusChange={onStatusChange}
        statusPills={[
          { id: 'all', label: 'All Payouts', count: allPayouts.length },
          { id: 'pending', label: 'Pending', count: totals.toProcessCount },
          { id: 'processing', label: 'Processing', count: totals.processingCount },
          { id: 'paid', label: 'Paid', count: totals.paidCount },
        ]}
      />

      <DataTable<AdminPayoutRow>
        columns={columns}
        data={filteredPayouts}
        keyExtractor={(p) => p.payout_id}
        selectable
        selectedIds={selectedIds}
        onSelectIds={setSelectedIds}
        bulkActions={
          <Button
            size="sm"
            variant="outline"
            onClick={() => setBulkProcessingOpen(true)}
            className="h-8 text-xs font-semibold text-brand"
          >
            Mark selected as Processing
          </Button>
        }
        emptyTitle="No vendor payouts found"
        emptyDescription="No vendor payouts found matching your criteria."
      />

      {/* Mark Paid Dialog */}
      {activePayoutForPayment && (
        <MarkPaidDialog
          open={Boolean(activePayoutForPayment)}
          onOpenChange={(open) => !open && setActivePayoutForPayment(null)}
          payoutId={activePayoutForPayment.payout_id}
          vendorName={activePayoutForPayment.vendor_name}
          amount={(activePayoutForPayment as any).net ?? activePayoutForPayment.net_amount ?? 0}
          onConfirm={async (_paidDate, reference) => {
            await updatePayoutStatus(activePayoutForPayment.payout_id, 'paid', reference)
            setVersion((v) => v + 1)
            setActivePayoutForPayment(null)
          }}
        />
      )}

      {/* Bulk Processing Confirm */}
      <ConfirmDialog
        open={bulkProcessingOpen}
        onOpenChange={setBulkProcessingOpen}
        title="Transition Payouts to Processing"
        description={`Are you sure you want to move ${selectedIds.length} selected payouts to the processing batch? Vendors will see their payouts as being prepared for transfer.`}
        confirmLabel="Confirm Batch"
        onConfirm={handleBulkProcessingConfirm}
      />
    </div>
  )
}
