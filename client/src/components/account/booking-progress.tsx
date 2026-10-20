import type { BookingStatus } from '@/types/account'
import { cn } from '@/lib/utils'

interface BookingProgressProps {
  status: BookingStatus
  className?: string
}

export function BookingProgress({ status, className }: BookingProgressProps) {
  if (status === 'cancelled') {
    return (
      <div className={cn('space-y-1.5', className)}>
        <div className="flex items-center gap-1.5 h-1.5 w-full rounded-full bg-danger/15 overflow-hidden">
          <div className="h-full w-full bg-danger rounded-full" />
        </div>
        <div className="text-[11px] font-medium text-danger">
          Rental cancelled
        </div>
      </div>
    )
  }

  // Steps: 1: Pending, 2: Confirmed, 3: Ongoing / Dispatched, 4: Completed
  let currentStep = 1
  let stepLabel = 'Booking placed'

  if (status === 'confirmed') {
    currentStep = 2
    stepLabel = 'Confirmed by vendors'
  } else if (status === 'in_progress') {
    currentStep = 3
    stepLabel = 'Delivery / Ongoing rental'
  } else if (status === 'completed') {
    currentStep = 4
    stepLabel = 'Returned & inspected'
  }

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="grid grid-cols-4 gap-1.5">
        {[1, 2, 3, 4].map((step) => {
          const isDone = step <= currentStep
          return (
            <div
              key={step}
              className={cn(
                'h-1.5 rounded-full transition-all duration-300',
                isDone ? 'bg-brand' : 'bg-muted/70'
              )}
            />
          )
        })}
      </div>
      <div className="text-[11px] font-medium text-muted-foreground flex items-center justify-between">
        <span>{stepLabel}</span>
        <span className="text-[10px] tabular-nums font-semibold">
          Step {currentStep} of 4
        </span>
      </div>
    </div>
  )
}
