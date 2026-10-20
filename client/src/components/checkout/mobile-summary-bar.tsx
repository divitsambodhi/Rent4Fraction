import { useState } from 'react'
import { ChevronUp } from 'lucide-react'
import { formatINR } from '@/lib/format'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { OrderSummary } from './order-summary'
import type { Quote, CartPeriod } from '@/types/checkout'

interface MobileSummaryBarProps {
  quote: Quote
  period?: CartPeriod
  vendorCount?: number
  itemCount?: number
  primaryLabel: string
  primaryDisabled?: boolean
  primaryLoading?: boolean
  onPrimaryClick: () => void
  primaryIcon?: React.ReactNode
}

export function MobileSummaryBar({
  quote,
  period,
  vendorCount = 1,
  itemCount = 1,
  primaryLabel,
  primaryDisabled = false,
  primaryLoading = false,
  onPrimaryClick,
  primaryIcon,
}: MobileSummaryBarProps) {
  const [sheetOpen, setSheetOpen] = useState(false)

  return (
    <>
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-md border-t border-border shadow-lg px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
          {/* Total & Summary Sheet Trigger */}
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="flex flex-col items-start text-left group cursor-pointer focus:outline-none"
            aria-label="View price breakdown sheet"
          >
            <div className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
              <span>Total payable</span>
              <ChevronUp className="size-3.5 stroke-[2.2] text-brand transition-transform group-hover:-translate-y-0.5" />
            </div>
            <div className="text-lg font-bold font-sans text-foreground tabular-nums">
              {formatINR(quote.total)}
            </div>
          </button>

          {/* Step Primary Action Button (48px / h-12) */}
          <Button
            type="button"
            onClick={onPrimaryClick}
            disabled={primaryDisabled || primaryLoading}
            className="h-12 px-6 text-sm font-semibold shadow-sm rounded-[12px] min-w-[160px] gap-2"
          >
            {primaryLoading ? 'Processing...' : primaryLabel}
            {!primaryLoading && primaryIcon}
          </Button>
        </div>
      </div>

      {/* Mobile Order Summary Bottom Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="bottom"
          className="p-0 rounded-t-[20px] max-h-[85vh] overflow-y-auto"
        >
          <div className="p-4 sm:p-6 space-y-4">
            <SheetHeader className="text-left pb-2">
              <SheetTitle className="font-serif text-lg">Order Breakdown</SheetTitle>
            </SheetHeader>
            <OrderSummary
              quote={quote}
              period={period}
              vendorCount={vendorCount}
              itemCount={itemCount}
              className="border-0 shadow-none p-0"
            />
            <Button
              type="button"
              onClick={() => setSheetOpen(false)}
              className="w-full h-11 rounded-[12px]"
            >
              Close breakdown
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
