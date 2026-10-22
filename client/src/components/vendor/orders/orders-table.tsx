import { Calendar, MapPin } from 'lucide-react'
import { DataTable, type Column } from '@/components/shared/data-table'
import { StatusBadge } from '@/components/shared/status-badge'
import type { BookingDetail, VendorOrder } from '@/types/account'

export interface VendorOrderRowData {
  order: VendorOrder
  booking: BookingDetail
  itemsSummary: string
  rentalDates: string
  totalDays: number
  city: string
  nextStepLabel: string
}

interface OrdersTableProps {
  orders: VendorOrderRowData[]
  loading?: boolean
  page: number
  pageSize: number
  totalItems: number
  onPageChange: (page: number) => void
  onRowClick: (row: VendorOrderRowData) => void
}

export function OrdersTable({
  orders,
  loading = false,
  page,
  pageSize,
  totalItems,
  onPageChange,
  onRowClick,
}: OrdersTableProps) {
  const columns: Column<VendorOrderRowData>[] = [
    {
      id: 'order',
      header: 'Order / Booking',
      className: 'w-[140px]',
      accessor: (r) => (
        <div className="space-y-0.5 font-sans tabular-nums">
          <p className="font-semibold text-foreground text-xs">{r.order.vendor_order_id}</p>
          <p className="text-[11px] text-muted-foreground">{r.booking.booking_id}</p>
        </div>
      ),
    },
    {
      id: 'customer',
      header: 'Customer',
      accessor: (r) => (
        <div className="space-y-0.5">
          <p className="font-medium text-foreground text-xs">{r.booking.delivery_address.name}</p>
          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
            <MapPin className="size-3 text-muted-foreground" />
            <span>{r.city}</span>
          </p>
        </div>
      ),
    },
    {
      id: 'event',
      header: 'Event & Dates',
      accessor: (r) => (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-medium text-foreground text-xs">{r.booking.event_name || 'Event Rental'}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
              {r.booking.event_type}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Calendar className="size-3" />
            <span>{r.rentalDates} · {r.totalDays} day{r.totalDays > 1 ? 's' : ''}</span>
          </p>
        </div>
      ),
    },
    {
      id: 'items',
      header: 'Equipment Items',
      accessor: (r) => (
        <div className="max-w-[220px]">
          <p className="text-xs text-foreground font-medium truncate" title={r.itemsSummary}>
            {r.itemsSummary}
          </p>
          <span className="text-[11px] text-muted-foreground">
            {r.order.fulfilment_type === 'pickup' ? 'Self-Pickup' : 'Direct Delivery'}
          </span>
        </div>
      ),
    },
    {
      id: 'amount',
      header: 'Vendor Subtotal',
      className: 'text-right',
      accessor: (r) => (
        <div className="text-right">
          <span className="text-xs font-semibold font-display text-foreground tabular-nums">
            ₹{r.order.subtotal.toLocaleString('en-IN')}
          </span>
          <p className="text-[10px] text-muted-foreground">Gross earnings</p>
        </div>
      ),
    },
    {
      id: 'status',
      header: 'Status & Next Step',
      className: 'w-[180px]',
      accessor: (r) => (
        <div className="space-y-1">
          <StatusBadge status={r.order.status} size="sm" />
          {r.nextStepLabel && (
            <p className="text-[11px] text-brand font-medium truncate">
              {r.nextStepLabel}
            </p>
          )}
        </div>
      ),
    },
  ]

  const renderMobileCard = (r: VendorOrderRowData) => (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="font-sans tabular-nums">
          <span className="text-xs font-bold text-foreground">{r.order.vendor_order_id}</span>
          <span className="text-[11px] text-muted-foreground ml-2">{r.booking.booking_id}</span>
        </div>
        <StatusBadge status={r.order.status} size="sm" />
      </div>

      <div>
        <p className="text-sm font-semibold text-foreground">{r.booking.event_name || 'Event Rental'}</p>
        <p className="text-xs text-muted-foreground">{r.itemsSummary}</p>
      </div>

      <div className="flex items-center justify-between text-xs pt-2 border-t border-border">
        <span className="text-muted-foreground">{r.rentalDates}</span>
        <strong className="text-foreground tabular-nums">₹{r.order.subtotal.toLocaleString('en-IN')}</strong>
      </div>

      {r.nextStepLabel && (
        <div className="p-2 rounded-lg bg-brand/5 border border-brand/10 text-xs text-brand font-medium">
          Next: {r.nextStepLabel}
        </div>
      )}
    </div>
  )

  return (
    <DataTable
      columns={columns}
      data={orders}
      keyExtractor={(r) => r.order.vendor_order_id}
      onRowClick={onRowClick}
      loading={loading}
      page={page}
      pageSize={pageSize}
      totalItems={totalItems}
      onPageChange={onPageChange}
      emptyTitle="No orders found"
      emptyDescription="No rental orders match your filter criteria."
      mobileRenderer={renderMobileCard}
    />
  )
}
