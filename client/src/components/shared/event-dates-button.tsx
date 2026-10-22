import { useEventDates } from '@/hooks/use-event-dates'
import { DateRangePicker } from '@/components/catalog/date-range-picker'
import { cn } from '@/lib/utils'

export interface EventDatesButtonProps {
  className?: string
  align?: 'start' | 'center' | 'end'
  onSelect?: (dates: { from?: string; to?: string }) => void
}

/**
 * Compact "Event dates" button showing "Add dates" or "12 Nov to 14 Nov".
 * Opens the existing DateRangePicker (popover on desktop, full-screen sheet on phones).
 */
export function EventDatesButton({
  className,
  align = 'start',
  onSelect,
}: EventDatesButtonProps) {
  const { from, to, setDates } = useEventDates()

  const handleChange = (range: { from?: string; to?: string }) => {
    setDates(range)
    onSelect?.(range)
  }

  return (
    <DateRangePicker
      from={from}
      to={to}
      onChange={handleChange}
      placeholder="Add dates"
      compact={true}
      align={align}
      className={cn('min-w-0 max-w-xs h-9 px-3 text-xs font-medium rounded-full', className)}
    />
  )
}
