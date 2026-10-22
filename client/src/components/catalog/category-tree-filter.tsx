import { useState } from 'react'
import { ChevronDown, ChevronRight, Check } from 'lucide-react'
import type { CategoryTreeGroup } from '@/lib/api'
import { cn } from '@/lib/utils'

export interface CategoryTreeFilterProps {
  tree: CategoryTreeGroup[]
  selectedCategory?: string
  onSelectCategory: (categoryId?: string) => void
  totalCatalogCount?: number
  className?: string
}

export function CategoryTreeFilter({
  tree,
  selectedCategory,
  onSelectCategory,
  totalCatalogCount = 36,
  className,
}: CategoryTreeFilterProps) {
  // All groups open by default
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    tree.forEach((t) => {
      initial[t.group.id] = true
    })
    return initial
  })

  const toggleGroup = (groupId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setOpenGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }))
  }

  const isAllSelected = !selectedCategory || selectedCategory === 'all'

  return (
    <div className={cn('space-y-1', className)} role="radiogroup" aria-label="Filter by category">
      {/* "All categories" Option */}
      <button
        type="button"
        role="radio"
        aria-checked={isAllSelected}
        onClick={() => onSelectCategory(undefined)}
        className={cn(
          'w-full flex items-center justify-between px-2.5 py-2 rounded-[8px] text-xs transition-colors text-left cursor-pointer',
          isAllSelected
            ? 'bg-brand/10 text-brand font-semibold'
            : 'text-foreground hover:bg-muted/50 font-medium',
        )}
      >
        <span className="flex items-center gap-2">
          {isAllSelected && <Check className="size-3.5 text-brand" />}
          <span>All categories</span>
        </span>
        <span className="text-[11px] text-muted-foreground tabular-nums">
          {totalCatalogCount}
        </span>
      </button>

      {/* Tree Groups */}
      {tree.map(({ group, categories, totalCount }) => {
        const isOpen = openGroups[group.id] ?? true
        const isGroupSelected = selectedCategory === group.id
        const isChildSelected = categories.some((c) => c.id === selectedCategory)

        return (
          <div key={group.id} className="space-y-0.5">
            {/* Group Header Row */}
            <div
              className={cn(
                'group flex items-center justify-between px-2 py-1.5 rounded-[8px] text-xs transition-colors',
                isGroupSelected
                  ? 'bg-brand/10 text-brand font-semibold'
                  : isChildSelected
                    ? 'text-brand font-medium'
                    : 'text-foreground hover:bg-muted/40 font-medium',
              )}
            >
              <button
                type="button"
                role="radio"
                aria-checked={isGroupSelected}
                onClick={() => onSelectCategory(group.id)}
                className="flex-1 text-left flex items-center gap-1.5 truncate cursor-pointer"
              >
                {isGroupSelected && <Check className="size-3.5 text-brand shrink-0" />}
                <span className="truncate">{group.name}</span>
              </button>

              <div className="flex items-center gap-1 shrink-0">
                <span className="text-[11px] text-muted-foreground tabular-nums mr-1">
                  {totalCount}
                </span>

                {categories.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => toggleGroup(group.id, e)}
                    aria-label={isOpen ? `Collapse ${group.name}` : `Expand ${group.name}`}
                    className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                  >
                    {isOpen ? (
                      <ChevronDown className="size-3.5" />
                    ) : (
                      <ChevronRight className="size-3.5" />
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Child Categories (if multiple and open) */}
            {categories.length > 1 && isOpen && (
              <div className="pl-4 pr-1 py-0.5 space-y-0.5 border-l-2 border-border/60 ml-3">
                {categories.map((cat) => {
                  const isSelected = selectedCategory === cat.id
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => onSelectCategory(cat.id)}
                      className={cn(
                        'w-full flex items-center justify-between px-2 py-1 rounded-[6px] text-xs transition-colors text-left cursor-pointer',
                        isSelected
                          ? 'bg-brand/10 text-brand font-semibold'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/40 font-normal',
                      )}
                    >
                      <span className="flex items-center gap-1.5 truncate">
                        {isSelected && <Check className="size-3 text-brand shrink-0" />}
                        <span className="truncate">{cat.name}</span>
                      </span>
                      <span className="text-[11px] tabular-nums text-muted-foreground shrink-0 ml-1">
                        {cat.count}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
