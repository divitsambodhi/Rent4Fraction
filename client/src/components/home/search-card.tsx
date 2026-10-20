import { useState } from 'react'
import { Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAppNavigate } from '@/components/shared/app-link'
import { DateRangePicker } from '@/components/catalog/date-range-picker'
import { MOCK_CATEGORIES } from '@/lib/api/mock-data'

export function SearchCard() {
  const navigate = useAppNavigate()

  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string>('all')
  const [dates, setDates] = useState<{ from?: string; to?: string }>({})

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const params = new URLSearchParams()
    if (query.trim()) params.set('q', query.trim())
    if (category && category !== 'all') params.set('category', category)
    if (dates.from) params.set('from', dates.from)
    if (dates.to) params.set('to', dates.to)

    const queryString = params.toString()
    navigate(`/equipment${queryString ? `?${queryString}` : ''}`)
  }

  return (
    <div className="relative z-20 mt-4 sm:mt-6 w-full">
      <form
        onSubmit={handleSearchSubmit}
        className="rounded-[16px] sm:rounded-[20px] border border-border bg-surface p-2.5 sm:p-3.5 shadow-md transition-all duration-200"
      >
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 sm:gap-3 items-center">
          {/* 1. What / Keyword input (col-span-4) */}
          <div className="md:col-span-4 relative flex items-center">
            <Search className="absolute left-3.5 size-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="What equipment do you need?"
              aria-label="What equipment do you need?"
              className="w-full h-12 pl-10 pr-3 rounded-[10px] border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-colors"
            />
          </div>

          {/* 2. Category Dropdown (col-span-3) */}
          <div className="md:col-span-3">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger
                aria-label="Select equipment category"
                className="h-12 rounded-[10px] border-border bg-background text-sm"
              >
                <SelectValue placeholder="All 8 Categories" />
              </SelectTrigger>
              <SelectContent className="bg-surface border-border">
                <SelectItem value="all">All 8 Categories</SelectItem>
                {MOCK_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 3. Event Dates Range Picker (col-span-3) */}
          <div className="md:col-span-3">
            <DateRangePicker
              from={dates.from}
              to={dates.to}
              onChange={setDates}
              placeholder="Select event dates"
              className="w-full h-12 bg-background border-border text-sm"
            />
          </div>

          {/* 4. Search CTA (col-span-2) */}
          <div className="md:col-span-2">
            <Button
              type="submit"
              size="lg"
              className="w-full h-12 font-semibold gap-2 shadow-xs bg-brand text-white hover:bg-brand-hover"
            >
              <Search className="size-4" />
              <span>Search</span>
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
