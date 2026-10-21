import { PriceText } from '@/components/shared/price-text'
import { Button } from '@/components/ui/button'
import type { EquipmentDetail } from '@/types'
import { cn } from '@/lib/utils'

interface MobileBookingBarProps {
  equipment: EquipmentDetail
  from?: string
  to?: string
  onOpenSheet: () => void
  className?: string
}

function formatDatesShort(from?: string, to?: string): string | null {
  if (!from || !to) return null
  try {
    const d1 = new Date(from)
    const d2 = new Date(to)
    const opt: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
    return `${d1.toLocaleDateString('en-IN', opt)} to ${d2.toLocaleDateString('en-IN', opt)}`
  } catch {
    return `${from} to ${to}`
  }
}

export function MobileBookingBar({
  equipment,
  from,
  to,
  onOpenSheet,
  className,
}: MobileBookingBarProps) {
  const datesLabel = formatDatesShort(from, to)
  const isAvailable = equipment.status === 'active'

  return (
    <div
      className={cn(
        'lg:hidden fixed bottom-0 inset-x-0 z-sticky-bar bg-surface/95 backdrop-blur-md border-t border-border px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-lg flex items-center justify-between gap-4',
        className,
      )}
      aria-label="Mobile booking action bar"
    >
      <div>
        <div className="flex items-baseline gap-1">
          <span className="font-serif text-xl font-bold text-foreground">
            <PriceText amount={equipment.price_per_day} />
          </span>
          <span className="text-xs text-muted-foreground font-normal">/day</span>
        </div>
        <div className="text-[11px] text-muted-foreground truncate max-w-[180px]">
          {datesLabel ? (
            <span className="text-brand font-medium">{datesLabel}</span>
          ) : (
            'Select event dates'
          )}
        </div>
      </div>

      <Button
        type="button"
        size="default"
        onClick={onOpenSheet}
        disabled={!isAvailable}
        className="h-11 px-5 rounded-[10px] font-semibold text-xs sm:text-sm shrink-0 min-w-[120px]"
      >
        {isAvailable ? (datesLabel ? 'Book now' : 'Check dates') : 'Unavailable'}
      </Button>
    </div>
  )
}
