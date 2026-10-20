import * as React from 'react'
import { DayPicker } from 'react-day-picker'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-3', className)}
      classNames={{
        months: 'flex flex-col sm:flex-row gap-4',
        month: 'flex flex-col gap-3',
        month_caption: 'flex justify-center pt-1 relative items-center text-sm font-semibold text-foreground',
        caption_label: 'text-sm font-semibold',
        nav: 'flex items-center gap-1',
        button_previous: 'absolute left-1 size-7 bg-transparent p-0 opacity-70 hover:opacity-100 flex items-center justify-center rounded-[6px] hover:bg-muted text-foreground transition-colors',
        button_next: 'absolute right-1 size-7 bg-transparent p-0 opacity-70 hover:opacity-100 flex items-center justify-center rounded-[6px] hover:bg-muted text-foreground transition-colors',
        month_grid: 'w-full border-collapse space-y-1',
        weekdays: 'flex',
        weekday: 'text-muted-foreground rounded-md w-9 font-normal text-[0.8rem] text-center',
        week: 'flex w-full mt-1',
        day: 'h-9 w-9 text-center text-sm p-0 relative focus-within:relative focus-within:z-20',
        day_button: 'size-9 p-0 font-normal rounded-[8px] hover:bg-accent hover:text-accent-foreground flex items-center justify-center transition-colors',
        range_start: 'day-range-start bg-brand text-white hover:bg-brand hover:text-white rounded-l-[8px]',
        range_end: 'day-range-end bg-brand text-white hover:bg-brand hover:text-white rounded-r-[8px]',
        selected: 'bg-brand text-white hover:bg-brand hover:text-white focus:bg-brand focus:text-white font-medium',
        range_middle: 'aria-selected:bg-brand/15 aria-selected:text-brand rounded-none',
        today: 'border border-brand font-semibold text-brand',
        outside: 'text-muted-foreground/40 opacity-50',
        disabled: 'text-muted-foreground/30 opacity-30 cursor-not-allowed hover:bg-transparent',
        hidden: 'invisible',
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, ...props }) => {
          if (orientation === 'left') {
            return <ChevronLeft className="size-4" {...props} />
          }
          return <ChevronRight className="size-4" {...props} />
        },
      }}
      {...props}
    />
  )
}
Calendar.displayName = 'Calendar'

export { Calendar }
