import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface StatTileProps {
  icon?: LucideIcon
  label: string
  value: string | number
  delta?: string
  deltaType?: 'positive' | 'negative' | 'neutral'
  subtitle?: string
  className?: string
  onClick?: () => void
}

export function StatTile({
  icon: Icon,
  label,
  value,
  delta,
  deltaType = 'neutral',
  subtitle,
  className,
  onClick,
}: StatTileProps) {
  const isClickable = Boolean(onClick)

  return (
    <div
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      className={cn(
        'p-4 rounded-[12px] border border-border bg-surface shadow-none flex flex-col justify-between transition-colors',
        isClickable && 'cursor-pointer hover:border-brand/40 hover:bg-muted/20',
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground truncate">
          {label}
        </span>
        {Icon && (
          <Icon className="size-4 stroke-[1.75] text-muted-foreground/70 shrink-0" />
        )}
      </div>

      <div className="mt-2 flex items-baseline justify-between gap-2">
        <span className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight tabular-nums">
          {value}
        </span>
        {delta && (
          <span
            className={cn(
              'text-xs font-medium tabular-nums',
              deltaType === 'positive' && 'text-emerald-700 dark:text-emerald-400',
              deltaType === 'negative' && 'text-rose-700 dark:text-rose-400',
              deltaType === 'neutral' && 'text-muted-foreground'
            )}
          >
            {delta}
          </span>
        )}
      </div>

      {subtitle && <p className="mt-1 text-xs text-muted-foreground truncate">{subtitle}</p>}
    </div>
  )
}
