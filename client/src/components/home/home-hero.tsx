import { useState } from 'react'
import { Icon } from '@/components/ui/icon'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DateRangePicker } from '@/components/catalog/date-range-picker'
import { useAppNavigate } from '@/components/shared/app-link'

interface HomeHeroProps {
  dates: { from?: string; to?: string }
  onDatesChange: (dates: { from?: string; to?: string }) => void
}

const POPULAR_FILTER_CHIPS = [
  { id: '1', label: 'Speakers & PA' },
  { id: '4', label: 'Stage Lights' },
  { id: '2', label: 'Microphones' },
  { id: '6', label: 'Chairs & Seating' },
  { id: '8', label: 'Tents & Canopies' },
]

/**
 * HomeHero: Centered compact hero per section 5.
 * Display heading in specific words about renting event equipment and getting it delivered.
 * One body-lg supporting sentence.
 * Pill search bar with keyword, event dates, and Search button (40px).
 * 4-5 category filter chips below the search bar.
 * No carousel, no floating chips, no announcement bar.
 */
export function HomeHero({ dates, onDatesChange }: HomeHeroProps) {
  const navigate = useAppNavigate()
  const [query, setQuery] = useState('')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (query.trim()) params.set('q', query.trim())
    if (dates.from) params.set('from', dates.from)
    if (dates.to) params.set('to', dates.to)
    const queryString = params.toString()
    navigate(`/equipment${queryString ? `?${queryString}` : ''}`)
  }

  const handleChipClick = (categoryId: string) => {
    const params = new URLSearchParams()
    params.set('category', categoryId)
    if (dates.from) params.set('from', dates.from)
    if (dates.to) params.set('to', dates.to)
    navigate(`/equipment?${params.toString()}`)
  }

  return (
    <section className="pt-10 pb-8 md:pt-16 md:pb-12 text-center max-w-4xl mx-auto px-4">
      <h1 className="text-display text-foreground font-display max-w-3xl mx-auto">
        Rent event equipment from local vendors and get it delivered
      </h1>
      <p className="text-body-lg text-text-secondary mt-3 max-w-2xl mx-auto">
        Find sound systems, stage lighting, furniture, and canopies for weddings, birthdays, and corporate events in one booking.
      </p>

      {/* Search Bar - Stacked full-width on mobile, pill on desktop */}
      <form
        onSubmit={handleSearch}
        className="mt-6 md:mt-8 p-2 md:p-2 rounded-2xl md:rounded-full border border-border bg-surface flex flex-col md:flex-row items-stretch md:items-center gap-2 max-w-3xl mx-auto shadow-xs"
      >
        <div className="flex-1 flex items-center px-3.5 h-12 md:h-10 rounded-xl md:rounded-none bg-background md:bg-transparent border border-border md:border-none">
          <Icon name="search" size={18} className="text-muted-foreground mr-2.5 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search sound, lights, furniture..."
            aria-label="Search sound, lights, furniture"
            className="w-full h-full bg-transparent text-base md:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            enterKeyHint="search"
            autoCapitalize="none"
            autoCorrect="off"
          />
        </div>

        <div className="w-full md:w-auto">
          <DateRangePicker
            from={dates.from}
            to={dates.to}
            onChange={onDatesChange}
            placeholder="Select event dates"
            className="w-full md:w-60 h-12 md:h-10 rounded-xl md:rounded-full border-border bg-background text-sm"
          />
        </div>

        <div className="w-full md:w-auto">
          <Button
            type="submit"
            className="w-full md:w-auto h-12 md:h-10 px-6 rounded-xl md:rounded-full font-bold bg-brand hover:bg-brand-hover text-brand-foreground cursor-pointer"
          >
            Search
          </Button>
        </div>
      </form>

      {/* Category filter chips */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <span className="text-label-sm text-text-secondary mr-1">Popular:</span>
        {POPULAR_FILTER_CHIPS.map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={() => handleChipClick(chip.id)}
            className="focus:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-full cursor-pointer"
          >
            <Badge variant="chip" className="min-h-[36px] py-1.5 px-3.5 text-xs">
              {chip.label}
            </Badge>
          </button>
        ))}
      </div>
    </section>
  )
}
