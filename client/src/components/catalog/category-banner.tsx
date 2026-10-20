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
import type { CanonicalCategory, CategoryTreeGroup } from '@/lib/api'
import { cn } from '@/lib/utils'

export interface CategoryBannerProps {
  category: CanonicalCategory
  tree: CategoryTreeGroup[]
  onSelectCategory: (catId: string) => void
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

export function CategoryBanner({
  category,
  tree,
  onSelectCategory,
  className,
}: CategoryBannerProps) {
  const Icon = CATEGORY_ICON_MAP[category.icon] || Package

  // Find the group this category belongs to and its siblings
  const parentGroup = tree.find((t) => t.group.id === category.groupId)
  const siblingCategories = parentGroup?.categories || []

  return (
    <div
      className={cn(
        'relative rounded-[20px] border border-border bg-surface p-6 sm:p-8 shadow-xs overflow-hidden mb-6',
        className,
      )}
    >
      {/* Decorative subtle radial dot pattern */}
      <div
        className="absolute inset-0 opacity-[0.04] bg-[radial-gradient(#762B36_1.5px,transparent_1.5px)] [background-size:18px_18px] pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6">
        {/* Category Icon Tile */}
        <div className="size-20 sm:size-24 rounded-[16px] bg-brand text-white flex items-center justify-center shadow-md shrink-0">
          <Icon className="size-10 sm:size-12" />
        </div>

        {/* Text Details */}
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-widest text-brand">
              Event Category • {category.groupName}
            </span>
          </div>

          <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl font-semibold text-foreground tracking-tight leading-tight">
            Rent {category.name}. <em className="italic font-normal text-brand">Made easy.</em>
          </h1>

          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl leading-relaxed">
            {category.description} Verified high-fidelity event gear with transparent deposits and on-time venue delivery.
          </p>

          {/* Sibling Sub-category Chips */}
          {siblingCategories.length > 1 && (
            <div className="pt-2 flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground mr-1">
                Explore in {category.groupName}:
              </span>
              {siblingCategories.map((sib) => {
                const isCurrent = sib.id === category.id
                return (
                  <button
                    key={sib.id}
                    type="button"
                    onClick={() => onSelectCategory(sib.id)}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs transition-colors',
                      isCurrent
                        ? 'bg-brand text-white font-semibold shadow-xs'
                        : 'bg-surface border border-border text-foreground hover:border-brand/40 hover:bg-muted/30 font-medium',
                    )}
                  >
                    <span>{sib.name}</span>
                    <span
                      className={cn(
                        'text-[10px] tabular-nums',
                        isCurrent ? 'text-white/80' : 'text-muted-foreground',
                      )}
                    >
                      ({sib.count})
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
