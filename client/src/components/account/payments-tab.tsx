import { useCallback, useEffect, useState } from 'react'
import { PaymentSummaryTiles } from './payment-summary-tiles'
import { PaymentsTable } from './payments-table'
import { BookingDetailSheet } from './booking-detail-sheet'
import { CatalogPagination } from '@/components/catalog/catalog-pagination'
import { EmptyState } from '@/components/shared/empty-state'
import { ErrorState } from '@/components/shared/error-state'
import { LoadingSkeleton } from '@/components/shared/loading-skeleton'
import { Button } from '@/components/ui/button'
import { useAppSearchParams } from '@/components/shared/app-link'
import {
  getMyPayments,
  getPaymentSummary,
  type GetPaymentsResult,
} from '@/lib/api'
import type { PaymentSummaryTilesData } from '@/types/account'
import { CreditCard, FilterX } from 'lucide-react'

export function PaymentsTab() {
  const [searchParams, setSearchParams] = useAppSearchParams()

  const typeFilter = searchParams.get('type') || 'all'
  const statusFilter = searchParams.get('status') || 'all'
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const bookingParam = searchParams.get('booking')

  const [summary, setSummary] = useState<PaymentSummaryTilesData | null>(null)
  const [data, setData] = useState<GetPaymentsResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(() => {
    setLoading(true)
    setError(null)

    Promise.all([
      getPaymentSummary(),
      getMyPayments({
        type: typeFilter,
        status: statusFilter,
        page,
        pageSize: 10,
      }),
    ])
      .then(([summaryRes, paymentsRes]) => {
        setSummary(summaryRes)
        setData(paymentsRes)
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load payments.')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [typeFilter, statusFilter, page])

  useEffect(() => {
    loadData()
  }, [loadData])

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

  const handleClearFilters = () => {
    updateQuery({ type: null, status: null, page: null })
  }

  const handleOpenBooking = (bookingId: string) => {
    // Opening booking sheet from payments pushes history
    updateQuery({ booking: bookingId }, true)
  }

  const hasActiveFilters = typeFilter !== 'all' || statusFilter !== 'all'

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h2 className="text-xl font-serif font-bold text-foreground">
          Payments & Security Deposits
        </h2>
        <p className="text-xs text-muted-foreground">
          Track advance payments, complete booking settlements, security deposits, and refunds.
        </p>
      </div>

      {/* Synchronized Financial Summary Tiles */}
      {summary && <PaymentSummaryTiles summary={summary} />}

      {/* Filter Toolbar: Type and Status */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 pb-1">
        <div className="flex flex-wrap items-center gap-3">
          {/* Payment Type Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-muted-foreground font-medium">Type:</span>
            <select
              value={typeFilter}
              onChange={(e) =>
                updateQuery({
                  type: e.target.value === 'all' ? null : e.target.value,
                  page: null,
                })
              }
              className="h-9 px-3 rounded-[8px] border border-border bg-surface text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-brand font-medium"
            >
              <option value="all">All payment types</option>
              <option value="advance">Advance</option>
              <option value="full">Full payment</option>
              <option value="deposit">Deposit</option>
              <option value="deposit_refund">Deposit refund</option>
              <option value="refund">Refund</option>
            </select>
          </div>

          {/* Payment Status Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-muted-foreground font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) =>
                updateQuery({
                  status: e.target.value === 'all' ? null : e.target.value,
                  page: null,
                })
              }
              className="h-9 px-3 rounded-[8px] border border-border bg-surface text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-brand font-medium"
            >
              <option value="all">All statuses</option>
              <option value="success">Success</option>
              <option value="pending">Pending</option>
              <option value="refunded">Refunded</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          {hasActiveFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="h-9 text-xs text-muted-foreground hover:text-brand gap-1 px-2.5"
            >
              <FilterX className="size-3.5" />
              <span>Clear filters</span>
            </Button>
          )}
        </div>
      </div>

      {/* Content States */}
      {loading && !data ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-4 rounded-[12px] bg-surface border border-border">
              <LoadingSkeleton className="h-6 w-full rounded" />
            </div>
          ))}
        </div>
      ) : error ? (
        <ErrorState
          title="Could not load payments"
          message={error}
          onRetry={loadData}
        />
      ) : data?.items.length === 0 ? (
        <EmptyState
          icon={<CreditCard className="size-7" />}
          title={hasActiveFilters ? 'No matching transactions' : 'No payments recorded'}
          description={
            hasActiveFilters
              ? 'No payments match your selected type or status filters. Try clearing the filter.'
              : 'Payments and deposit transactions will appear here once booking invoices are generated.'
          }
          actionLabel={hasActiveFilters ? 'Clear filters' : 'Browse equipment'}
          actionHref={hasActiveFilters ? undefined : '/equipment'}
          onAction={hasActiveFilters ? handleClearFilters : undefined}
        />
      ) : (
        <div className="space-y-4">
          <PaymentsTable
            payments={data?.items || []}
            onOpenBooking={handleOpenBooking}
          />

          {/* Pagination (10 per page) */}
          <div className="pt-2">
            <CatalogPagination
              page={page}
              total={data?.total || 0}
              pageSize={10}
              onPageChange={(p) => updateQuery({ page: p > 1 ? String(p) : null })}
            />
          </div>
        </div>
      )}

      {/* Booking Detail Sheet if booking param set */}
      <BookingDetailSheet
        bookingId={bookingParam}
        onClose={() => updateQuery({ booking: null })}
        onBookingUpdated={loadData}
      />
    </div>
  )
}
