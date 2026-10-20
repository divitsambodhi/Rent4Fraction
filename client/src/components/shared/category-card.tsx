import React from 'react'
import {
  Armchair,
  Disc3,
  Flame,
  Mic,
  Package,
  Sparkles,
  SquareMenu,
  Tent,
  Volume2,
} from 'lucide-react'
import { AppLink } from './app-link'
import { formatINR } from '@/lib/format'
import type { Category } from '@/types'
import { cn } from '@/lib/utils'

interface CategoryCardProps {
  category: Category
  isSelected?: boolean
  className?: string
}

const CATEGORY_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Volume2,
  Mic,
  Disc3,
  Sparkles,
  Flame,
  Armchair,
  SquareMenu,
  Tent,
}

export function CategoryCard({
  category,
  isSelected = false,
  className,
}: CategoryCardProps) {
  const Icon = CATEGORY_ICON_MAP[category.icon] || Package

  return (
    <AppLink
      to={`/equipment?category=${encodeURIComponent(category.id)}`}
      className={cn(
        'group flex flex-col items-center justify-center p-3.5 sm:p-4 rounded-[12px] border bg-surface transition-all duration-200 text-center shrink-0 w-32 sm:w-auto',
        isSelected
          ? 'border-brand bg-brand/5 shadow-xs ring-1 ring-brand'
          : 'border-border hover:border-brand/40 hover:bg-muted/40 hover:shadow-xs',
        className,
      )}
    >
      {/* Icon Tile: 56px to 64px */}
      <div
        className={cn(
          'size-14 sm:size-15 rounded-[12px] flex items-center justify-center transition-all duration-200 mb-2.5',
          isSelected
            ? 'bg-brand text-white'
            : 'bg-brand/10 text-brand group-hover:bg-brand group-hover:text-white',
        )}
      >
        <Icon className="size-6 sm:size-7" />
      </div>

      {/* Label: 14 to 15px semibold */}
      <span className="text-sm sm:text-[15px] font-semibold text-foreground line-clamp-1 group-hover:text-brand transition-colors">
        {category.name}
      </span>

      {/* Price caption: 13px */}
      <span className="text-[13px] text-muted-foreground font-normal tabular-nums mt-0.5">
        From {formatINR(category.starting_price)}/day
      </span>
    </AppLink>
  )
}
