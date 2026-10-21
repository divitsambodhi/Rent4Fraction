import React, { useState } from 'react'
import { Icon } from '@/components/ui/icon'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface Column<T> {
  id: string
  header: React.ReactNode
  accessor?: (row: T) => React.ReactNode
  className?: string
  sortable?: boolean
  hideOnMobile?: boolean
  isStatusBadge?: boolean
  isPrimary?: boolean
}

export interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyExtractor: (row: T) => string
  onRowClick?: (row: T) => void
  loading?: boolean
  emptyIcon?: React.ReactNode
  emptyTitle?: string
  emptyDescription?: string
  page?: number
  pageSize?: number
  totalItems?: number
  onPageChange?: (page: number) => void
  selectable?: boolean
  selectedIds?: string[]
  onSelectIds?: (ids: string[]) => void
  bulkActions?: React.ReactNode
  mobileRenderer?: (row: T) => React.ReactNode
  className?: string
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  loading = false,
  emptyIcon = <Icon name="inbox" size={32} className="text-muted-foreground" />,
  emptyTitle = 'No data found',
  emptyDescription = 'There are no items matching this criteria.',
  page = 1,
  pageSize = 10,
  totalItems,
  onPageChange,
  selectable = false,
  selectedIds = [],
  onSelectIds,
  bulkActions,
  mobileRenderer,
  className,
}: DataTableProps<T>) {
  const [sortCol, setSortCol] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [expandedRowIds, setExpandedRowIds] = useState<Record<string, boolean>>({})

  const total = totalItems ?? data.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const startItem = total === 0 ? 0 : (page - 1) * pageSize + 1
  const endItem = Math.min(total, page * pageSize)

  const handleSelectAll = (checked: boolean) => {
    if (!onSelectIds) return
    if (checked) {
      onSelectIds(data.map(keyExtractor))
    } else {
      onSelectIds([])
    }
  }

  const handleToggleRow = (id: string, e: React.SyntheticEvent) => {
    e.stopPropagation()
    if (!onSelectIds) return
    if (selectedIds.includes(id)) {
      onSelectIds(selectedIds.filter((item) => item !== id))
    } else {
      onSelectIds([...selectedIds, id])
    }
  }

  const toggleExpand = (id: string, e: React.SyntheticEvent) => {
    e.stopPropagation()
    setExpandedRowIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  const isAllSelected = data.length > 0 && data.every((row) => selectedIds.includes(keyExtractor(row)))

  return (
    <div className={cn('space-y-4', className)}>
      {/* Bulk action toolbar */}
      {selectable && selectedIds.length > 0 && bulkActions && (
        <div className="flex items-center justify-between p-3 px-4 rounded-xl bg-muted/60 border border-border animate-in fade-in-50">
          <span className="text-xs font-semibold text-foreground">
            {selectedIds.length} item{selectedIds.length > 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center gap-2">{bulkActions}</div>
        </div>
      )}

      {/* Desktop Table View (lg and up) */}
      <div className="hidden lg:block rounded-[12px] border border-border bg-surface overflow-hidden shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-muted/30 border-b border-border text-xs text-muted-foreground font-semibold sticky top-0 z-10">
              <tr>
                {selectable && (
                  <th className="w-12 px-4 py-3.5 text-center">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="size-4 rounded border-border text-brand focus:ring-brand/30"
                    />
                  </th>
                )}
                {columns.map((col) => (
                  <th
                    key={col.id}
                    className={cn(
                      'px-4 py-3.5 select-none font-semibold',
                      col.sortable && 'cursor-pointer hover:text-foreground',
                      col.className
                    )}
                    onClick={() => {
                      if (!col.sortable) return
                      if (sortCol === col.id) {
                        setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
                      } else {
                        setSortCol(col.id)
                        setSortDir('asc')
                      }
                    }}
                  >
                    <div className="inline-flex items-center gap-1.5">
                      <span>{col.header}</span>
                      {col.sortable && sortCol === col.id && (
                        <Icon name={sortDir === 'asc' ? 'chevron-up' : 'chevron-down'} size={14} />
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="opacity-70">
                    {selectable && <td className="w-12 px-4 py-4 text-center"><div className="size-4 bg-muted rounded mx-auto" /></td>}
                    {columns.map((c) => (
                      <td key={c.id} className="px-4 py-4">
                        <div className="h-4 bg-muted rounded w-3/4" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + (selectable ? 1 : 0)} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-2">
                      <div className="size-12 rounded-full bg-muted/40 flex items-center justify-center">
                        {emptyIcon}
                      </div>
                      <h3 className="text-sm font-semibold text-foreground mt-2">{emptyTitle}</h3>
                      <p className="text-xs text-muted-foreground">{emptyDescription}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                data.map((row) => {
                  const id = keyExtractor(row)
                  const isSelected = selectedIds.includes(id)
                  return (
                    <tr
                      key={id}
                      onClick={() => onRowClick?.(row)}
                      className={cn(
                        'transition-colors duration-150',
                        onRowClick && 'cursor-pointer hover:bg-muted/30',
                        isSelected && 'bg-brand/5'
                      )}
                    >
                      {selectable && (
                        <td className="w-12 px-4 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => handleToggleRow(id, e)}
                            className="size-4 rounded border-border text-brand focus:ring-brand/30"
                          />
                        </td>
                      )}
                      {columns.map((col) => (
                        <td key={col.id} className={cn('px-4 py-3.5 text-foreground align-middle', col.className)}>
                          {col.accessor ? col.accessor(row) : String((row as Record<string, unknown>)[col.id] ?? '')}
                        </td>
                      ))}
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card List (below lg) */}
      <div className="lg:hidden space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-4 rounded-[12px] border border-border bg-surface opacity-70 space-y-3">
              <div className="h-4 bg-muted rounded w-1/2" />
              <div className="h-3 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-1/3" />
            </div>
          ))
        ) : data.length === 0 ? (
          <div className="p-8 text-center rounded-[12px] border border-border bg-surface">
            <div className="size-12 rounded-full bg-muted/40 flex items-center justify-center mx-auto mb-2">
              {emptyIcon}
            </div>
            <h3 className="text-sm font-semibold text-foreground">{emptyTitle}</h3>
            <p className="text-xs text-muted-foreground mt-1">{emptyDescription}</p>
          </div>
        ) : (
          data.map((row) => {
            const id = keyExtractor(row)
            const isSelected = selectedIds.includes(id)
            const isExpanded = Boolean(expandedRowIds[id])

            if (mobileRenderer) {
              return (
                <div
                  key={id}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    'p-4 rounded-[12px] border border-border bg-surface transition-colors',
                    onRowClick && 'cursor-pointer hover:border-brand/40',
                    isSelected && 'ring-1 ring-brand'
                  )}
                >
                  {mobileRenderer(row)}
                </div>
              )
            }

            // Structured Mobile Card:
            // 1. Primary Line (first column or marked isPrimary)
            // 2. 2-3 Key fields
            // 3. Expandable details area
            const primaryCol = columns.find((c) => c.isPrimary) || columns[0]
            const remainingCols = columns.filter((c) => c !== primaryCol && !c.hideOnMobile)
            const topFields = remainingCols.slice(0, 3)
            const detailFields = remainingCols.slice(3)

            return (
              <div
                key={id}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  'p-4 rounded-[12px] border border-border bg-surface space-y-3 transition-colors',
                  onRowClick && 'cursor-pointer hover:border-brand/40',
                  isSelected && 'ring-1 ring-brand'
                )}
              >
                {/* Header row: Primary field + Checkbox */}
                <div className="flex items-start justify-between gap-2 border-b border-border/60 pb-2.5">
                  <div className="min-w-0 flex-1 font-semibold text-foreground text-sm">
                    {primaryCol?.accessor ? primaryCol.accessor(row) : String((row as Record<string, unknown>)[primaryCol?.id] ?? '')}
                  </div>
                  {selectable && (
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => handleToggleRow(id, e)}
                      onClick={(e) => e.stopPropagation()}
                      className="size-5 rounded border-border text-brand focus:ring-brand/30 cursor-pointer shrink-0"
                    />
                  )}
                </div>

                {/* Top 2 to 3 key fields */}
                <div className="space-y-1.5 text-xs">
                  {topFields.map((col) => (
                    <div key={col.id} className="flex items-center justify-between gap-2 py-0.5">
                      <span className="text-muted-foreground">{col.header}:</span>
                      <span className="text-foreground text-right font-medium truncate max-w-[60%]">
                        {col.accessor ? col.accessor(row) : String((row as Record<string, unknown>)[col.id] ?? '')}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Expandable Details Area if there are more fields */}
                {detailFields.length > 0 && (
                  <div className="pt-1 border-t border-border/40">
                    {isExpanded && (
                      <div className="space-y-1.5 text-xs py-2 animate-in fade-in-50">
                        {detailFields.map((col) => (
                          <div key={col.id} className="flex items-center justify-between gap-2 py-0.5">
                            <span className="text-muted-foreground">{col.header}:</span>
                            <span className="text-foreground text-right font-medium">
                              {col.accessor ? col.accessor(row) : String((row as Record<string, unknown>)[col.id] ?? '')}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={(e) => toggleExpand(id, e)}
                      className="w-full min-h-[44px] flex items-center justify-center gap-1.5 text-xs font-semibold text-brand hover:text-brand-hover cursor-pointer"
                    >
                      <span>{isExpanded ? 'Hide details' : `Show details (${detailFields.length} more)`}</span>
                      <Icon name={isExpanded ? 'chevron-up' : 'chevron-down'} size={14} />
                    </button>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Pagination Footer */}
      {total > 0 && onPageChange && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-2 py-2 text-xs text-muted-foreground">
          <p className="tabular-nums">
            Showing <strong className="text-foreground">{startItem}</strong> to <strong className="text-foreground">{endItem}</strong> of <strong className="text-foreground">{total}</strong> results
          </p>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="min-h-[44px] min-w-[44px] px-3 text-xs gap-1 cursor-pointer"
            >
              <Icon name="chevron-left" size={14} />
              <span>Previous</span>
            </Button>
            <span className="px-2 font-medium text-foreground tabular-nums">
              Page {page} of {totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="min-h-[44px] min-w-[44px] px-3 text-xs gap-1 cursor-pointer"
            >
              <span>Next</span>
              <Icon name="chevron-right" size={14} />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
