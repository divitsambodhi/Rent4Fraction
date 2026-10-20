import { AlertCircle, Check, Eye, Package, RotateCcw } from 'lucide-react'
import { DataTable, type Column } from '@/components/shared/data-table'
import { Button } from '@/components/ui/button'
import type { BookingDetail, VendorOrder } from '@/types/account'
import { cn } from '@/lib/utils'

export interface VendorReturnRowData {
  order: VendorOrder
  booking: BookingDetail
  customerName: string
  returnDate: string
  returnWindow: string
  itemsCount: number
  isLate: boolean
  inspectionState: 'not_inspected' | 'clean' | 'damage_reported' | 'disputed' | 'resolved'
}

interface ReturnsTableProps {
  returns: VendorReturnRowData[]
  loading?: boolean
  page: number
  pageSize: number
  totalItems: number
  onPageChange: (page: number) => void
  onRowClick: (row: VendorReturnRowData) => void
  onMarkReturned: (orderId: string) => void
  onInspect: (orderId: string) => void
}

export function ReturnsTable({
  returns,
  loading = false,
  page,
  pageSize,
  totalItems,
  onPageChange,
  onRowClick,
  onMarkReturned,
  onInspect,
}: ReturnsTableProps) {
  const columns: Column<VendorReturnRowData>[] = [
    {
      id: 'order',
      header: 'Order / Customer',
      className: 'w-[160px]',
      accessor: (r) => (
        <div className="space-y-0.5">
          <p className="font-semibold text-foreground text-xs font-mono">{r.order.vendor_order_id}</p>
          <p className="text-xs text-muted-foreground">{r.customerName}</p>
        </div>
      ),
    },
    {
      id: 'returnSchedule',
      header: 'Return Window & Status',
      accessor: (r) => (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-medium text-foreground">{r.returnDate}</span>
            {r.isLate && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-destructive/15 text-destructive border border-destructive/20 animate-pulse">
                Late Return
              </span>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">{r.returnWindow}</p>
        </div>
      ),
    },
    {
      id: 'items',
      header: 'Equipment',
      className: 'w-[120px]',
      accessor: (r) => (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Package className="size-3.5 text-brand" />
          <span>{r.itemsCount} item{r.itemsCount > 1 ? 's' : ''}</span>
        </div>
      ),
    },
    {
      id: 'inspection',
      header: 'Inspection State',
      className: 'w-[160px]',
      accessor: (r) => {
        switch (r.inspectionState) {
          case 'clean':
            return (
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1">
                <Check className="size-3.5" /> All Good
              </span>
            )
          case 'damage_reported':
            return (
              <span className="text-xs font-medium text-amber-600 dark:text-amber-400 inline-flex items-center gap-1">
                <AlertCircle className="size-3.5" /> Damage Reported
              </span>
            )
          case 'disputed':
            return (
              <span className="text-xs font-medium text-rose-600 dark:text-rose-400 inline-flex items-center gap-1">
                <AlertCircle className="size-3.5" /> Dispute Active
              </span>
            )
          case 'resolved':
            return (
              <span className="text-xs font-medium text-muted-foreground inline-flex items-center gap-1">
                Resolved
              </span>
            )
          case 'not_inspected':
          default:
            return (
              <span className="text-xs font-medium text-muted-foreground inline-flex items-center gap-1">
                Not Inspected
              </span>
            )
        }
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      className: 'w-[180px] text-right',
      accessor: (r) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          {r.order.status === 'delivered' && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onMarkReturned(r.order.vendor_order_id)}
              className="h-7 text-xs px-2.5 gap-1"
            >
              <RotateCcw className="size-3" />
              <span>Mark returned</span>
            </Button>
          )}

          {r.order.status === 'returned' && r.inspectionState === 'not_inspected' && (
            <Button
              type="button"
              size="sm"
              onClick={() => onInspect(r.order.vendor_order_id)}
              className="h-7 text-xs px-2.5 bg-brand hover:bg-brand-hover text-brand-foreground gap-1"
            >
              <Package className="size-3" />
              <span>Inspect</span>
            </Button>
          )}

          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => onRowClick(r)}
            className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground"
          >
            <Eye className="size-3.5" />
          </Button>
        </div>
      ),
    },
  ]

  const renderMobileCard = (r: VendorReturnRowData) => (
    <div className={cn('space-y-3', r.isLate && 'bg-destructive/5 border-destructive/20')}>
      <div className="flex items-start justify-between">
        <div>
          <span className="font-mono text-xs font-bold text-foreground">{r.order.vendor_order_id}</span>
          <p className="text-xs text-muted-foreground">{r.customerName}</p>
        </div>
        {r.isLate && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-destructive/15 text-destructive">
            Late
          </span>
        )}
      </div>

      <div className="text-xs space-y-1">
        <p className="text-muted-foreground">Return Window: <strong className="text-foreground">{r.returnDate} ({r.returnWindow})</strong></p>
        <p className="text-muted-foreground">Items: <strong className="text-foreground">{r.itemsCount}</strong></p>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-border">
        {r.order.status === 'delivered' && (
          <Button
            type="button"
            size="sm"
            onClick={() => onMarkReturned(r.order.vendor_order_id)}
            className="h-8 text-xs bg-brand hover:bg-brand-hover text-brand-foreground"
          >
            Mark returned
          </Button>
        )}
        {r.order.status === 'returned' && r.inspectionState === 'not_inspected' && (
          <Button
            type="button"
            size="sm"
            onClick={() => onInspect(r.order.vendor_order_id)}
            className="h-8 text-xs bg-brand hover:bg-brand-hover text-brand-foreground"
          >
            Inspect items
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onRowClick(r)}
          className="h-8 text-xs"
        >
          View Order
        </Button>
      </div>
    </div>
  )

  return (
    <DataTable
      columns={columns}
      data={returns}
      keyExtractor={(r) => r.order.vendor_order_id}
      onRowClick={onRowClick}
      loading={loading}
      page={page}
      pageSize={pageSize}
      totalItems={totalItems}
      onPageChange={onPageChange}
      emptyTitle="No returns found"
      emptyDescription="No equipment returns match this filter."
      mobileRenderer={renderMobileCard}
    />
  )
}
