import type { BookingStatus } from '@/types/account'
import { Check, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BookingProgressProps {
  status: BookingStatus
  variant?: 'compact' | 'detailed'
  className?: string
}

const STEPS = [
  { id: 'placed', step: 1, label: 'Placed', desc: 'Order received' },
  { id: 'confirmed', step: 2, label: 'Confirmed', desc: 'Approved by vendors' },
  { id: 'dispatched', step: 3, label: 'In Rental', desc: 'Delivered & active' },
  { id: 'completed', step: 4, label: 'Completed', desc: 'Returned & inspected' },
]

export function BookingProgress({
  status,
  variant = 'compact',
  className,
}: BookingProgressProps) {
  if (status === 'cancelled') {
    return (
      <div
        className={cn(
          'p-3 rounded-[12px] bg-danger/10 border border-danger/25 text-danger flex items-center gap-2.5',
          className,
        )}
      >
        <XCircle className="size-4 shrink-0" />
        <div className="text-xs font-semibold">Rental booking cancelled</div>
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

  if (variant === 'detailed') {
    return (
      <div
        className={cn(
          'p-4 rounded-[14px] bg-muted/20 border border-border space-y-3',
          className,
        )}
      >
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-foreground">Order Lifecycle</span>
          <span className="text-[11px] font-medium text-brand tabular-nums">
            Step {currentStep} of 4 · {stepLabel}
          </span>
        </div>

        {/* 4-Step Interactive Nodes */}
        <div className="relative flex items-center justify-between pt-1 pb-1">
          {/* Background Connecting Rail */}
          <div className="absolute left-4 right-4 top-1/2 -translate-y-1/2 h-0.5 bg-border/80" />
          {/* Active Filled Rail */}
          <div
            className="absolute left-4 top-1/2 -translate-y-1/2 h-0.5 bg-brand transition-all duration-300"
            style={{
              width:
                currentStep === 1
                  ? '0%'
                  : currentStep === 2
                    ? '33%'
                    : currentStep === 3
                      ? '66%'
                      : 'calc(100% - 32px)',
            }}
          />

          {STEPS.map((s) => {
            const isCompleted = s.step < currentStep
            const isCurrent = s.step === currentStep
            return (
              <div key={s.id} className="relative z-10 flex flex-col items-center">
                <div
                  className={cn(
                    'size-7 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                    isCompleted && 'bg-brand text-white border-2 border-brand',
                    isCurrent &&
                      'bg-surface text-brand border-2 border-brand shadow-xs',
                    !isCompleted &&
                      !isCurrent &&
                      'bg-muted text-muted-foreground border-2 border-border',
                  )}
                >
                  {isCompleted ? (
                    <Check className="size-3.5 stroke-[2.5]" />
                  ) : (
                    <span className="tabular-nums">{s.step}</span>
                  )}
                </div>
                <span
                  className={cn(
                    'mt-1.5 text-[11px] font-semibold tracking-tight text-center whitespace-nowrap',
                    isCompleted || isCurrent
                      ? 'text-foreground'
                      : 'text-muted-foreground',
                  )}
                >
                  {s.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // Compact variant (default for cards & list items)
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
                isDone ? 'bg-brand' : 'bg-muted/70',
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
