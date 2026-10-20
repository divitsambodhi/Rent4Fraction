import { AlertCircle, Clock, CreditCard, MessageSquare, Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ActionNeededChipsProps {
  actions: string[]
  className?: string
}

const ACTION_ICONS: Record<string, typeof AlertCircle> = {
  'Payment due': CreditCard,
  'Respond to damage report': AlertCircle,
  'Review pending': Star,
  'Vendor declined an item': Clock,
  'Action required': MessageSquare,
}

export function ActionNeededChips({ actions, className }: ActionNeededChipsProps) {
  if (!actions || actions.length === 0) return null

  const visibleActions = actions.slice(0, 2)
  const remainingCount = actions.length - 2

  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {visibleActions.map((action) => {
        const Icon = ACTION_ICONS[action] || AlertCircle
        const isDanger =
          action === 'Respond to damage report' || action === 'Vendor declined an item'

        return (
          <span
            key={action}
            className={cn(
              'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border transition-colors',
              isDanger
                ? 'bg-danger/10 text-danger border-danger/25'
                : 'bg-warning/15 text-warning border-warning/30'
            )}
          >
            <Icon className="size-3 stroke-[2]" />
            <span>{action}</span>
          </span>
        )
      })}

      {remainingCount > 0 && (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[11px] font-bold text-muted-foreground bg-muted border border-border">
          +{remainingCount}
        </span>
      )}
    </div>
  )
}
