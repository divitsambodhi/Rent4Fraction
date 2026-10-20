import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface SpecsTableProps {
  specifications: Record<string, string | number>
  className?: string
}

export function SpecsTable({ specifications, className }: SpecsTableProps) {
  const [expanded, setExpanded] = useState(false)
  const entries = Object.entries(specifications)

  if (entries.length === 0) return null

  const displayedEntries = expanded ? entries : entries.slice(0, 6)
  const hasMore = entries.length > 6

  return (
    <div className={cn('space-y-3', className)}>
      <div className="rounded-[12px] border border-border overflow-hidden divide-y divide-border/70 bg-surface">
        {displayedEntries.map(([key, value], idx) => (
          <div
            key={key}
            className={cn(
              'flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 text-xs sm:text-sm gap-1',
              idx % 2 === 1 ? 'bg-muted/30' : 'bg-surface',
            )}
          >
            <span className="text-muted-foreground font-medium">{key}</span>
            <span className="font-semibold text-foreground text-left sm:text-right">
              {String(value)}
            </span>
          </div>
        ))}
      </div>

      {hasMore && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(!expanded)}
          className="text-brand hover:text-brand hover:bg-brand/10 font-semibold gap-1 text-xs"
        >
          <span>{expanded ? 'Show fewer specifications' : `Show all ${entries.length} specifications`}</span>
          {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </Button>
      )}
    </div>
  )
}
