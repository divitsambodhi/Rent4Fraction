import { useState, useMemo } from 'react'
import { Calendar as CalendarIcon, X } from 'lucide-react'
import { type DateRange } from 'react-day-picker'
import { isBefore, startOfToday, parseISO, format } from 'date-fns'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export interface DateRangePickerProps {
  from?: string
  to?: string
  onChange: (range: { from?: string; to?: string }) => void
  placeholder?: string
  className?: string
  align?: 'start' | 'center' | 'end'
}

export function DateRangePicker({
  from,
  to,
  onChange,
  placeholder = 'Event dates',
  className,
  align = 'center',
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false)
  const today = startOfToday()

  const selectedRange = useMemo<DateRange | undefined>(() => {
    if (!from) return undefined
    const fromDate = parseISO(from)
    const toDate = to ? parseISO(to) : undefined
    return {
      from: isNaN(fromDate.getTime()) ? undefined : fromDate,
      to: toDate && !isNaN(toDate.getTime()) ? toDate : undefined,
    }
  }, [from, to])

  const displayText = useMemo(() => {
    if (!selectedRange?.from) return placeholder
    if (!selectedRange.to) {
      return `From ${format(selectedRange.from, 'd MMM yyyy')}`
    }

    const days =
      Math.round(
        (selectedRange.to.getTime() - selectedRange.from.getTime()) / 86400000,
      ) + 1

    const fromFormatted = format(selectedRange.from, 'd MMM')
    const toFormatted = format(selectedRange.to, 'd MMM')

    return `${fromFormatted} – ${toFormatted} · ${days} ${days === 1 ? 'day' : 'days'}`
  }, [selectedRange, placeholder])

  const handleSelect = (range: DateRange | undefined) => {
    if (!range?.from) {
      onChange({ from: undefined, to: undefined })
      return
    }

    const fromStr = format(range.from, 'yyyy-MM-dd')
    const toStr = range.to ? format(range.to, 'yyyy-MM-dd') : undefined

    onChange({ from: fromStr, to: toStr })

    if (range.from && range.to) {
      setOpen(false)
    }
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange({ from: undefined, to: undefined })
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={displayText}
          className={cn(
            'inline-flex items-center justify-between gap-2 h-11 px-3.5 rounded-[10px] border border-border bg-background text-sm text-foreground hover:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:border-brand transition-colors select-none text-left min-w-[200px]',
            !from && 'text-muted-foreground',
            className,
          )}
        >
          <span className="flex items-center gap-2 truncate">
            <CalendarIcon className="size-4 text-brand shrink-0" />
            <span className="truncate font-medium">{displayText}</span>
          </span>

          {from && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handleClear(e as unknown as React.MouseEvent)
                }
              }}
              aria-label="Clear selected dates"
              className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
            >
              <X className="size-3.5" />
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align={align}
        className="w-auto p-0 bg-surface border-border shadow-xl rounded-[16px] z-50"
      >
        <div className="p-3 border-b border-border text-xs font-semibold text-foreground flex items-center justify-between">
          <span>Event Rental Duration</span>
          {from && (
            <button
              type="button"
              onClick={() => {
                onChange({ from: undefined, to: undefined })
              }}
              className="text-xs text-brand hover:underline font-medium"
            >
              Clear
            </button>
          )}
        </div>
        <Calendar
          initialFocus
          mode="range"
          defaultMonth={selectedRange?.from || today}
          selected={selectedRange}
          onSelect={handleSelect}
          numberOfMonths={1}
          disabled={(date) => isBefore(date, today)}
        />
      </PopoverContent>
    </Popover>
  )
}
