import { useCallback, useEffect, useState } from 'react'
import { BookingToolbar, type BookingStatusFilter } from './booking-toolbar'
import { BookingListItem } from './booking-list-item'
import { BookingDetailSheet } from './booking-detail-sheet'
import { CatalogPagination } from '@/components/catalog/catalog-pagination'
import { EmptyState } from '@/components/shared/empty-state'
import { ErrorState } from '@/components/shared/error-state'
import { LoadingSkeleton } from '@/components/shared/loading-skeleton'
import { useAppSearchParams } from '@/components/shared/app-link'
import { getMyBookings, type GetBookingsResult } from '@/lib/api'
import { CalendarDays, PackageSearch } from 'lucide-react'

export function BookingsTab() {
  const [searchParams, setSearchParams] = useAppSearchParams()

  const rawStatus = (searchParams.get('status') || 'all') as BookingStatusFilter
  const validStatuses: BookingStatusFilter[] = ['all', 'upcoming', 'ongoing', 'completed', 'cancelled']
  const status = validStatuses.includes(rawStatus) ? rawStatus : 'all'

  const q = searchParams.get('q') || ''
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const selectedBookingId = searchParams.get('booking')

  const [data, setData] = useState<GetBookingsResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(() => {
    setLoading(true)
    setError(null)
    getMyBookings({
      status,
      q,
      page,
      pageSize: 6,
    })
      .then((res: any) => {
        setData(res)
      })
      .catch((err: any) => {
        setError(err instanceof Error ? err.message : 'Failed to load bookings.')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [status, q, page])

  // Reload when query params change
  useEffect(() => {
    loadData()
  }, [loadData])

  // Listen for storage updates (e.g. cancelled booking, reviewed item)
  useEffect(() => {
    const handler = () => {
      loadData()
    }
    window.addEventListener('r4f-account-store-updated', handler)
    return () => window.removeEventListener('r4f-account-store-updated', handler)
  }, [loadData])

  // Updates query parameters with replace: true (except opening sheet which pushes history)
  const updateQuery = (updates: Record<string, string | null>, pushHistory = false) => {
    const next = new URLSearchParams(searchParams)
    Object.entries(updates).forEach(([key, val]) => {
      if (val === null || val === '') {
        next.delete(key)
      } else {
        next.set(key, val)
      }
    })
    setSearchParams(next, { replace: !pushHistory })
  }

  const handleStatusChange = (newStatus: BookingStatusFilter) => {
    updateQuery({ status: newStatus === 'all' ? null : newStatus, page: null })
  }

  const handleSearchChange = (newQ: string) => {
    updateQuery({ q: newQ.trim() ? newQ.trim() : null, page: null })
  }

  const handlePageChange = (newPage: number) => {
    updateQuery({ page: newPage > 1 ? String(newPage) : null })
  }

  const handleOpenSheet = (bookingId: string) => {
    // Opening sheet pushes history
    updateQuery({ booking: bookingId }, true)
  }

  const handleCloseSheet = () => {
    updateQuery({ booking: null })
  }

  const total = data?.total || 0
  const startIndex = total > 0 ? (page - 1) * 6 + 1 : 0
  const endIndex = Math.min(total, page * 6)

  return (
    <div className="space-y-6">
      {/* Toolbar: Status filter tabs, search, and live counter */}
      <BookingToolbar
        status={status}
        onStatusChange={handleStatusChange}
        search={q}
        onSearchChange={handleSearchChange}
        totalCount={total}
        showingCount={data?.items.length || 0}
        startIndex={startIndex}
        endIndex={endIndex}
        counts={
          data?.counts || { all: 0, upcoming: 0, ongoing: 0, completed: 0, cancelled: 0 }
        }
      />

      {/* Content States */}
      {loading && !data ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="p-5 rounded-[16px] bg-surface border border-border space-y-3"
            >
              <div className="flex justify-between items-center">
                <LoadingSkeleton className="h-5 w-24 rounded" />
                <LoadingSkeleton className="h-5 w-16 rounded-full" />
              </div>
              <LoadingSkeleton className="h-6 w-3/4 rounded" />
              <LoadingSkeleton className="h-4 w-1/2 rounded" />
              <LoadingSkeleton className="h-1.5 w-full rounded" />
            </div>
          ))}
        </div>
      ) : error ? (
        <ErrorState
          title="Could not load bookings"
          message={error}
          onRetry={loadData}
        />
      ) : data?.items.length === 0 ? (
        q ? (
          <EmptyState
            icon={<PackageSearch className="size-7" />}
            title="No matching bookings"
            description={`We couldn't find any bookings matching "${q}". Try another search term or clear the filter.`}
            actionLabel="Clear search"
            onAction={() => handleSearchChange('')}
          />
        ) : (
          <EmptyState
            icon={<CalendarDays className="size-7" />}
            title={
              status === 'all'
                ? 'No bookings yet'
                : `No ${status} bookings`
            }
            description="Explore our curated catalogue of event sound, lighting, furniture, and decor to start your rental."
            actionLabel="Browse equipment"
            actionHref="/equipment"
          />
        )
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {data?.items.map((b) => (
              <BookingListItem
                key={b.booking_id}
                booking={b}
                onSelect={handleOpenSheet}
              />
            ))}
          </div>

          {/* Pagination */}
          <div className="pt-2">
            <CatalogPagination
              page={page}
              total={total}
              pageSize={6}
              onPageChange={handlePageChange}
            />
          </div>
        </div>
      )}

      {/* Booking Detail Sheet */}
      <BookingDetailSheet
        bookingId={selectedBookingId}
        onClose={handleCloseSheet}
        onBookingUpdated={loadData}
      />
    </div>
  )
}
