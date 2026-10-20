import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface KpiDelta {
  value: string | number
  text?: string
  isPositive?: boolean
  tone?: 'success' | 'warning' | 'danger' | 'neutral'
}

export interface KpiCardProps {
  label: string
  value: string | number
  delta?: KpiDelta
  icon?: React.ComponentType<{ className?: string }>
  helperText?: string
  className?: string
}

export function KpiCard({
  label,
  value,
  delta,
  icon: Icon,
  helperText,
  className,
}: KpiCardProps) {
  const getToneClasses = (tone?: KpiDelta['tone'], isPositive?: boolean) => {
    if (tone === 'warning') {
      return 'bg-warning/10 text-warning border-warning/20'
    }
    if (tone === 'danger' || isPositive === false) {
      return 'bg-danger/10 text-danger border-danger/20'
    }
    if (tone === 'success' || isPositive === true) {
      return 'bg-success/10 text-success border-success/20'
    }
    return 'bg-muted text-muted-foreground border-border'
  }

  return (
    <div
      className={cn(
        'rounded-[12px] border border-border bg-surface p-4 min-h-[104px] flex flex-col justify-between shadow-none transition-colors',
        className,
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
        <span className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground tabular-nums">
          {value}
        </span>

        {delta && (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded-md border',
              getToneClasses(delta.tone, delta.isPositive),
            )}
          >
            {delta.isPositive === true && <ArrowUpRight className="size-3 shrink-0" />}
            {delta.isPositive === false && <ArrowDownRight className="size-3 shrink-0" />}
            <span className="tabular-nums">{delta.value}</span>
            {delta.text && <span className="ml-0.5 font-normal">{delta.text}</span>}
          </span>
        )}
      </div>

      {helperText && (
        <span className="text-[11px] text-muted-foreground mt-1 truncate">
          {helperText}
        </span>
      )}
    </div>
  )
}
