import { useEffect, useState } from 'react'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export type BookingStatusFilter =
  | 'all'
  | 'upcoming'
  | 'ongoing'
  | 'completed'
  | 'cancelled'

interface BookingToolbarProps {
  status: BookingStatusFilter
  onStatusChange: (status: BookingStatusFilter) => void
  search: string
  onSearchChange: (query: string) => void
  totalCount: number
  showingCount: number
  startIndex: number
  endIndex: number
  counts: {
    all: number
    upcoming: number
    ongoing: number
    completed: number
    cancelled: number
  }
}

const STATUS_TABS: { key: BookingStatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'ongoing', label: 'Ongoing' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
]

export function BookingToolbar({
  status,
  onStatusChange,
  search,
  onSearchChange,
  totalCount,
  startIndex,
  endIndex,
  counts,
}: BookingToolbarProps) {
  const [localSearch, setLocalSearch] = useState(search)

  // 300ms debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== search) {
        onSearchChange(localSearch)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [localSearch, onSearchChange, search])

  // Sync external search updates (e.g. clear search button)
  useEffect(() => {
    setLocalSearch(search)
  }, [search])

  return (
    <div className="space-y-4">
      {/* Status Tabs Bar */}
      <div className="flex items-center justify-between gap-4 border-b border-border pb-1 overflow-x-auto no-scrollbar">
        <div role="tablist" aria-label="Filter bookings by status" className="flex items-center gap-1 sm:gap-2">
          {STATUS_TABS.map((tab) => {
            const isActive = status === tab.key
            const count = counts[tab.key] || 0

            return (
              <button
                key={tab.key}
                role="tab"
                aria-selected={isActive}
                onClick={() => onStatusChange(tab.key)}
                className={cn(
                  'relative h-10 px-3 sm:px-4 rounded-t-lg text-xs font-semibold inline-flex items-center gap-2 transition-all cursor-pointer select-none whitespace-nowrap',
                  isActive
                    ? 'text-brand border-b-2 border-brand font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <span>{tab.label}</span>
                <span
                  className={cn(
                    'px-1.5 py-0.5 rounded-full text-[11px] font-bold tabular-nums',
                    isActive ? 'bg-brand/10 text-brand' : 'bg-muted text-muted-foreground'
                  )}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Search and Live Results Count Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Live aria counter */}
        <div aria-live="polite" className="text-xs text-muted-foreground font-medium">
          {totalCount > 0 ? (
            <span>
              Showing {startIndex} to {endIndex} of {totalCount} bookings
            </span>
          ) : (
            <span>No bookings found</span>
          )}
        </div>

        {/* 300ms Search Bar with Clear Button */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <input
            type="search"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Search by event or booking #..."
            className="w-full h-9.5 pl-9 pr-8 rounded-full border border-border bg-surface text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand transition-all"
            aria-label="Search bookings"
          />
          {localSearch && (
            <button
              type="button"
              onClick={() => {
                setLocalSearch('')
                onSearchChange('')
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground rounded-full"
              aria-label="Clear search"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
