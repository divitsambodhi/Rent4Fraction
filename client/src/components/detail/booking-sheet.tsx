import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { BookingCard } from './booking-card'
import type { EquipmentDetail } from '@/types'

interface BookingSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  equipment: EquipmentDetail
  from?: string
  to?: string
  quantity: number
  availableQuantity?: number
  onDatesChange: (from?: string, to?: string) => void
  onQuantityChange: (qty: number) => void
  onOpenMessageVendor?: () => void
}

export function BookingSheet({
  open,
  onOpenChange,
  equipment,
  from,
  to,
  quantity,
  availableQuantity,
  onDatesChange,
  onQuantityChange,
  onOpenMessageVendor,
}: BookingSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[90vh] overflow-y-auto rounded-t-[20px] p-4 sm:p-6 bg-surface border-t border-border"
        aria-label="Rental booking options"
      >
        <SheetHeader className="pb-3 border-b border-border">
          <SheetTitle className="font-serif text-lg font-bold text-foreground">
            Reserve {equipment.name}
          </SheetTitle>
        </SheetHeader>

        <div className="pt-4 flex justify-center">
          <BookingCard
            equipment={equipment}
            from={from}
            to={to}
            quantity={quantity}
            availableQuantity={availableQuantity}
            onDatesChange={onDatesChange}
            onQuantityChange={onQuantityChange}
            onOpenMessageVendor={() => {
              onOpenChange(false)
              onOpenMessageVendor?.()
            }}
            className="border-0 shadow-none p-0 max-w-full"
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}
