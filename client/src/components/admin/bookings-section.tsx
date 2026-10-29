import { useState, useMemo } from 'react'
import { FilterBar } from '@/components/shared/filter-bar'
import { DataTable, type Column } from '@/components/shared/data-table'
import { StatusBadge } from '@/components/shared/status-badge'
import { Button } from '@/components/ui/button'
import { getAdminBookings } from '@/lib/api/admin'
import { BookingDetailSheet } from '@/components/account/booking-detail-sheet'
import type { BookingDetail } from '@/types/account'
import { formatRupees } from '@/lib/pricing'
import { ExternalLink } from 'lucide-react'

interface BookingsSectionProps {
  statusFilter?: string
  searchQuery?: string
  selectedBookingId?: string | null
  onStatusChange: (status: string) => void
  onSearchChange: (q: string) => void
  onSelectBooking: (id: string | null) => void
}

export function BookingsSection({
  statusFilter = 'all',
  searchQuery = '',
  selectedBookingId,
  onStatusChange,
  onSearchChange,
  onSelectBooking,
}: BookingsSectionProps) {
  const [version, setVersion] = useState(0)
  const [allBookings, setAllBookings] = useState<any[]>([])

  useMemo(() => {
    getAdminBookings().then((res) => {
      setAllBookings(res || [])
    })
  }, [version])

  const counts = useMemo(() => {
    return {
      all: allBookings.length,
      pending: allBookings.filter((b) => b.status === 'pending').length,
      confirmed: allBookings.filter((b) => b.status === 'confirmed').length,
      in_progress: allBookings.filter((b) => b.status === 'in_progress').length,
      completed: allBookings.filter((b) => b.status === 'completed').length,
      cancelled: allBookings.filter((b) => b.status === 'cancelled').length,
    }
  }, [allBookings])

  const filteredBookings = useMemo(() => {
    return allBookings.filter((b) => {
      if (statusFilter !== 'all' && b.status !== statusFilter) {
        return false
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchId = b.booking_id.toLowerCase().includes(q)
        const matchEvent = b.event_name?.toLowerCase().includes(q)
        const matchCust = b.delivery_address?.name?.toLowerCase().includes(q)
        if (!matchId && !matchEvent && !matchCust) return false
      }
      return true
    })
  }, [allBookings, statusFilter, searchQuery])

  const columns: Column<BookingDetail>[] = [
    {
      id: 'booking_id',
      header: 'Booking ID',
      accessor: (b) => (
        <span className="font-mono font-bold text-xs text-foreground bg-muted/60 px-2 py-0.5 rounded border border-border/60">
          {b.booking_id}
        </span>
      ),
      sortable: true,
    },
    {
      id: 'customer',
      header: 'Customer & Event',
      accessor: (b) => (
        <div className="text-xs">
          <div className="font-semibold text-foreground">{(b as any).customer_name || b.delivery_address?.name || 'Customer'}</div>
          <div className="text-muted-foreground truncate max-w-[180px]">{b.event_name || 'Event Rental'}</div>
        </div>
      ),
      sortable: true,
    },
    {
      id: 'dates',
      header: 'Rental Dates',
      accessor: (b) => (
        <div className="text-xs">
          <div className="text-foreground font-medium font-mono">{b.start_date}</div>
          <div className="text-muted-foreground font-mono text-[11px]">to {b.end_date}</div>
        </div>
      ),
      sortable: true,
    },
    {
      id: 'total',
      header: 'Total Value',
      accessor: (b) => (
        <span className="font-mono font-bold text-xs text-foreground">
          {formatRupees(b.total_amount)}
        </span>
      ),
      sortable: true,
    },
    {
      id: 'status',
      header: 'Status',
      accessor: (b) => <StatusBadge status={b.status} size="sm" />,
      sortable: true,
    },
    {
      id: 'payment_status',
      header: 'Payment',
      accessor: (b) => <StatusBadge status={b.payment_status} size="sm" />,
      sortable: true,
    },
    {
      id: 'actions',
      header: 'Action',
      accessor: (b) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onSelectBooking(b.booking_id)}
          className="h-8 text-xs font-semibold gap-1 px-2.5"
        >
          <span>Inspect</span>
          <ExternalLink className="size-3 text-muted-foreground" />
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <FilterBar
        searchPlaceholder="Search booking ID, event name, customer..."
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        activeStatus={statusFilter}
        onStatusChange={onStatusChange}
        statusPills={[
          { id: 'all', label: 'All Bookings', count: counts.all },
          { id: 'pending', label: 'Pending', count: counts.pending },
          { id: 'confirmed', label: 'Confirmed', count: counts.confirmed },
          { id: 'in_progress', label: 'In Progress', count: counts.in_progress },
          { id: 'completed', label: 'Completed', count: counts.completed },
          { id: 'cancelled', label: 'Cancelled', count: counts.cancelled },
        ]}
      />

      <DataTable<BookingDetail>
        columns={columns}
        data={filteredBookings}
        keyExtractor={(b) => b.booking_id}
        emptyTitle="No bookings found"
        emptyDescription="No customer bookings found matching your search filter."
        onRowClick={(b) => onSelectBooking(b.booking_id)}
      />

      <BookingDetailSheet
        bookingId={selectedBookingId || null}
        onClose={() => onSelectBooking(null)}
        mode="admin"
        onBookingUpdated={() => setVersion((v) => v + 1)}
      />
    </div>
  )
}
