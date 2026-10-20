import { useState } from 'react'
import { CalendarDays, Check, Info, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { CartVendorGroup } from './cart-vendor-group'
import type { CartPeriod } from '@/types/checkout'
import type { LineAvailabilityResult } from '@/lib/api/cart'
import { cn } from '@/lib/utils'

interface CartPeriodGroupProps {
  period: CartPeriod
  isSelected: boolean
  hasMultiplePeriods: boolean
  availabilityMap: Record<string, LineAvailabilityResult>
  onSelectPeriod: () => void
  onApplyDatesToAll: () => { conflicts: { equipment_id: string; name: string; available: number }[] }
  onUpdateQuantity: (cartItemId: string, quantity: number) => void
  onUpdateDates: (cartItemId: string, startDate: string, endDate: string) => void
  onRemoveLine: (cartItemId: string) => void
  onSaveForLater: (cartItemId: string) => void
  className?: string
}

export function CartPeriodGroup({
  period,
  isSelected,
  hasMultiplePeriods,
  availabilityMap,
  onSelectPeriod,
  onApplyDatesToAll,
  onUpdateQuantity,
  onUpdateDates,
  onRemoveLine,
  onSaveForLater,
  className,
}: CartPeriodGroupProps) {
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false)
  const [conflicts, setConflicts] = useState<{ equipment_id: string; name: string; available: number }[]>([])

  // Format dates e.g. "12 Nov – 14 Nov · 3 days"
  const formattedDates = `${period.start_date} – ${period.end_date} · ${period.days} ${period.days === 1 ? 'day' : 'days'}`

  const handleApplyAll = () => {
    const res = onApplyDatesToAll()
    if (res.conflicts.length > 0) {
      setConflicts(res.conflicts)
      setConflictDialogOpen(true)
    }
  }

  return (
    <>
      <div
        className={cn(
          'p-5 sm:p-6 rounded-[18px] bg-surface border transition-all space-y-6',
          isSelected
            ? 'border-brand/40 shadow-sm ring-1 ring-brand/10'
            : 'border-border opacity-90 hover:opacity-100',
          className,
        )}
      >
        {/* Period Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/70">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
              RENTAL PERIOD
            </span>
            <h2 className="font-serif font-bold text-lg sm:text-xl text-foreground flex items-center gap-2">
              <CalendarDays className="size-5 text-brand" />
              <span>{formattedDates}</span>
            </h2>
          </div>

          <div>
            {isSelected ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand/10 border border-brand/20 text-brand font-semibold text-xs">
                <Check className="size-3.5 stroke-[2.5]" />
                <span>Checking out this period</span>
              </span>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onSelectPeriod}
                className="h-9 px-3.5 text-xs font-semibold hover:border-brand/50"
              >
                Check out this period
              </Button>
            )}
          </div>
        </div>

        {/* Multi-Period Alert & "Use these dates for all items" */}
        {hasMultiplePeriods && isSelected && (
          <div className="p-3.5 rounded-[12px] bg-muted/40 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-start gap-2.5">
              <Info className="size-4 text-brand shrink-0 mt-0.5" />
              <span className="text-muted-foreground leading-relaxed">
                Each booking covers one rental period. Items with different dates are checked out
                separately.
              </span>
            </div>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleApplyAll}
              className="text-xs font-semibold h-8 shrink-0 self-start sm:self-center"
            >
              Use these dates for all items
            </Button>
          </div>
        )}

        {/* Vendors and Lines inside this period */}
        <div className="space-y-6">
          {period.vendor_groups.map((vGroup) => (
            <CartVendorGroup
              key={vGroup.vendor_id}
              group={vGroup}
              availabilityMap={availabilityMap}
              onUpdateQuantity={onUpdateQuantity}
              onUpdateDates={onUpdateDates}
              onRemoveLine={onRemoveLine}
              onSaveForLater={onSaveForLater}
            />
          ))}
        </div>
      </div>

      {/* Date Conflict Dialog */}
      <Dialog open={conflictDialogOpen} onOpenChange={setConflictDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg flex items-center gap-2 text-danger">
              <AlertTriangle className="size-5" />
              <span>Some items cannot be moved</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground pt-1 leading-relaxed">
              The following items are unavailable or have insufficient stock on {period.start_date} to {period.end_date}. They have been left in their original rental period:
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-2">
            {conflicts.map((c) => (
              <div
                key={c.equipment_id}
                className="p-3 rounded-[10px] bg-muted/40 border border-border text-xs flex items-center justify-between gap-2"
              >
                <span className="font-semibold text-foreground truncate">{c.name}</span>
                <span className="text-[11px] text-danger font-medium shrink-0">
                  {c.available === 0 ? 'Fully booked' : `Only ${c.available} available`}
                </span>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button
              type="button"
              onClick={() => setConflictDialogOpen(false)}
              className="h-10 text-xs w-full"
            >
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
