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
  className,
}: FilterBarProps<T>) {
  const hasActiveFilters = Boolean(searchQuery || (activeStatus && activeStatus !== 'all'))

  return (
    <div className={cn('space-y-3.5', className)}>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search input */}
        {onSearchChange !== undefined && (
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input
              value={searchQuery || ''}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="pl-9 pr-8 h-10 text-sm bg-card rounded-xl border-border"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 size-5 flex items-center justify-center text-muted-foreground hover:text-foreground"
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
              className="h-9 text-xs text-muted-foreground hover:text-foreground"
            >
              Clear filters
            </Button>
          )}
        </div>
      </div>

      {/* Status pills */}
      {statusPills && statusPills.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {statusPills.map((pill) => {
            const isActive = activeStatus === pill.id
            return (
              <button
                key={pill.id}
                type="button"
                onClick={() => onStatusChange?.(pill.id)}
                className={cn(
                  'h-8 px-3.5 rounded-full text-xs font-medium transition-all duration-150 inline-flex items-center gap-1.5 whitespace-nowrap border',
                  isActive
                    ? 'bg-foreground text-background border-foreground shadow-xs font-semibold'
                    : 'bg-card text-muted-foreground border-border hover:border-border/80 hover:text-foreground'
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
