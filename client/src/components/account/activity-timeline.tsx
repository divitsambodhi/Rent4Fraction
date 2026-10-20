import { useState } from 'react'
import { ChevronDown, ChevronUp, Clock, CheckCircle2, AlertCircle, Truck, CreditCard } from 'lucide-react'
import type { ActivityTimelineEvent } from '@/types/account'
import { format, parseISO } from 'date-fns'
import { cn } from '@/lib/utils'

interface ActivityTimelineProps {
  activity: ActivityTimelineEvent[]
  className?: string
}

const TYPE_ICONS: Record<string, typeof Clock> = {
  order: CheckCircle2,
  delivery: Truck,
  payment: CreditCard,
  return: Clock,
  inspection: AlertCircle,
  system: Clock,
}

function formatTime(timestamp: string): string {
  try {
    return format(parseISO(timestamp), 'dd MMM yyyy, hh:mm a')
  } catch {
    return timestamp
  }
}

export function ActivityTimeline({ activity, className }: ActivityTimelineProps) {
  const [expanded, setExpanded] = useState(false)

  if (!activity || activity.length === 0) return null

  const displayList = expanded ? activity : activity.slice(0, 2)

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-muted-foreground">
          Activity History ({activity.length})
        </h4>
        {activity.length > 2 && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:text-brand-hover cursor-pointer"
          >
            <span>{expanded ? 'Show less' : 'View full timeline'}</span>
            {expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
          </button>
        )}
      </div>

      <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-[2px] before:bg-border">
        {displayList.map((item, index) => {
          const Icon = (item.type ? TYPE_ICONS[item.type] : null) || Clock
          const isFirst = index === 0

          return (
            <div key={item.id} className="relative space-y-0.5">
              {/* Dot Icon Indicator */}
              <div
                className={cn(
                  'absolute -left-6 top-0.5 size-5 rounded-full flex items-center justify-center border text-white',
                  isFirst
                    ? 'bg-brand border-brand'
                    : 'bg-muted text-muted-foreground border-border'
                )}
              >
                <Icon className="size-2.5 stroke-[2.5]" />
              </div>

              <div className="text-xs font-semibold text-foreground">
                {item.title}
              </div>
              {item.description && (
                <div className="text-[11px] text-muted-foreground leading-relaxed">
                  {item.description}
                </div>
              )}
              <div className="text-[10px] text-muted-foreground font-mono">
                {formatTime(item.timestamp)}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
