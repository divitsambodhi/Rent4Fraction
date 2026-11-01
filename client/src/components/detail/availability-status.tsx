import { AlertCircle, CheckCircle2, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface AvailabilityStatusProps {
  availableQuantity?: number
  totalStock: number
  hasDates: boolean
  nextAvailableFrom?: string | null
  onApplySuggestedDates?: (dateStr: string) => void
  className?: string
}

export function AvailabilityStatus({
  availableQuantity,
  totalStock,
  hasDates,
  nextAvailableFrom,
  onApplySuggestedDates,
  className,
}: AvailabilityStatusProps) {
  if (!hasDates) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 text-xs sm:text-sm text-muted-foreground p-3 rounded-[10px] bg-muted/40 border border-border/60',
          className,
        )}
      >
        <Clock className="size-4 text-brand shrink-0" />
        <span>Select your event dates to check real-time inventory</span>
      </div>
    )
  }

  // Case 1: Completely unavailable (0 units)
  if (availableQuantity === 0) {
    return (
      <div
        className={cn(
          'flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-[10px] bg-danger/10 border border-danger/30 text-danger',
          className,
        )}
        role="alert"
      >
        <div className="flex items-start sm:items-center gap-2.5">
          <AlertCircle className="size-4.5 shrink-0 mt-0.5 sm:mt-0" />
          <div className="text-xs sm:text-sm font-semibold">
            <span>Not available for these dates.</span>{' '}
            {nextAvailableFrom && (
              <span className="font-normal text-danger/90">
                Next available from {nextAvailableFrom}
              </span>
            )}
          </div>
        </div>

        {nextAvailableFrom && onApplySuggestedDates && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onApplySuggestedDates(nextAvailableFrom)}
            className="text-xs h-8 px-3 border-danger/40 hover:bg-danger/20 text-danger shrink-0 font-semibold"
          >
            Use these dates
          </Button>
        )}
      </div>
    )
  }

  // Case 2: Limited inventory (1..3 units left)
  if (typeof availableQuantity === 'number' && availableQuantity > 0 && availableQuantity <= 2) {
    return (
      <div
        className={cn(
          'flex items-center gap-2.5 p-3 rounded-[10px] bg-brand/10 border border-brand/30 text-brand text-xs sm:text-sm font-semibold',
          className,
        )}
      >
        <span className="size-2 rounded-full bg-brand" />
        <span>
          Only {availableQuantity} {availableQuantity === 1 ? 'unit' : 'units'} left for these dates
        </span>
      </div>
    )
  }

  // Case 3: Ample stock available
  return (
    <div
      className={cn(
        'flex items-center gap-2.5 p-3 rounded-[10px] bg-brand/10 border border-brand/20 text-foreground text-xs sm:text-sm font-medium',
        className,
      )}
    >
      <CheckCircle2 className="size-4 text-brand shrink-0" />
      <span>
        Available: <strong className="text-brand font-bold">{availableQuantity ?? totalStock}</strong> of {totalStock} units
      </span>
    </div>
  )
}
