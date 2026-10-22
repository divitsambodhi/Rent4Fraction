import { useState, useMemo } from 'react'
import { FilterBar } from '@/components/shared/filter-bar'
import { Button } from '@/components/ui/button'
import {
  getAdminCategories,
  saveAdminCategory,
  toggleAdminCategoryActive,
  type ManagedCategory,
} from '@/lib/api/admin-store'
import { CategoryFormSheet } from './category-form-sheet'
import {
  Folder,
  Plus,
  Edit2,
  Check,
  PowerOff,
  Layers,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatRupees } from '@/lib/pricing'

interface CategoriesSectionProps {
  selectedCategoryId?: string | null
  onSelectCategory: (id: string | null) => void
  statusFilter?: string
  searchQuery?: string
  onStatusChange?: (status: string) => void
  onSearchChange?: (q: string) => void
}

export function CategoriesSection({
  selectedCategoryId,
  onSelectCategory,
  statusFilter = 'all',
  searchQuery = '',
  onStatusChange,
  onSearchChange,
}: CategoriesSectionProps) {
  const [version, setVersion] = useState(0)

  const categories = useMemo(() => {
    return getAdminCategories()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version])

  const counts = useMemo(() => {
    return {
      all: categories.length,
      active: categories.filter((c) => c.is_active).length,
      inactive: categories.filter((c) => !c.is_active).length,
    }
  }, [categories])

  const filteredCategories = useMemo(() => {
    return categories.filter((cat) => {
      if (statusFilter === 'active' && !cat.is_active) return false
      if (statusFilter === 'inactive' && cat.is_active) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchName = cat.name.toLowerCase().includes(q)
        const matchGroup = cat.groupName?.toLowerCase().includes(q)
        if (!matchName && !matchGroup) return false
      }
      return true
    })
  }, [categories, statusFilter, searchQuery])

  const groups = useMemo(() => {
    const map: Record<string, { groupId: string; groupName: string; items: ManagedCategory[] }> = {}
    filteredCategories.forEach((cat) => {
      const gId = cat.groupId || '101'
      const gName = cat.groupName || 'Sound'
      if (!map[gId]) {
        map[gId] = { groupId: gId, groupName: gName, items: [] }
      }
      map[gId].items.push(cat)
    })
    return Object.values(map)
  }, [filteredCategories])

  const handleToggleActive = (cat: ManagedCategory) => {
    const nextState = !cat.is_active
    toggleAdminCategoryActive(cat.id, nextState)
    toast.success(
      nextState
        ? `Category "${cat.name}" activated`
        : `Category "${cat.name}" deactivated (existing equipment remains preserved)`
    )
    setVersion((v) => v + 1)
  }

  const activeCategory = selectedCategoryId && selectedCategoryId !== 'new'
    ? categories.find((c) => c.id === selectedCategoryId) || null
    : null

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-serif font-bold text-foreground">Catalogue Taxonomy & Categories</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage product categories, groups, and baseline rental rates across the platform. Deactivated categories are hidden from consumer filters.
          </p>
        </div>

        <Button
          onClick={() => onSelectCategory('new')}
          className="h-9 text-xs font-semibold bg-brand text-brand-foreground hover:bg-brand-hover gap-1.5 shrink-0"
        >
          <Plus className="size-4" />
          <span>Add Category</span>
        </Button>
      </div>

      <FilterBar
        searchPlaceholder="Search category name or group..."
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        activeStatus={statusFilter}
        onStatusChange={onStatusChange}
        statusPills={[
          { id: 'all', label: 'All Categories', count: counts.all },
          { id: 'active', label: 'Active', count: counts.active },
          { id: 'inactive', label: 'Inactive', count: counts.inactive },
        ]}
      />

      <div className="space-y-4">
        {groups.map((group) => (
          <div
            key={group.groupId}
            className="rounded-[16px] bg-surface border border-border shadow-xs overflow-hidden"
          >
            <div className="px-5 py-3.5 bg-muted/40 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="size-4 text-brand" />
                <span className="font-serif font-bold text-sm text-foreground">{group.groupName}</span>
                <span className="text-xs text-muted-foreground font-mono">
                  ({group.items.length} categories)
                </span>
              </div>
            </div>

            <div className="divide-y divide-border/60">
              {group.items.map((cat) => {
                const hasEquip = (cat.equipment_count || 0) > 0
                return (
                  <div
                    key={cat.id}
                    className="px-5 py-3.5 flex items-center justify-between gap-4 hover:bg-muted/20 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="size-9 rounded-full bg-muted flex items-center justify-center text-muted-foreground shrink-0 border border-border">
                        <Folder className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs sm:text-sm text-foreground truncate">
                            {cat.name}
                          </span>
                          {!cat.is_active && (
                            <span className="text-[10px] uppercase font-mono font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                              Deactivated
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground truncate max-w-[400px]">
                          {cat.description || 'Standard category description'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right hidden sm:block">
                        <div className="text-xs font-mono font-medium text-foreground">
                          From {formatRupees(cat.starting_price || 1000)}/day
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {cat.equipment_count || 0} items listed
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onSelectCategory(cat.id)}
                          className="h-8 text-xs font-semibold gap-1 px-2.5"
                        >
                          <Edit2 className="size-3" />
                          <span>Edit</span>
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleActive(cat)}
                          title={
                            hasEquip && cat.is_active
                              ? 'Categories with equipment cannot be hard deleted. Deactivating will hide it from new listings.'
                              : cat.is_active
                              ? 'Deactivate category'
                              : 'Reactivate category'
                          }
                          className={`h-8 text-xs font-semibold gap-1 px-2.5 ${
                            cat.is_active
                              ? 'text-danger hover:bg-danger/10 hover:text-danger'
                              : 'text-success hover:bg-success/10 hover:text-success'
                          }`}
                        >
                          {cat.is_active ? (
                            <>
                              <PowerOff className="size-3" />
                              <span className="hidden sm:inline">Deactivate</span>
                            </>
                          ) : (
                            <>
                              <Check className="size-3" />
                              <span className="hidden sm:inline">Activate</span>
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <CategoryFormSheet
        open={Boolean(selectedCategoryId)}
        onOpenChange={(open) => !open && onSelectCategory(null)}
        category={activeCategory}
        existingCategories={categories}
        onSave={async (categoryData) => {
          saveAdminCategory({
            ...activeCategory,
            ...categoryData,
            name: categoryData.name || 'New Category',
          })
          setVersion((v) => v + 1)
          onSelectCategory(null)
        }}
      />
    </div>
  )
}
