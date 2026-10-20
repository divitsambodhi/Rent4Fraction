import { ClipboardCheck, RotateCcw } from 'lucide-react'
import type { ItemCondition, ReturnInspectionData } from '@/types/account'
import { cn } from '@/lib/utils'

interface ReturnInspectionPanelProps {
  returnInspection: ReturnInspectionData
  className?: string
}

export function ItemConditionBadge({ condition }: { condition: ItemCondition }) {
  const styles: Record<ItemCondition, string> = {
    good: 'bg-success/15 text-success border-success/30',
    minor_damage: 'bg-muted text-muted-foreground border-border',
    major_damage: 'bg-danger/15 text-danger border-danger/30',
    lost: 'bg-danger/15 text-danger border-danger/30',
  }

  const labels: Record<ItemCondition, string> = {
    good: 'Good condition',
    minor_damage: 'Minor wear / damage',
    major_damage: 'Major damage',
    lost: 'Item lost',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border',
        styles[condition] || styles.good
      )}
    >
      <span className="size-1.5 rounded-full bg-current shrink-0" />
      <span>{labels[condition] || condition}</span>
    </span>
  )
}

export function ReturnInspectionPanel({
  returnInspection,
  className,
}: ReturnInspectionPanelProps) {
  // Step logic: 1: Scheduled, 2: Returned, 3: Inspection complete
  let step = 1
  if (returnInspection.status === 'returned' || returnInspection.returned_at) step = 2
  if (returnInspection.inspected_at) step = 3

  const stepLabels = ['Return scheduled', 'Returned', 'Inspection complete']

  return (
    <div className={cn('p-4 rounded-[12px] bg-muted/20 border border-border space-y-3 text-xs', className)}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-bold text-foreground">
          <RotateCcw className="size-4 text-brand" />
          <span>Return & Inspection Status</span>
        </div>
        <ItemConditionBadge condition={returnInspection.condition} />
      </div>

      {/* 3-Step Timeline */}
      <div className="grid grid-cols-3 gap-2">
        {[1, 2, 3].map((s) => {
          const isDone = s <= step
          return (
            <div key={s} className="space-y-1">
              <div
                className={cn(
                  'h-1.5 rounded-full transition-colors',
                  isDone ? 'bg-brand' : 'bg-muted'
                )}
              />
              <div
                className={cn(
                  'text-[10px] font-medium truncate',
                  isDone ? 'text-foreground font-semibold' : 'text-muted-foreground'
                )}
              >
                {stepLabels[s - 1]}
              </div>
            </div>
          )
        })}
      </div>

      {/* Inspection notes */}
      {returnInspection.notes && (
        <div className="p-2.5 rounded-md bg-surface border border-border/70 text-[11px] text-muted-foreground flex items-start gap-2">
          <ClipboardCheck className="size-3.5 text-brand shrink-0 mt-0.5" />
          <span>{returnInspection.notes}</span>
        </div>
      )}
    </div>
  )
}
