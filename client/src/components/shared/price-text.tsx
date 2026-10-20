import { formatINR } from '@/lib/format'
import { cn } from '@/lib/utils'

interface PriceTextProps {
  amount: number
  period?: string
  className?: string
  amountClassName?: string
  periodClassName?: string
}

/**
 * PriceText: Canonical component for displaying prices.
 * - Tabular numbers (never serif).
 * - Guarantees single "/day" suffix.
 * - Standard Indian Rupee (INR) formatting.
 */
export function PriceText({
  amount,
  period = '/day',
  className,
  amountClassName,
  periodClassName,
}: PriceTextProps) {
  // Strip any accidental leading slash in period
  const cleanPeriod = period.startsWith('/') ? period : `/${period}`

  return (
    <span
      className={cn(
        'inline-flex items-baseline gap-1 font-sans tabular-nums text-foreground',
        className,
      )}
    >
      <span className={cn('text-lg md:text-xl font-bold tracking-tight', amountClassName)}>
        {formatINR(amount)}
      </span>
      {cleanPeriod && (
        <span
          className={cn(
            'text-xs md:text-sm font-normal text-muted-foreground',
            periodClassName,
          )}
        >
          {cleanPeriod}
        </span>
      )}
    </span>
  )
}
