import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface StepItem {
  id: string | number
  title?: string
  label?: string
  description?: string
}

interface StepperProps {
  steps: StepItem[]
  currentStep: number // 1-indexed (or 0-indexed normalized)
  className?: string
  onStepClick?: (stepIndex: number) => void
}

export function Stepper({
  steps,
  currentStep,
  className,
  onStepClick,
}: StepperProps) {
  // Normalize: if 0, treat as step 1
  const stepNumber = currentStep === 0 ? 1 : currentStep
  const currentStepObj = steps[stepNumber - 1] || steps[0]
  const stepTitle = currentStepObj.title || currentStepObj.label || ''
  const progressPercent = Math.round((stepNumber / steps.length) * 100)

  return (
    <div className={cn('w-full space-y-3', className)} aria-label="Sign-up progress">
      {/* Mobile Stepper View (<640px) */}
      <div className="sm:hidden space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-foreground">
            Step {stepNumber} of {steps.length} · {stepTitle}
          </span>
          <span className="text-muted-foreground tabular-nums">
            {progressPercent}%
          </span>
        </div>
        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-brand rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Desktop / Tablet Stepper View (>=640px) */}
      <div className="hidden sm:flex items-center justify-between relative">
        {steps.map((step, idx) => {
          const num = idx + 1
          const isCompleted = num < stepNumber
          const isCurrent = num === stepNumber
          const isClickable = onStepClick && num < stepNumber
          const title = step.title || step.label || ''

          return (
            <div
              key={step.id}
              className="flex items-center flex-1 last:flex-none relative"
            >
              {/* Step Circle & Title */}
              <div
                onClick={() => {
                  if (isClickable) onStepClick(idx)
                }}
                className={cn(
                  'flex items-center gap-3 relative z-10 select-none',
                  isClickable && 'cursor-pointer group',
                )}
                aria-current={isCurrent ? 'step' : undefined}
              >
                <div
                  className={cn(
                    'size-8 rounded-full flex items-center justify-center font-semibold text-xs transition-colors duration-200 border-2',
                    isCompleted
                      ? 'bg-brand text-white border-brand'
                      : isCurrent
                        ? 'border-brand text-brand bg-brand/10'
                        : 'border-border text-muted-foreground bg-surface',
                  )}
                >
                  {isCompleted ? <Check className="size-4 stroke-[2.5]" /> : num}
                </div>

                <div className="flex flex-col text-left">
                  <span
                    className={cn(
                      'text-xs font-semibold transition-colors',
                      isCurrent
                        ? 'text-foreground'
                        : isCompleted
                          ? 'text-foreground/80 group-hover:text-foreground'
                          : 'text-muted-foreground',
                    )}
                  >
                    {title}
                  </span>
                  {step.description && (
                    <span className="text-[11px] text-muted-foreground hidden lg:inline">
                      {step.description}
                    </span>
                  )}
                </div>
              </div>

              {/* Connecting Line between steps */}
              {idx < steps.length - 1 && (
                <div className="flex-1 mx-3 h-0.5 bg-border relative">
                  <div
                    className={cn(
                      'absolute left-0 top-0 h-full bg-brand transition-all duration-300',
                      isCompleted ? 'w-full' : 'w-0',
                    )}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
