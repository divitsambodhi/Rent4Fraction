import React, { useState } from 'react'
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Inbox,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface Column<T> {
  id: string
  header: React.ReactNode
  accessor?: (row: T) => React.ReactNode
  className?: string
  sortable?: boolean
  hideOnMobile?: boolean
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
  emptyIcon = <Inbox className="size-8 text-muted-foreground" />,
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

      {/* Desktop Table View */}
      <div className="hidden md:block rounded-[12px] border border-border bg-surface overflow-hidden shadow-none">
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
                        sortDir === 'asc' ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />
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

      {/* Mobile Card Fallback */}
      <div className="md:hidden space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-4 rounded-[10px] border border-border bg-surface opacity-70 space-y-3">
              <div className="h-4 bg-muted rounded w-1/2" />
              <div className="h-3 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-1/3" />
            </div>
          ))
        ) : data.length === 0 ? (
          <div className="p-12 text-center rounded-xl border border-border bg-card">
            <div className="size-12 rounded-full bg-muted/40 flex items-center justify-center mx-auto mb-2">
              {emptyIcon}
            </div>
            <h3 className="text-sm font-semibold text-foreground">{emptyTitle}</h3>
            <p className="text-xs text-muted-foreground mt-1">{emptyDescription}</p>
          </div>
        ) : (
          data.map((row) => {
            const id = keyExtractor(row)
            return (
              <div
                key={id}
                onClick={() => onRowClick?.(row)}
                className="p-4 rounded-xl border border-border bg-card shadow-xs transition-colors hover:border-brand/40"
              >
                {mobileRenderer ? (
                  mobileRenderer(row)
                ) : (
                  <div className="space-y-2">
                    {columns.map((col) => (
                      <div key={col.id} className="flex justify-between text-xs py-1">
                        <span className="text-muted-foreground font-medium">{col.header}:</span>
                        <span className="text-foreground text-right">
                          {col.accessor ? col.accessor(row) : String((row as Record<string, unknown>)[col.id] ?? '')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Pagination Footer */}
      {total > 0 && onPageChange && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-2 py-1 text-xs text-muted-foreground">
          <p className="tabular-nums">
            Showing <strong className="text-foreground">{startItem}</strong>–<strong className="text-foreground">{endItem}</strong> of <strong className="text-foreground">{total}</strong> results
          </p>

          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="h-8 px-2.5 text-xs gap-1"
            >
              <ChevronLeft className="size-3.5" />
              <span>Previous</span>
            </Button>
            <span className="px-2 font-medium text-foreground tabular-nums">
              Page {page} of {totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="h-8 px-2.5 text-xs gap-1"
            >
              <span>Next</span>
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
