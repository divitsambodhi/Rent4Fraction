import { useEffect, useMemo, useState } from 'react'
import { AppLink, useAppSearchParams } from '@/components/shared/app-link'
import { EquipmentCard } from '@/components/shared/equipment-card'
import { DateRangePicker } from '@/components/catalog/date-range-picker'
import { EmptyState } from '@/components/shared/empty-state'
import { Button } from '@/components/ui/button'
import { useWishlist } from '@/providers/wishlist-provider'
import { getWishlist } from '@/lib/api/cart'
import { getEquipmentDetail, getEquipmentAvailability } from '@/lib/api/equipment-detail'

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
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

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

  // Fetch wishlist items from server or fallback per-item
  useEffect(() => {
    let active = true

    async function loadWishlist() {
      if (wishlist.length === 0) {
        setItems([])
        return
      }

      setLoading(true)
      try {
        const serverData = await getWishlist({
          sort: sort === 'rating' ? 'newest' : sort,
          from,
          to,
        })

        if (!active) return

        if (Array.isArray(serverData) && serverData.length > 0) {
          const mapped = serverData.map((item) => ({
            ...item,
            availableQuantity: item.available_quantity ?? item.quantity,
            isArchived: item.is_archived ?? false,
          }))
          setItems(mapped)
          setLoading(false)
          return
        }

        // Fallback: If guest or server returned empty, fetch details individually
        const details = await Promise.all(
          wishlist.map(async (id) => {
            try {
              const [detail, avail] = await Promise.all([
                getEquipmentDetail(id),
                getEquipmentAvailability(id, from, to),
              ])
              return {
                ...detail,
                availableQuantity: avail.available_quantity,
                isArchived: detail.status === 'archived' || detail.status === 'inactive',
              }
            } catch {
              return null
            }
          })
        )

        if (!active) return
        setItems(details.filter(Boolean))
      } catch (err) {
        console.error('Failed to load wishlist items', err)
      } finally {
        if (active) setLoading(false)
      }
    }

    loadWishlist()

    return () => {
      active = false
    }
  }, [wishlist, from, to, sort])

  // Filter and sort items
  const resolvedItems = useMemo(() => {
    let list = items.filter((item) => wishlist.includes(String(item.equipment_id)))

    if (availableOnly) {
      list = list.filter((item) => (item.availableQuantity ?? item.quantity) > 0 && !item.isArchived)
    }

    const sorted = [...list]
    if (sort === 'price_asc') {
      sorted.sort((a, b) => a.price_per_day - b.price_per_day)
    } else if (sort === 'price_desc') {
      sorted.sort((a, b) => b.price_per_day - a.price_per_day)
    } else if (sort === 'rating') {
      sorted.sort((a, b) => (b.avg_rating || 0) - (a.avg_rating || 0))
    }

    return sorted
  }, [items, wishlist, availableOnly, sort])

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
      ) : resolvedItems.length === 0 && !loading ? (
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
