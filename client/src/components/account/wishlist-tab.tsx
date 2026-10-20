import { useMemo, useState } from 'react'
import { AppLink, useAppSearchParams } from '@/components/shared/app-link'
import { EquipmentCard } from '@/components/shared/equipment-card'
import { DateRangePicker } from '@/components/catalog/date-range-picker'
import { EmptyState } from '@/components/shared/empty-state'
import { Button } from '@/components/ui/button'
import { useWishlist } from '@/providers/wishlist-provider'
import { MOCK_EQUIPMENT } from '@/lib/api/mock-data'
import { computeMockAvailability } from '@/lib/api'
import { Heart, Trash2, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { parseISO } from 'date-fns'

type SortOption = 'added' | 'price_asc' | 'price_desc' | 'rating'

export function WishlistTab() {
  const { wishlist, toggleWishlist } = useWishlist()
  const [searchParams, setSearchParams] = useAppSearchParams()

  const sort = (searchParams.get('sort') || 'added') as SortOption
  const from = searchParams.get('from') || undefined
  const to = searchParams.get('to') || undefined

  const [availableOnly, setAvailableOnly] = useState(false)

  // Calculate rental days if dates chosen
  const rentalDays = useMemo(() => {
    if (!from || !to) return undefined
    try {
      const s = parseISO(from)
      const e = parseISO(to)
      return Math.round((e.getTime() - s.getTime()) / 86400000) + 1
    } catch {
      return undefined
    }
  }, [from, to])

  const updateQuery = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams)
    Object.entries(updates).forEach(([key, val]) => {
      if (val === null || val === '') {
        next.delete(key)
      } else {
        next.set(key, val)
      }
    })
    setSearchParams(next, { replace: true })
  }

  // Handle removing with Undo toast
  const handleRemoveWithUndo = (id: string, name: string) => {
    toggleWishlist(id)
    toast(`Removed ${name} from saved equipment`, {
      action: {
        label: 'Undo',
        onClick: () => toggleWishlist(id),
      },
    })
  }

  // Filter and sort items from shared dataset
  const resolvedItems = useMemo(() => {
    // Look up items from MOCK_EQUIPMENT
    const items = MOCK_EQUIPMENT.filter((eq) => wishlist.includes(eq.equipment_id)).map(
      (eq) => {
        const avail = computeMockAvailability(eq.equipment_id, from, to)
        // Simulate item 12 ('eq_tent_pagoda_12') as archived/inactive if present
        const isArchived = eq.equipment_id === 'eq_tent_pagoda_12'
        return {
          ...eq,
          availableQuantity: isArchived ? 0 : avail,
          isArchived,
        }
      }
    )

    let filtered = items
    if (from && to && availableOnly) {
      filtered = filtered.filter((i) => !i.isArchived && (i.availableQuantity ?? 1) > 0)
    }

    if (sort === 'price_asc') {
      filtered.sort((a, b) => a.price_per_day - b.price_per_day)
    } else if (sort === 'price_desc') {
      filtered.sort((a, b) => b.price_per_day - a.price_per_day)
    } else if (sort === 'rating') {
      filtered.sort((a, b) => b.avg_rating - a.avg_rating)
    }

    return filtered
  }, [wishlist, from, to, availableOnly, sort])

  return (
    <div className="space-y-6">
      {/* Header and Controls Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h2 className="text-xl font-serif font-bold text-foreground">
            Saved equipment ({wishlist.length})
          </h2>
          <p className="text-xs text-muted-foreground">
            Check availability and totals for your event dates.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* DateRangePicker */}
          <DateRangePicker
            from={from}
            to={to}
            onChange={(range) => {
              updateQuery({ from: range.from || null, to: range.to || null })
            }}
            placeholder="Event dates for live pricing"
            className="w-full sm:w-auto"
          />

          {/* Only show available toggle switch (shown when dates are set) */}
          {from && to && (
            <label className="inline-flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer select-none px-3 py-2 rounded-lg bg-muted/40 border border-border">
              <input
                type="checkbox"
                checked={availableOnly}
                onChange={(e) => setAvailableOnly(e.target.checked)}
                className="rounded border-border text-brand focus:ring-brand size-3.5"
              />
              <span>Only show available</span>
            </label>
          )}

          {/* Sort Select */}
          <select
            value={sort}
            onChange={(e) => updateQuery({ sort: e.target.value === 'added' ? null : e.target.value })}
            className="h-10 px-3 rounded-[8px] border border-border bg-surface text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-brand font-medium"
            aria-label="Sort saved equipment"
          >
            <option value="added">Recently added</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="rating">Highest rated</option>
          </select>
        </div>
      </div>

      {/* Grid or Empty State */}
      {wishlist.length === 0 ? (
        <EmptyState
          icon={<Heart className="size-7" />}
          title="No saved equipment"
          description="Click the heart on any equipment in our catalog to save it for your next event."
          actionLabel="Browse equipment"
          actionHref="/equipment"
        />
      ) : resolvedItems.length === 0 ? (
        <EmptyState
          icon={<Heart className="size-7" />}
          title="No available items for these dates"
          description="All of your saved items are fully booked for the selected dates. Try another date window or uncheck 'Only show available'."
          actionLabel="Clear dates"
          onAction={() => updateQuery({ from: null, to: null })}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {resolvedItems.map((item) => {
            const detailUrl = from && to
              ? `/equipment/${item.equipment_id}?from=${from}&to=${to}`
              : `/equipment/${item.equipment_id}`

            return (
              <div key={item.equipment_id} className="flex flex-col space-y-2">
                {item.isArchived ? (
                  /* Dimmed inactive / archived item card */
                  <div className="p-4 rounded-[12px] bg-muted/40 border border-dashed border-border opacity-65 flex flex-col justify-between h-full space-y-3">
                    <div className="space-y-1">
                      <div className="text-[11px] font-bold text-danger uppercase tracking-wider">
                        No longer available
                      </div>
                      <h3 className="font-serif font-bold text-sm text-foreground">
                        {item.name}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        This item has been archived or unlisted by the vendor partner.
                      </p>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveWithUndo(item.equipment_id, item.name)}
                      className="w-full text-xs text-danger hover:bg-danger/10 gap-1.5"
                    >
                      <Trash2 className="size-3.5" />
                      <span>Remove</span>
                    </Button>
                  </div>
                ) : (
                  <>
                    <EquipmentCard
                      equipment={item}
                      availableQuantity={item.availableQuantity}
                      rentalDays={rentalDays}
                    />

                    {/* Outline 'View and book' button carrying from/to */}
                    <AppLink to={detailUrl} className="w-full">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full h-9.5 text-xs font-semibold gap-1.5 text-foreground hover:text-brand hover:border-brand/40"
                      >
                        <span>View and book</span>
                        <ArrowRight className="size-3.5" />
                      </Button>
                    </AppLink>
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
