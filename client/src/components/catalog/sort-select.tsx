import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

export interface SortSelectProps {
  value: string
  onValueChange: (val: string) => void
  className?: string
}

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Top Rated' },
  { value: 'reviews', label: 'Most Reviewed' },
  { value: 'newest', label: 'Newest Additions' },
]

export function SortSelect({
  value = 'relevance',
  onValueChange,
  className,
}: SortSelectProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className="text-xs text-muted-foreground whitespace-nowrap hidden sm:inline">
        Sort by:
      </span>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger
          aria-label="Sort equipment listings"
          className="h-10 min-w-[170px] rounded-[10px] border-border bg-surface text-xs font-medium text-foreground focus:ring-brand"
        >
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent align="end" className="bg-surface border-border">
          {SORT_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value} className="text-xs">
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
