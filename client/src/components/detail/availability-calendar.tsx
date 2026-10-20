import { useState, useMemo } from 'react'
import { Info } from 'lucide-react'
import type { DateRange } from 'react-day-picker'
import { Calendar } from '@/components/ui/calendar'
import { AvailabilityStatus } from './availability-status'
import type { BlockedRange } from '@/types'
import { cn } from '@/lib/utils'

interface AvailabilityCalendarProps {
  from?: string
  to?: string
  onSelectRange: (from?: string, to?: string) => void
  blockedRanges: BlockedRange[]
  totalStock: number
  availableQuantity?: number
  nextAvailableFrom?: string | null
  className?: string
}

function parseDateStr(str?: string): Date | undefined {
  if (!str) return undefined
  const [y, m, d] = str.split('-').map(Number)
  if (!y || !m || !d) return undefined
  return new Date(y, m - 1, d)
}

function formatDateStr(date?: Date): string | undefined {
  if (!date) return undefined
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function AvailabilityCalendar({
  from,
  to,
  onSelectRange,
  blockedRanges,
  totalStock,
  availableQuantity,
  nextAvailableFrom,
  className,
}: AvailabilityCalendarProps) {
  // Desktop 2 months vs mobile 1 month
  const [month, setMonth] = useState<Date>(() => parseDateStr(from) || new Date())

  // Controlled date range
  const selectedRange: DateRange | undefined = useMemo(() => {
    const fromDate = parseDateStr(from)
    const toDate = parseDateStr(to)
    if (!fromDate && !toDate) return undefined
    return { from: fromDate, to: toDate }
  }, [from, to])

  // Fully booked days (remaining === 0) and limited days (remaining <= 3)
  const { fullyBookedDays, limitedDays } = useMemo(() => {
    const fullyBooked: Date[] = []
    const limited: Date[] = []

    // Check each day across 90 days from today
    const curr = new Date()
    curr.setHours(0, 0, 0, 0)

    for (let i = 0; i < 90; i++) {
      const y = curr.getFullYear()
      const m = String(curr.getMonth() + 1).padStart(2, '0')
      const d = String(curr.getDate()).padStart(2, '0')
      const dStr = `${y}-${m}-${d}`

      let blocked = 0
      for (const b of blockedRanges) {
        if (dStr >= b.start_date && dStr <= b.end_date) {
          blocked += b.quantity_blocked
        }
      }

      const remaining = Math.max(0, totalStock - blocked)
      if (remaining === 0) {
        fullyBooked.push(new Date(curr))
      } else if (remaining <= 3 && totalStock > 3) {
        limited.push(new Date(curr))
      }

      curr.setDate(curr.getDate() + 1)
    }

    return { fullyBookedDays: fullyBooked, limitedDays: limited }
  }, [blockedRanges, totalStock])

  // Disable past days and fully booked days
  const disabledDays = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return [{ before: today }, ...fullyBookedDays]
  }, [fullyBookedDays])

  const handleSelectRange = (range: DateRange | undefined) => {
    if (!range) {
      onSelectRange(undefined, undefined)
      return
    }

    const fromStr = formatDateStr(range.from)
    const toStr = formatDateStr(range.to)
    onSelectRange(fromStr, toStr)
  }

  const handleApplySuggestedDate = (dateStr: string) => {
    // If suggested date is like "24 Nov", calculate date in current/next year
    try {
      const currYear = new Date().getFullYear()
      const parts = dateStr.split(' ')
      if (parts.length >= 2) {
        const day = parseInt(parts[0], 10)
        const monthMap: Record<string, number> = {
          Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
          Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
        }
        const m = monthMap[parts[1]] ?? 10
        const d = new Date(currYear, m, day)
        const d2 = new Date(d)
        d2.setDate(d2.getDate() + 2) // default 3 days range
        onSelectRange(formatDateStr(d), formatDateStr(d2))
        setMonth(d)
      }
    } catch {
      // Ignore
    }
  }

  return (
    <section
      id="availability"
      className={cn(
        'rounded-[16px] border border-border bg-surface p-5 sm:p-7 shadow-xs space-y-6 scroll-mt-28',
        className,
      )}
      aria-labelledby="availability-heading"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <h2
            id="availability-heading"
            className="font-serif text-xl sm:text-2xl font-bold text-foreground"
          >
            Availability Calendar
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Select dates to check live stock and reserve for your event.
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-brand" />
            <span>Available</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-amber-500" />
            <span>Limited stock</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-muted-foreground/40 line-through" />
            <span>Fully booked</span>
          </div>
        </div>
      </div>

      {/* Calendar Grid Container */}
      <div className="p-2 sm:p-4 rounded-[12px] border border-border/80 bg-muted/20 flex flex-col items-center">
        <Calendar
          mode="range"
          selected={selectedRange}
          onSelect={handleSelectRange}
          month={month}
          onMonthChange={setMonth}
          numberOfMonths={2}
          disabled={disabledDays}
          modifiers={{
            limited: limitedDays,
            booked: fullyBookedDays,
          }}
          modifiersClassNames={{
            limited: 'relative font-bold after:content-[""] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:size-1 after:rounded-full after:bg-amber-500',
            booked: 'line-through text-muted-foreground/30 opacity-40 cursor-not-allowed',
          }}
          className="w-full flex justify-center [&_.rdp-day]:h-10 [&_.rdp-day]:w-10 sm:[&_.rdp-day]:h-11 sm:[&_.rdp-day]:w-11"
        />
      </div>

      {/* Live status line */}
      <AvailabilityStatus
        availableQuantity={availableQuantity}
        totalStock={totalStock}
        hasDates={Boolean(from && to)}
        nextAvailableFrom={nextAvailableFrom}
        onApplySuggestedDates={handleApplySuggestedDate}
      />

      <div className="flex items-start gap-2 text-xs text-muted-foreground/80">
        <Info className="size-4 shrink-0 mt-0.5" />
        <span>
          Days are booked on a first-confirmed basis. Dates selected here sync automatically with the booking card.
        </span>
      </div>
    </section>
  )
}
