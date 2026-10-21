import { useEffect, useState } from 'react'
import { AlertTriangle, Search, X } from 'lucide-react'
import type { EquipmentStatus } from '@/types/vendor'

interface StatusCount {
  all: number
  active: number
  inactive: number
  out_of_stock: number
  archived: number
}

interface InventoryToolbarProps {
  searchQuery: string
  onSearchChange: (q: string) => void
  status: EquipmentStatus | 'all'
  onStatusChange: (status: EquipmentStatus | 'all') => void
  statusCounts: StatusCount
  categoryId: string
  onCategoryChange: (catId: string) => void
  categories: { id: string; name: string }[]
  lowStockOnly: boolean
  onLowStockChange: (lowStock: boolean) => void
  sortBy: string
  onSortChange: (sort: string) => void
}

export function InventoryToolbar({
  searchQuery,
  onSearchChange,
  status,
  onStatusChange,
  statusCounts,
  categoryId,
  onCategoryChange,
  categories,
  lowStockOnly,
  onLowStockChange,
  sortBy,
  onSortChange,
}: InventoryToolbarProps) {
  const [localQuery, setLocalQuery] = useState(searchQuery)

  // Debounced search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localQuery !== searchQuery) {
        onSearchChange(localQuery)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [localQuery, searchQuery, onSearchChange])

  // Sync when prop changes
  useEffect(() => {
    setLocalQuery(searchQuery)
  }, [searchQuery])

  const statusPills: { id: EquipmentStatus | 'all'; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: statusCounts.all },
    { id: 'active', label: 'Active', count: statusCounts.active },
    { id: 'inactive', label: 'Inactive', count: statusCounts.inactive },
    { id: 'out_of_stock', label: 'Out of stock', count: statusCounts.out_of_stock },
    { id: 'archived', label: 'Archived', count: statusCounts.archived },
  ]

  return (
    <div className="space-y-3 p-3.5 sm:p-4 rounded-[12px] border border-border bg-surface shadow-none">
      {/* Top Row: Search input + Category Select + Sort Select */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            placeholder="Search equipment by name, category, or specs..."
            className="w-full text-base sm:text-sm bg-background border border-border rounded-sm pl-9 pr-8 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-brand shadow-none"
            enterKeyHint="search"
            autoCapitalize="none"
            autoCorrect="off"
          />
          {localQuery && (
            <button
              type="button"
              onClick={() => {
                setLocalQuery('')
                onSearchChange('')
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Category Tree / Select */}
        <div className="flex items-center gap-2">
          <select
            value={categoryId}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="h-9 rounded-sm border border-border bg-background px-3 text-base sm:text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-brand cursor-pointer max-w-[180px] truncate shadow-none"
          >
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            className="h-9 rounded-sm border border-border bg-background px-3 text-base sm:text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-brand cursor-pointer shadow-none"
          >
            <option value="updated">Recently updated</option>
            <option value="name">Name (A-Z)</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="stock">Stock quantity</option>
            <option value="rating">Highest rated</option>
          </select>
        </div>
      </div>

      {/* Bottom Row: Count Cards / Status Filter + Low Stock Toggle Switch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-border/50">
        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {statusPills.map((pill) => {
            const isSelected = status === pill.id
            return (
              <button
                key={pill.id}
                type="button"
                onClick={() => onStatusChange(pill.id)}
                className={`px-3 py-1.5 rounded-[6px] text-xs font-medium transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 border ${
                  isSelected
                    ? 'border-brand bg-brand/10 text-brand font-semibold'
                    : 'bg-background border-border text-muted-foreground hover:text-foreground hover:bg-muted/40'
                }`}
              >
                <span>{pill.label}</span>
                <span
                  className={`text-[10px] font-semibold px-1.5 py-0.2 rounded-full tabular-nums ${
                    isSelected ? 'bg-brand/20 text-brand' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {pill.count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Low Stock Only Switch */}
        <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-foreground select-none shrink-0">
          <input
            type="checkbox"
            checked={lowStockOnly}
            onChange={(e) => onLowStockChange(e.target.checked)}
            className="rounded border-border text-brand focus:ring-brand size-3.5"
          />
          <AlertTriangle className={`size-3.5 ${lowStockOnly ? 'text-warning' : 'text-muted-foreground'}`} />
          <span>Low stock only (≤ 2 units)</span>
        </label>
      </div>
    </div>
  )
}
