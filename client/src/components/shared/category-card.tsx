import { AppLink } from './app-link'
import { formatINR } from '@/lib/format'
import type { Category } from '@/types'
import { cn } from '@/lib/utils'

interface CategoryCardProps {
  category: Category
  isSelected?: boolean
  className?: string
}

/**
 * CategoryCard: Compact bordered tile per section 5.
 * 8px radius, 16px padding, category name + "From ₹X per day", zero icons.
 */
export function CategoryCard({
  category,
  isSelected = false,
  className,
}: CategoryCardProps) {
  return (
    <AppLink
      to={`/equipment?category=${encodeURIComponent(category.id)}`}
      className={cn(
        'group flex flex-col justify-between p-4 rounded-md border bg-surface transition-colors duration-150 text-left h-full',
        isSelected
          ? 'border-brand ring-1 ring-brand'
          : 'border-border hover:border-brand/40',
        className,
      )}
    >
      <span className="text-body-md font-semibold text-foreground group-hover:text-brand transition-colors line-clamp-1">
        {category.name}
      </span>
      <span className="text-label-sm text-text-secondary font-normal tabular-nums mt-2">
        From {formatINR(category.starting_price)} per day
      </span>
    </AppLink>
  )
}
