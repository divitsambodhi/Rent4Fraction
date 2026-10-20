import { Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface QuantityStepperProps {
  quantity: number
  onChange: (quantity: number) => void
  max: number
  min?: number
  disabled?: boolean
  className?: string
  caption?: string
}

export function QuantityStepper({
  quantity,
  onChange,
  max,
  min = 1,
  disabled = false,
  className,
  caption,
}: QuantityStepperProps) {
  const canDecrease = !disabled && quantity > min
  const canIncrease = !disabled && quantity < max

  const handleDecrease = () => {
    if (canDecrease) {
      onChange(Math.max(min, quantity - 1))
    }
  }

  const handleIncrease = () => {
    if (canIncrease) {
      onChange(Math.min(max, quantity + 1))
    }
  }

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center justify-between h-11 px-1 bg-surface border border-border rounded-[10px] shadow-xs">
        <button
          type="button"
          onClick={handleDecrease}
          disabled={!canDecrease}
          aria-label="Decrease quantity"
          className={cn(
            'size-9 rounded-[8px] flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand',
            canDecrease
              ? 'text-foreground hover:bg-muted active:scale-95 cursor-pointer'
              : 'text-muted-foreground/30 cursor-not-allowed',
          )}
        >
          <Minus className="size-4 stroke-[2]" />
        </button>

        <span
          className="font-semibold text-foreground text-sm tabular-nums select-none"
          aria-live="polite"
          aria-atomic="true"
        >
          {quantity} {quantity === 1 ? 'unit' : 'units'}
        </span>

        <button
          type="button"
          onClick={handleIncrease}
          disabled={!canIncrease}
          aria-label="Increase quantity"
          className={cn(
            'size-9 rounded-[8px] flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand',
            canIncrease
              ? 'text-foreground hover:bg-muted active:scale-95 cursor-pointer'
              : 'text-muted-foreground/30 cursor-not-allowed',
          )}
        >
          <Plus className="size-4 stroke-[2]" />
        </button>
      </div>

      {caption && (
        <p className="text-[11px] text-muted-foreground leading-tight px-1">
          {caption}
        </p>
      )}
    </div>
  )
}
