import React, { useState, useEffect } from 'react'
import { Search, X } from 'lucide-react'
import { DateRangePicker } from './date-range-picker'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface CatalogSearchBarProps {
  initialQuery?: string
  from?: string
  to?: string
  rentalDays?: number
  onSearch: (query?: string) => void
  onDateChange: (range: { from?: string; to?: string }) => void
  className?: string
}

export function CatalogSearchBar({
  initialQuery = '',
  from,
  to,
  rentalDays = 0,
  onSearch,
  onDateChange,
  className,
}: CatalogSearchBarProps) {
  const [query, setQuery] = useState(initialQuery)

  // Sync internal query when initialQuery changes externally
  useEffect(() => {
    setQuery(initialQuery)
  }, [initialQuery])

  // 300ms debounce for typing
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query !== initialQuery) {
        onSearch(query.trim() || undefined)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query, initialQuery, onSearch])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSearch(query.trim() || undefined)
  }

  const handleClearQuery = () => {
    setQuery('')
    onSearch(undefined)
  }

  return (
    <div className={cn('w-full space-y-2', className)}>
      <form
        onSubmit={handleSubmit}
        className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2 sm:p-2.5 rounded-[16px] border border-border bg-surface shadow-xs"
      >
        {/* Keyword Search Input */}
        <div className="relative flex-1 flex items-center min-w-0">
          <Search className="absolute left-3.5 size-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search equipment, sound, lighting, vendors..."
            aria-label="Search equipment by keyword"
            className="w-full h-11 pl-10 pr-9 rounded-[10px] border border-border bg-background text-base md:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-colors"
            enterKeyHint="search"
            autoCapitalize="none"
            autoCorrect="off"
          />
          {query && (
            <button
              type="button"
              onClick={handleClearQuery}
              aria-label="Clear search keyword"
              className="absolute right-3 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Date Range Picker */}
        <div className="sm:w-auto">
          <DateRangePicker
            from={from}
            to={to}
            onChange={onDateChange}
            className="w-full sm:w-[240px]"
          />
        </div>

        {/* Search CTA */}
        <Button
          type="submit"
          className="h-11 px-5 rounded-[10px] font-semibold bg-brand text-white hover:bg-brand-hover shadow-xs shrink-0"
        >
          <Search className="size-4 mr-1.5" />
          <span>Search</span>
        </Button>
      </form>

      {/* Date Range Context Caption */}
      {rentalDays > 0 && (
        <p className="text-xs text-muted-foreground px-2 font-medium">
          Showing availability and prices for {rentalDays}{' '}
          {rentalDays === 1 ? 'day' : 'days'} (inclusive of both dates)
        </p>
      )}
    </div>
  )
}
