import { Icon } from '@/components/ui/icon'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface CatalogPaginationProps {
  page: number
  total: number
  pageSize: number
  onPageChange: (newPage: number) => void
  className?: string
}

export function CatalogPagination({
  page,
  total,
  pageSize,
  onPageChange,
  className,
}: CatalogPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  if (totalPages <= 1) return null

  // Generate numbered pages with ellipsis
  const getPageNumbers = () => {
    const pages: (number | string)[] = []

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      if (page <= 4) {
        for (let i = 1; i <= 5; i++) {
          pages.push(i)
        }
        pages.push('...')
        pages.push(totalPages)
      } else if (page >= totalPages - 3) {
        pages.push(1)
        pages.push('...')
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i)
        }
      } else {
        pages.push(1)
        pages.push('...')
        pages.push(page - 1)
        pages.push(page)
        pages.push(page + 1)
        pages.push('...')
        pages.push(totalPages)
      }
    }

    return pages
  }

  const handlePageClick = (p: number) => {
    if (p === page || p < 1 || p > totalPages) return
    onPageChange(p)
  }

  return (
    <nav
      role="navigation"
      aria-label="Catalog pagination navigation"
      className={cn('flex items-center justify-between sm:justify-center gap-2 pt-8', className)}
    >
      {/* Previous Page Button */}
      <Button
        type="button"
        variant="outline"
        disabled={page <= 1}
        onClick={() => handlePageClick(page - 1)}
        className="min-h-[44px] min-w-[44px] h-11 sm:h-10 px-3.5 rounded-[10px] border-border bg-surface text-xs font-semibold text-foreground hover:bg-muted/50 disabled:opacity-40 gap-1.5 cursor-pointer"
      >
        <Icon name="chevron-left" size={16} />
        <span>Previous</span>
      </Button>

      {/* Mobile Page indicator (sm:hidden) */}
      <span className="sm:hidden text-xs font-medium text-muted-foreground tabular-nums">
        Page {page} of {totalPages}
      </span>

      {/* Desktop Numbered Pages (hidden on mobile) */}
      <div className="hidden sm:flex items-center gap-1.5 mx-2">
        {getPageNumbers().map((p, idx) => {
          if (p === '...') {
            return (
              <span
                key={`ellipsis-${idx}`}
                className="size-9 flex items-center justify-center text-xs text-muted-foreground select-none"
              >
                &hellip;
              </span>
            )
          }

          const pageNum = Number(p)
          const isCurrent = pageNum === page

          return (
            <button
              key={pageNum}
              type="button"
              onClick={() => handlePageClick(pageNum)}
              aria-current={isCurrent ? 'page' : undefined}
              aria-label={`Go to page ${pageNum}`}
              className={cn(
                'size-9 rounded-[8px] text-xs font-semibold tabular-nums transition-colors flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-brand cursor-pointer',
                isCurrent
                  ? 'bg-brand text-white shadow-xs'
                  : 'bg-surface border border-border text-foreground hover:bg-muted/50 hover:border-brand/40',
              )}
            >
              {pageNum}
            </button>
          )
        })}
      </div>

      {/* Next Page Button */}
      <Button
        type="button"
        variant="outline"
        disabled={page >= totalPages}
        onClick={() => handlePageClick(page + 1)}
        className="min-h-[44px] min-w-[44px] h-11 sm:h-10 px-3.5 rounded-[10px] border-border bg-surface text-xs font-semibold text-foreground hover:bg-muted/50 disabled:opacity-40 gap-1.5 cursor-pointer"
      >
        <span>Next</span>
        <Icon name="chevron-right" size={16} />
      </Button>
    </nav>
  )
}
