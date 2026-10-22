import { Button } from '@/components/ui/button'
import { DateRangePicker } from '@/components/catalog/date-range-picker'
import { AppLink, useAppNavigate } from '@/components/shared/app-link'
import { useEventDates } from '@/hooks/use-event-dates'

interface HomeHeroProps {
  dates?: { from?: string; to?: string }
  onDatesChange?: (dates: { from?: string; to?: string }) => void
}

/**
 * HomeHero: Restrained hero per task A2.
 * One display heading, one supporting sentence, and two actions:
 * a primary "Browse equipment" button and a secondary "Choose event dates" button
 * (opens the picker, then goes to /equipment with the dates).
 * No search field in the hero.
 */
export function HomeHero({ dates: propDates, onDatesChange }: HomeHeroProps) {
  const navigate = useAppNavigate()
  const { from: hookFrom, to: hookTo, setDates } = useEventDates()

  const currentFrom = propDates?.from ?? hookFrom
  const currentTo = propDates?.to ?? hookTo

  const handleDateChange = (range: { from?: string; to?: string }) => {
    setDates(range)
    onDatesChange?.(range)
    if (range.from && range.to) {
      navigate(`/equipment?from=${range.from}&to=${range.to}`)
    }
  }

  const browseUrl = currentFrom && currentTo
    ? `/equipment?from=${currentFrom}&to=${currentTo}`
    : '/equipment'

  return (
    <section className="pt-12 pb-10 md:pt-20 md:pb-16 text-center max-w-4xl mx-auto px-4">
      <h1 className="text-display text-foreground font-display max-w-3xl mx-auto">
        Rent event equipment from local vendors and get it delivered
      </h1>
      <p className="text-body-lg text-text-secondary mt-4 max-w-2xl mx-auto">
        Find sound systems, stage lighting, furniture, and canopies for weddings, birthdays, and corporate events in one booking.
      </p>

      {/* Two hero actions */}
      <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
        <AppLink to={browseUrl} className="w-full sm:w-auto">
          <Button
            size="lg"
            className="w-full sm:w-auto min-h-[44px] px-8 rounded-full font-bold bg-brand hover:bg-brand-hover text-brand-foreground cursor-pointer"
          >
            Browse equipment
          </Button>
        </AppLink>

        <div className="w-full sm:w-auto">
          <DateRangePicker
            from={currentFrom}
            to={currentTo}
            onChange={handleDateChange}
            placeholder="Choose event dates"
            compact={true}
            className="w-full sm:w-auto min-h-[44px] px-6 rounded-full border-border bg-surface hover:bg-muted/30 text-sm font-semibold"
          />
        </div>
      </div>
    </section>
  )
}
