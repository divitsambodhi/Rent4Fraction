import { useState, useMemo } from 'react'
import {
  Search,
  X,
  Package,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  EntitySheet,
} from '@/components/shared/entity-sheet'
import { getAllStoredEquipment, updateEquipmentCommissionRate } from '@/lib/api/equipment-store'
import { getAdminCategories } from '@/lib/api/admin-store'
import { getStoredVendorProfiles } from '@/lib/api/vendor-store'
import { resolveCommission, type CommissionSource } from '@/lib/pricing'
import { formatINR } from '@/lib/format'
import type { InventoryItem } from '@/types'
import { toast } from 'sonner'

export function EquipmentSection() {
  const [items, setItems] = useState<InventoryItem[]>(() => getAllStoredEquipment())
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'out_of_stock' | 'archived'>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [sourceFilter, setSourceFilter] = useState<'all' | CommissionSource>('all')

  // Edit sheet state
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  const [overrideInput, setOverrideInput] = useState<string>('')

  const categories = useMemo(() => getAdminCategories(), [])
  const vendorProfiles = useMemo(() => getStoredVendorProfiles(), [])

  // Resolve effective commission for all items
  const itemsWithCommission = useMemo(() => {
    return items.map((item) => {
      const cat = categories.find((c) => c.id === item.category_id || c.name === item.category_name)
      const vendor = vendorProfiles[item.vendor_id]
      const resolved = resolveCommission(item, cat, vendor)
      return {
        ...item,
        effectiveCommission: resolved.rate,
        commissionSource: resolved.source,
      }
    })
  }, [items, categories, vendorProfiles])

  // Filtered list
  const filtered = useMemo(() => {
    return itemsWithCommission.filter((it) => {
      if (search.trim()) {
        const q = search.toLowerCase().trim()
        const match =
          it.name.toLowerCase().includes(q) ||
          it.vendor_name.toLowerCase().includes(q) ||
          it.category_name.toLowerCase().includes(q)
        if (!match) return false
      }

      if (statusFilter !== 'all' && it.status !== statusFilter) {
        return false
      }

      if (categoryFilter !== 'all' && it.category_id !== categoryFilter && it.category_name !== categoryFilter) {
        return false
      }

      if (sourceFilter !== 'all' && it.commissionSource !== sourceFilter) {
        return false
      }

      return true
    })
  }, [itemsWithCommission, search, statusFilter, categoryFilter, sourceFilter])

  const handleOpenEdit = (item: InventoryItem) => {
    setEditingItem(item)
    setOverrideInput(item.commission_rate !== null && item.commission_rate !== undefined ? String(item.commission_rate) : '')
  }

  // Live preview of effective rate for the item currently being edited
  const livePreview = useMemo(() => {
    if (!editingItem) return null
    const cat = categories.find((c) => c.id === editingItem.category_id || c.name === editingItem.category_name)
    const vendor = vendorProfiles[editingItem.vendor_id]

    const parsedRate = overrideInput.trim() !== '' && !isNaN(Number(overrideInput))
      ? Math.max(0, Math.min(100, parseFloat(overrideInput)))
      : null

    const mockItem = { ...editingItem, commission_rate: parsedRate }
    return resolveCommission(mockItem, cat, vendor)
  }, [editingItem, overrideInput, categories, vendorProfiles])

  const handleSaveCommission = () => {
    if (!editingItem) return

    const parsedRate = overrideInput.trim() !== '' && !isNaN(Number(overrideInput))
      ? Math.max(0, Math.min(100, parseFloat(overrideInput)))
      : null

    try {
      updateEquipmentCommissionRate(editingItem.equipment_id, parsedRate)
      setItems(getAllStoredEquipment())
      toast.success(
        parsedRate !== null
          ? `Commission override set to ${parsedRate}% for ${editingItem.name}`
          : `Commission override cleared for ${editingItem.name}. Now inherited from ${livePreview?.source || 'platform'}.`
      )
      setEditingItem(null)
    } catch {
      toast.error('Failed to update equipment commission rate.')
    }
  }

  const getSourceBadgeClass = (source: CommissionSource) => {
    switch (source) {
      case 'Equipment':
        return 'bg-brand/10 text-brand border-brand/20 font-semibold'
      case 'Category':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
      case 'Vendor':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
      case 'Platform':
      default:
        return 'bg-muted text-muted-foreground border-border'
    }
  }

  return (
    <div className="space-y-4">
      {/* Header & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h2 className="text-xl font-bold font-serif text-foreground">
            Equipment Commission Governance
          </h2>
          <p className="text-xs text-muted-foreground">
            Configure rates per item, manage overrides, and monitor effective platform margins.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs h-7 px-2.5 font-medium">
            {filtered.length} listings
          </Badge>
        </div>
      </div>

      {/* Scoped Filter Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
        {/* Scoped search input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter equipment by item, vendor, or category..."
            className="pl-9 pr-8 h-9 text-xs"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Status Pill Group (Radio semantics: clicking active keeps it selected) */}
        <div role="radiogroup" aria-label="Filter by status" className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {(['all', 'active', 'inactive', 'out_of_stock'] as const).map((st) => (
            <button
              key={st}
              role="radio"
              aria-checked={statusFilter === st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded-[6px] text-xs font-medium border transition-colors whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-foreground text-background border-foreground font-semibold'
                  : 'bg-surface text-muted-foreground border-border hover:text-foreground'
              }`}
            >
              {st === 'all' ? 'All statuses' : st.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        {/* Source Filter Group */}
        <div role="radiogroup" aria-label="Filter by commission source" className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {(['all', 'Equipment', 'Category', 'Vendor', 'Platform'] as const).map((src) => (
            <button
              key={src}
              role="radio"
              aria-checked={sourceFilter === src}
              onClick={() => setSourceFilter(src)}
              className={`px-2.5 py-1 rounded-[6px] text-xs font-medium border transition-colors whitespace-nowrap ${
                sourceFilter === src
                  ? 'bg-brand text-white border-brand font-semibold'
                  : 'bg-surface text-muted-foreground border-border hover:text-foreground'
              }`}
            >
              {src === 'all' ? 'All sources' : src}
            </button>
          ))}
        </div>

        {/* Category Filter */}
        <select
          value={categoryFilter}
          aria-label="Filter by category"
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="h-9 px-2 text-xs border border-border rounded-[6px] bg-surface text-foreground"
        >
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="border border-border rounded-xl bg-surface overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold">
                <th className="py-3 px-4">Equipment</th>
                <th className="py-3 px-4">Vendor</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Daily Rate</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Effective Commission</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <Package className="size-8 mx-auto mb-2 text-muted-foreground/40" />
                    <p className="font-medium text-sm">No equipment listings match the active filters</p>
                    <p className="text-xs text-muted-foreground/80 mt-1">
                      Try clearing or adjusting search filters to display catalog items.
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.equipment_id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-lg bg-muted/50 border border-border overflow-hidden shrink-0 flex items-center justify-center p-1">
                          <img
                            src={item.primary_image_url}
                            alt=""
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div>
                          <div className="font-semibold text-foreground line-clamp-1">
                            {item.name}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            ID: {item.equipment_id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-medium text-foreground">
                      {item.vendor_name}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {item.category_name}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-foreground tabular-nums">
                      {formatINR(item.price_per_day)}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider ${
                        item.status === 'active'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {item.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground tabular-nums text-xs">
                          {item.effectiveCommission}%
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] border ${getSourceBadgeClass(item.commissionSource)}`}>
                          {item.commissionSource}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenEdit(item)}
                        className="h-7 text-xs px-2.5 font-medium"
                      >
                        Edit rate
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Commission Sheet */}
      {editingItem && (
        <EntitySheet
          open={Boolean(editingItem)}
          onOpenChange={(open) => !open && setEditingItem(null)}
          eyebrow="COMMISSION GOVERNANCE"
          title={`Edit Commission · ${editingItem.name}`}
          subtitle={`Vendor: ${editingItem.vendor_name} · Category: ${editingItem.category_name}`}
          widthClass="sm:max-w-[480px]"
        >
          <div className="space-y-6 pt-2">
            {/* Live Effective Rate Card */}
            <div className="p-4 rounded-xl border border-border bg-surface/70 space-y-3">
              <div className="text-xs font-semibold text-foreground">Live Effective Rate Preview</div>
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-extrabold text-foreground tabular-nums">
                  {livePreview?.rate}%
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs border ${getSourceBadgeClass(livePreview?.source || 'Platform')}`}>
                  Source: {livePreview?.source}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {livePreview?.source === 'Equipment'
                  ? 'Specific override applied to this item.'
                  : livePreview?.source === 'Category'
                  ? `Inheriting category default for "${editingItem.category_name}".`
                  : livePreview?.source === 'Vendor'
                  ? `Inheriting vendor default rate for "${editingItem.vendor_name}".`
                  : 'Inheriting platform baseline default (10%).'}
              </p>
            </div>

            {/* Input field */}
            <div className="space-y-2">
              <label htmlFor="commission-input" className="text-xs font-semibold text-foreground">
                Equipment Commission Override (%)
              </label>
              <div className="relative">
                <Input
                  id="commission-input"
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={overrideInput}
                  onChange={(e) => setOverrideInput(e.target.value)}
                  placeholder="Leave empty to clear override and inherit"
                  className="pr-10 h-10 text-sm font-semibold"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-bold">
                  %
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Set a specific percentage (0 to 100) or clear this field to inherit from category, vendor, or platform.
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setOverrideInput('')}
                className="text-xs h-8"
              >
                Clear override
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setOverrideInput('12')}
                className="text-xs h-8"
              >
                Set 12%
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setOverrideInput('15')}
                className="text-xs h-8"
              >
                Set 15%
              </Button>
            </div>

            {/* Bottom Actions */}
            <div className="pt-6 border-t border-border flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditingItem(null)}
                className="text-xs h-9 px-4"
              >
                Cancel
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleSaveCommission}
                className="text-xs h-9 px-4 bg-brand hover:bg-brand-hover text-white font-semibold"
              >
                Save commission rate
              </Button>
            </div>
          </div>
        </EntitySheet>
      )}
    </div>
  )
}
