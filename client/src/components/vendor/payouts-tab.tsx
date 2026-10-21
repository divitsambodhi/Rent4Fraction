import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAppSearchParams } from '@/components/shared/app-link'
import { Skeleton } from '@/components/shared/loading-skeleton'
import { PayoutTiles } from './payout-tiles'
import { PayoutsTable } from './payouts-table'
import { PayoutDetailSheet } from './payout-detail-sheet'
import type { PayoutStatus, VendorPayoutsResult } from '@/types/vendor'

interface PayoutsTabProps {
  data: VendorPayoutsResult | null
  loading: boolean
  error: Error | null
  onRefetch: () => void
  onFilterChange: (filters: { status?: PayoutStatus | 'all'; range?: string; page?: number }) => void
}

export function PayoutsTab({
  data,
  loading,
  error,
  onRefetch,
  onFilterChange,
}: PayoutsTabProps) {
  const [searchParams, setSearchParams] = useAppSearchParams()
  const statusParam = (searchParams.get('status') as PayoutStatus | 'all') || 'all'
  const rangeParam = searchParams.get('range') || 'all'
  const pageParam = parseInt(searchParams.get('page') || '1', 10)
  const activePayoutId = searchParams.get('payout')

  const selectedPayout = activePayoutId && data
    ? data.payouts.find((p) => p.payout_id === activePayoutId) || null
    : null

  const handleStatusFilter = (newStatus: string) => {
    const next = new URLSearchParams(searchParams)
    if (newStatus === 'all') {
      next.delete('status')
    } else {
      next.set('status', newStatus)
    }
    next.set('page', '1')
    setSearchParams(next)
    onFilterChange({ status: newStatus as PayoutStatus | 'all', page: 1 })
  }

  const handleRangeFilter = (newRange: string) => {
    const next = new URLSearchParams(searchParams)
    if (newRange === 'all') {
      next.delete('range')
    } else {
      next.set('range', newRange)
    }
    next.set('page', '1')
    setSearchParams(next)
    onFilterChange({ range: newRange, page: 1 })
  }

  const handlePageChange = (newPage: number) => {
    const next = new URLSearchParams(searchParams)
    next.set('page', String(newPage))
    setSearchParams(next)
    onFilterChange({ page: newPage })
  }

  const handleSelectPayout = (payoutId: string) => {
    const next = new URLSearchParams(searchParams)
    next.set('payout', payoutId)
    setSearchParams(next)
  }

  const handleCloseSheet = (open: boolean) => {
    if (!open) {
      const next = new URLSearchParams(searchParams)
      next.delete('payout')
      setSearchParams(next)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-full rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-danger/30 bg-danger/5 p-8 text-center space-y-4 max-w-lg mx-auto my-12">
        <h2 className="font-serif text-lg font-bold text-foreground">
          Failed to load payouts data
        </h2>
        <p className="text-sm text-muted-foreground">{error?.message || 'Unable to retrieve payout records.'}</p>
        <Button onClick={onRefetch} variant="outline" className="gap-2">
          <RefreshCw className="size-4" />
          <span>Retry</span>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Payout Summary Tiles */}
      <PayoutTiles tiles={data.tiles} />

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {(
            [
              { id: 'all', label: 'All payouts' },
              { id: 'paid', label: 'Paid' },
              { id: 'processing', label: 'Processing' },
              { id: 'pending', label: 'Pending' },
            ] as const
          ).map((filter) => {
            const isActive = statusParam === filter.id
            return (
              <button
                key={filter.id}
                onClick={() => handleStatusFilter(filter.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-brand text-white shadow-xs'
                    : 'bg-surface border border-border text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {filter.label}
              </button>
            )
          })}
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="payout-range" className="text-xs text-muted-foreground whitespace-nowrap">
            Range:
          </label>
          <select
            id="payout-range"
            value={rangeParam}
            onChange={(e) => handleRangeFilter(e.target.value)}
            className="h-8 rounded-lg border border-border bg-surface px-2.5 text-base sm:text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-brand cursor-pointer"
          >
            <option value="all">All time</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="ytd">Year to date</option>
          </select>
        </div>
      </div>

      {/* Payouts Table */}
      <PayoutsTable
        payouts={data.payouts}
        totalCount={data.total_count}
        currentPage={pageParam}
        pageSize={10}
        onPageChange={handlePageChange}
        onSelectPayout={handleSelectPayout}
      />

      {/* Payout Detail Sheet */}
      <PayoutDetailSheet
        payout={selectedPayout}
        open={Boolean(activePayoutId && selectedPayout)}
        onOpenChange={handleCloseSheet}
      />
    </div>
  )
}
