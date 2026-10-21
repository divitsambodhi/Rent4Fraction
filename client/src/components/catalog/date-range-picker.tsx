import { useState, useMemo } from 'react'
import { type DateRange } from 'react-day-picker'
import { isBefore, startOfToday, parseISO, format } from 'date-fns'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Icon } from '@/components/ui/icon'
import { Button } from '@/components/ui/button'
import { useMediaQuery } from '@/hooks/use-media-query'
import { useOverlayHistory } from '@/hooks/use-overlay-history'
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
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const today = startOfToday()

  // Track draft selection on mobile before clicking "Apply"
  const [mobileDraft, setMobileDraft] = useState<DateRange | undefined>(undefined)

  // Use overlay history for Android Back button
  useOverlayHistory({
    isOpen: open && !isDesktop,
    onClose: () => setOpen(false),
    overlayId: 'date-range-picker-mobile',
    enabled: open && !isDesktop,
  })

  const selectedRange = useMemo<DateRange | undefined>(() => {
    if (!from) return undefined
    const fromDate = parseISO(from)
    const toDate = to ? parseISO(to) : undefined
    return {
      from: isNaN(fromDate.getTime()) ? undefined : fromDate,
      to: toDate && !isNaN(toDate.getTime()) ? toDate : undefined,
    }
  }, [from, to])

  // Sync draft when opened
  const handleOpenMobile = () => {
    setMobileDraft(selectedRange)
    setOpen(true)
  }

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

    return `${fromFormatted} to ${toFormatted} · ${days} ${days === 1 ? 'day' : 'days'}`
  }, [selectedRange, placeholder])

  const mobileSummaryText = useMemo(() => {
    const range = mobileDraft || selectedRange
    if (!range?.from) return 'Choose start and end dates'
    if (!range.to) return `From ${format(range.from, 'd MMM yyyy')}`

    const days =
      Math.round((range.to.getTime() - range.from.getTime()) / 86400000) + 1
    const fromFormatted = format(range.from, 'd MMM')
    const toFormatted = format(range.to, 'd MMM')

    return `${fromFormatted} to ${toFormatted} · ${days} ${days === 1 ? 'day' : 'days'}`
  }, [mobileDraft, selectedRange])

  const handleSelectDesktop = (range: DateRange | undefined) => {
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

  const handleApplyMobile = () => {
    if (mobileDraft?.from) {
      const fromStr = format(mobileDraft.from, 'yyyy-MM-dd')
      const toStr = mobileDraft.to ? format(mobileDraft.to, 'yyyy-MM-dd') : undefined
      onChange({ from: fromStr, to: toStr })
    } else {
      onChange({ from: undefined, to: undefined })
    }
    setOpen(false)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange({ from: undefined, to: undefined })
    setMobileDraft(undefined)
  }

  // Trigger button shared across desktop and mobile
  const TriggerButton = (
    <button
      type="button"
      onClick={!isDesktop ? handleOpenMobile : undefined}
      aria-label={displayText}
      className={cn(
        'inline-flex items-center justify-between gap-2 h-11 px-3.5 rounded-[10px] border border-border bg-background text-sm text-foreground hover:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:border-brand transition-colors select-none text-left min-w-[200px] cursor-pointer',
        !from && 'text-muted-foreground',
        className,
      )}
    >
      <span className="flex items-center gap-2 truncate">
        <Icon name="calendar" size={16} className="text-brand shrink-0" />
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
          className="min-w-[32px] min-h-[32px] inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0 cursor-pointer"
        >
          <Icon name="close" size={14} />
        </span>
      )}
    </button>
  )

  // Desktop Popover
  if (isDesktop) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>{TriggerButton}</PopoverTrigger>
        <PopoverContent
          align={align}
          className="w-auto p-0 bg-surface border-border shadow-xl rounded-[16px] z-dialog"
        >
          <div className="p-3 border-b border-border text-xs font-semibold text-foreground flex items-center justify-between">
            <span>Event Rental Duration</span>
            {from && (
              <button
                type="button"
                onClick={() => {
                  onChange({ from: undefined, to: undefined })
                }}
                className="text-xs text-brand hover:underline font-medium cursor-pointer"
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
            onSelect={handleSelectDesktop}
            numberOfMonths={1}
            disabled={(date) => isBefore(date, today)}
          />
        </PopoverContent>
      </Popover>
    )
  }

  // Mobile Full-screen Sheet
  return (
    <>
      {TriggerButton}

      {open && (
        <div className="fixed inset-0 z-sheet bg-surface flex flex-col h-dvh max-h-dvh overflow-hidden overscroll-contain animate-in slide-in-from-bottom duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface shrink-0 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <div>
              <h2 className="text-base font-semibold text-foreground font-sans">
                Select Event Dates
              </h2>
              <p className="text-xs text-muted-foreground">
                One-handed range selection
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground cursor-pointer -mr-2"
              aria-label="Close date picker"
            >
              <Icon name="close" size={20} />
            </button>
          </div>

          {/* Scrollable Month List */}
          <div className="flex-1 overflow-y-auto overscroll-contain p-4 flex flex-col items-center">
            <Calendar
              mode="range"
              defaultMonth={today}
              selected={mobileDraft}
              onSelect={setMobileDraft}
              numberOfMonths={3}
              disabled={(date) => isBefore(date, today)}
              className="w-full max-w-sm"
            />
          </div>

          {/* Sticky Footer Summary & Apply */}
          <div className="p-4 border-t border-border bg-surface shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))] space-y-3">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-foreground font-semibold truncate max-w-[70%]">
                {mobileSummaryText}
              </span>
              {(mobileDraft?.from || from) && (
                <button
                  type="button"
                  onClick={() => setMobileDraft(undefined)}
                  className="min-h-[36px] px-2 text-xs text-brand font-semibold hover:underline cursor-pointer"
                >
                  Clear dates
                </button>
              )}
            </div>

            <Button
              type="button"
              onClick={handleApplyMobile}
              disabled={!mobileDraft?.from}
              className="w-full h-11 text-sm font-semibold bg-brand hover:bg-brand-hover text-brand-foreground cursor-pointer"
            >
              Apply Dates
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
