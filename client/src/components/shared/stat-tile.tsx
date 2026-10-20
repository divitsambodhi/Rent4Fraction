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
        'p-5 rounded-2xl border border-border bg-card shadow-xs flex flex-col justify-between transition-all duration-150',
        isClickable && 'cursor-pointer hover:border-brand/40 hover:bg-muted/10',
        className
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
        {Icon && (
          <div className="size-8 rounded-lg bg-muted/30 flex items-center justify-center text-muted-foreground">
            <Icon className="size-4.5 stroke-[1.75]" />
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline gap-2.5">
        <span className="text-2xl sm:text-3xl font-display font-semibold text-foreground tracking-tight tabular-nums">
          {value}
        </span>
        {delta && (
          <span
            className={cn(
              'text-xs font-medium px-2 py-0.5 rounded-full inline-flex items-center gap-0.5',
              deltaType === 'positive' && 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
              deltaType === 'negative' && 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
              deltaType === 'neutral' && 'bg-muted text-muted-foreground'
            )}
          >
            {delta}
          </span>
        )}
      </div>

      {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
    </div>
  )
}
