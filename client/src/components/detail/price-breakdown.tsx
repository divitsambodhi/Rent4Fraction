import { Info } from 'lucide-react'
import { PriceText } from '@/components/shared/price-text'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface PriceBreakdownProps {
  pricePerDay: number
  days: number
  quantity: number
  securityDepositPerUnit: number
  className?: string
}

export function PriceBreakdown({
  pricePerDay,
  days,
  quantity,
  securityDepositPerUnit,
  className,
}: PriceBreakdownProps) {
  const rentalSubtotal = pricePerDay * days * quantity
  const totalDeposit = securityDepositPerUnit * quantity

  return (
    <div className={cn('space-y-3 pt-3 border-t border-border/80 text-xs sm:text-sm', className)}>
      {/* Calculation Line */}
      <div className="flex items-center justify-between text-muted-foreground">
        <span>
          <PriceText amount={pricePerDay} /> × {days} {days === 1 ? 'day' : 'days'} × {quantity}{' '}
          {quantity === 1 ? 'unit' : 'units'}
        </span>
        <span className="font-semibold text-foreground">
          <PriceText amount={rentalSubtotal} />
        </span>
      </div>

      {/* Security Deposit Line (Refundable) */}
      <div className="flex items-center justify-between text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span>
            Refundable deposit (<PriceText amount={securityDepositPerUnit} /> × {quantity})
          </span>
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="opacity-70 hover:opacity-100 transition-opacity cursor-pointer focus:outline-none"
                aria-label="Security deposit details"
              >
                <Info className="size-3.5 text-brand" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              className="w-64 p-3 text-xs bg-surface border-border shadow-lg space-y-1"
            >
              <div className="font-semibold text-foreground">Refundable Security Deposit</div>
              <p className="text-muted-foreground leading-relaxed">
                Pre-authorized on booking and automatically released within 48 hours of return inspection.
              </p>
            </PopoverContent>
          </Popover>
        </div>
        <span className="font-medium text-foreground/80">
          <PriceText amount={totalDeposit} />
        </span>
      </div>

      <div className="h-px w-full bg-border/70 my-1" />

      {/* Total Line */}
      <div className="flex items-center justify-between text-sm sm:text-base font-bold text-foreground">
        <span>Estimated rental total</span>
        <span className="text-brand font-serif text-lg sm:text-xl">
          <PriceText amount={rentalSubtotal} />
        </span>
      </div>

      {/* Required Policy Fine-print */}
      <p className="text-[11px] text-muted-foreground leading-normal pt-1">
        Delivery fee and taxes are calculated at checkout. Final amounts are confirmed there.
      </p>
    </div>
  )
}
