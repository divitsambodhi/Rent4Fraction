import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface FilterPill<T extends string = string> {
  id: T
  label: string
  count?: number
  tone?: 'default' | 'brand' | 'warning' | 'danger'
}

export interface FilterBarProps<T extends string = string> {
  searchQuery?: string
  onSearchChange?: (query: string) => void
  searchPlaceholder?: string
  statusPills?: FilterPill<T>[]
  activeStatus?: T
  onStatusChange?: (status: T) => void
  extraFilters?: React.ReactNode
  onClearAll?: () => void
  variant?: 'cards' | 'pills'
  className?: string
}

export function FilterBar<T extends string = string>({
  searchQuery,
  onSearchChange,
  searchPlaceholder = 'Search...',
  statusPills,
  activeStatus,
  onStatusChange,
  extraFilters,
  onClearAll,
  variant,
  className,
}: FilterBarProps<T>) {
  const hasActiveFilters = Boolean(searchQuery || (activeStatus && activeStatus !== 'all'))
  const useCards = variant ? variant === 'cards' : Boolean(statusPills && statusPills.some((p) => typeof p.count === 'number'))

  return (
    <div className={cn('space-y-3', className)}>
      {/* Count Cards Filter (Taste List Pattern: 61px tall, 12px padding, 13px label, 16/600 value, 8px gap) */}
      {statusPills && statusPills.length > 0 && useCards && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          {statusPills.map((pill) => {
            const isActive = activeStatus === pill.id
            const countDisplay = typeof pill.count === 'number' ? pill.count : 0

            return (
              <button
                key={pill.id}
                type="button"
                onClick={() => onStatusChange?.(pill.id)}
                className={cn(
                  'h-[61px] p-3 rounded-[8px] border text-left transition-colors flex flex-col justify-between cursor-pointer select-none',
                  isActive
                    ? 'border-[1.5px] border-brand bg-brand/5'
                    : 'border-border bg-surface hover:bg-muted/30'
                )}
              >
                <span className="text-[13px] text-muted-foreground font-normal leading-tight truncate">
                  {pill.label}
                </span>
                <span className="text-base font-semibold text-foreground tabular-nums leading-none">
                  {countDisplay}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {/* Search Input & Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        {/* Search input */}
        {onSearchChange !== undefined && (
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input
              value={searchQuery || ''}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="pl-9 pr-8 h-9 text-xs bg-surface rounded-[8px] border-border shadow-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 flex items-center justify-center text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Extra filters and clear */}
        <div className="flex items-center gap-2 flex-wrap">
          {extraFilters}
          {onClearAll && hasActiveFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClearAll}
              className="h-8 text-xs text-muted-foreground hover:text-foreground"
            >
              Clear filters
            </Button>
          )}
        </div>
      </div>

      {/* Fallback Status pills (when useCards is false) */}
      {statusPills && statusPills.length > 0 && !useCards && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {statusPills.map((pill) => {
            const isActive = activeStatus === pill.id
            return (
              <button
                key={pill.id}
                type="button"
                onClick={() => onStatusChange?.(pill.id)}
                className={cn(
                  'h-7 px-3 rounded-[6px] text-xs font-medium transition-colors inline-flex items-center gap-1.5 whitespace-nowrap border',
                  isActive
                    ? 'bg-foreground text-background border-foreground font-semibold'
                    : 'bg-surface text-muted-foreground border-border hover:border-border/80 hover:text-foreground'
                )}
              >
                <span>{pill.label}</span>
                {typeof pill.count === 'number' && (
                  <span
                    className={cn(
                      'text-[10px] font-bold px-1.5 py-0.2 rounded-full tabular-nums',
                      isActive ? 'bg-background/20 text-background' : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {pill.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
