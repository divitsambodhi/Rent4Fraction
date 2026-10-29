import { useCallback, useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/providers/auth-provider'
import { usePageTitle } from '@/hooks/use-page-title'
import { useAppSearchParams } from '@/components/shared/app-link'
import { VendorShell } from '@/components/vendor/vendor-shell'
import { Button } from '@/components/ui/button'
import { InventoryStats } from '@/components/inventory/inventory-stats'
import { InventoryToolbar } from '@/components/inventory/inventory-toolbar'
import { InventoryTable } from '@/components/inventory/inventory-table'
import { BulkActionBar } from '@/components/inventory/bulk-action-bar'
import { EquipmentFormSheet } from '@/components/inventory/equipment-form-sheet'
import { AvailabilityDialog } from '@/components/inventory/availability-dialog'
import {
  duplicateInventoryItem,
  fetchVendorInventory,
  getInventoryItemById,
  saveInventoryItem,
  setInventoryItemStatuses,
} from '@/lib/api/inventory'
import { getCategoryTree } from '@/lib/api'
import type { EquipmentStatus, InventoryItem, VendorApprovalStatus } from '@/types/vendor'

export function InventoryPage() {
  usePageTitle('Inventory | Vendor Portal')
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useAppSearchParams()

  const qParam = searchParams.get('q') || ''
  const statusParam = (searchParams.get('status') as EquipmentStatus | 'all') || 'all'
  const categoryParam = searchParams.get('category') || 'all'
  const stockParam = searchParams.get('stock') || 'all'
  const sortParam = searchParams.get('sort') || 'updated'
  const pageParam = parseInt(searchParams.get('page') || '1', 10)

  // Sheet & Dialog params
  const equipmentParam = searchParams.get('equipment') // 'new' | id | null
  const availabilityParam = searchParams.get('availability') // id | null

  // Selection state for bulk actions
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // Categories list
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])

  // Load category tree
  useEffect(() => {
    getCategoryTree().then((groups) => {
      const flat = groups.flatMap((g) => g.categories.map((c) => ({ id: c.id, name: c.name })))
      setCategories(flat)
    })
  }, [])

  const validSorts = ['updated', 'name', 'price', 'stock', 'rating'] as const
  type SortOption = typeof validSorts[number]
  const resolvedSort: SortOption = validSorts.includes(sortParam as SortOption)
    ? (sortParam as SortOption)
    : 'updated'

  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [stats, setStats] = useState({ total: 0, active: 0, lowStock: 0, outOfStock: 0 })
  const [statusCounts, setStatusCounts] = useState({
    all: 0,
    active: 0,
    inactive: 0,
    out_of_stock: 0,
    archived: 0,
  })
  const [itemToEdit, setItemToEdit] = useState<InventoryItem | null>(null)
  const [availabilityItem, setAvailabilityItem] = useState<InventoryItem | null>(null)
  const [refreshIndex, setRefreshIndex] = useState(0)

  // Fetch real inventory from backend
  useEffect(() => {
    let active = true
    fetchVendorInventory({
      q: qParam || undefined,
      status: statusParam !== 'all' ? statusParam : undefined,
      category_id: categoryParam !== 'all' ? parseInt(categoryParam, 10) : undefined,
      stock: stockParam === 'low' ? 'low' : undefined,
      sort: resolvedSort,
      page: pageParam,
      pageSize: 10,
    }).then((res) => {
      if (!active) return
      setInventoryItems(res.items || [])
      setTotalCount(res.total || 0)
      if (res.stats) {
        setStats({
          total: res.stats.total || 0,
          active: res.stats.active || 0,
          lowStock: res.stats.low_stock || 0,
          outOfStock: res.stats.out_of_stock || 0,
        })
        setStatusCounts({
          all: res.stats.total || 0,
          active: res.stats.active || 0,
          inactive: res.stats.inactive || 0,
          out_of_stock: res.stats.out_of_stock || 0,
          archived: res.stats.archived || 0,
        })
      }
    })
    return () => {
      active = false
    }
  }, [qParam, statusParam, categoryParam, stockParam, resolvedSort, pageParam, refreshIndex])

  // Load item for editing
  useEffect(() => {
    if (!equipmentParam || equipmentParam === 'new') {
      setItemToEdit(null)
      return
    }
    const found = inventoryItems.find((i) => i.id === equipmentParam || i.equipment_id === equipmentParam)
    if (found) {
      setItemToEdit(found)
    } else {
      getInventoryItemById(equipmentParam).then((item) => {
        setItemToEdit(item)
      })
    }
  }, [equipmentParam, inventoryItems])

  // Load item for availability dialog
  useEffect(() => {
    if (!availabilityParam) {
      setAvailabilityItem(null)
      return
    }
    const found = inventoryItems.find((i) => i.id === availabilityParam || i.equipment_id === availabilityParam)
    if (found) {
      setAvailabilityItem(found)
    } else {
      getInventoryItemById(availabilityParam).then((item) => {
        setAvailabilityItem(item)
      })
    }
  }, [availabilityParam, inventoryItems])

  // URL State Helpers
  const updateParams = useCallback((updates: Record<string, string | null>, pushHistory = false) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      Object.entries(updates).forEach(([key, val]) => {
        if (val === null || val === '') {
          next.delete(key)
        } else {
          next.set(key, val)
        }
      })
      return next
    }, { replace: !pushHistory })
  }, [setSearchParams])

  // If bad ID provided, clear it
  useEffect(() => {
    if (equipmentParam && equipmentParam !== 'new' && !itemToEdit) {
      // Only clear if not loading
    }
  }, [equipmentParam, itemToEdit])

  // Selection handlers
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  const handleToggleSelectAll = () => {
    const pageIds: string[] = inventoryItems.map((i) => i.id || i.equipment_id)
    const allSelected = pageIds.every((id) => selectedIds.includes(id))
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)))
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])))
    }
  }

  // Status changes & archiving with rules
  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'inactive' : 'active'
    await setInventoryItemStatuses([id], nextStatus as EquipmentStatus)
    setRefreshIndex((r) => r + 1)

    if (nextStatus === 'inactive') {
      toast("Listing deactivated. Deactivating it won't cancel existing bookings.")
    } else {
      toast.success('Listing activated.')
    }
  }

  const handleArchive = async (id: string) => {
    try {
      await setInventoryItemStatuses([id], 'archived')
      setRefreshIndex((r) => r + 1)
      toast.success('Equipment archived.')
    } catch {
      toast.error('This equipment has active or upcoming rentals and cannot be archived.')
    }
  }

  // Bulk Actions
  const handleBulkActivate = async () => {
    await setInventoryItemStatuses(selectedIds, 'active')
    toast.success(`Activated ${selectedIds.length} listings.`)
    setSelectedIds([])
    setRefreshIndex((r) => r + 1)
  }

  const handleBulkDeactivate = async () => {
    await setInventoryItemStatuses(selectedIds, 'inactive')
    toast(`Deactivated ${selectedIds.length} listings.`)
    setSelectedIds([])
    setRefreshIndex((r) => r + 1)
  }

  const handleBulkArchive = async () => {
    try {
      await setInventoryItemStatuses(selectedIds, 'archived')
      toast(`Archived ${selectedIds.length} listings.`)
      setSelectedIds([])
      setRefreshIndex((r) => r + 1)
    } catch {
      toast.error('Some selected equipment has active bookings and cannot be archived.')
    }
  }

  // Duplicate equipment
  const handleDuplicate = async (id: string) => {
    try {
      const cloned = await duplicateInventoryItem(id)
      if (cloned) {
        toast.success(`Created duplicate "${cloned.name}".`)
        setRefreshIndex((r) => r + 1)
      }
    } catch {
      toast.error('Failed to duplicate equipment.')
    }
  }

  // Save equipment from sheet
  const handleSaveEquipment = async (data: Partial<InventoryItem>, andAddAnother = false) => {
    try {
      await saveInventoryItem(data)
      toast.success(equipmentParam === 'new' ? 'Equipment listing created.' : 'Equipment listing saved.')
      setRefreshIndex((r) => r + 1)
      const next = new URLSearchParams(searchParams)
      if (andAddAnother) {
        next.set('equipment', 'new')
      } else {
        next.delete('equipment')
      }
      setSearchParams(next)
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save equipment listing.')
    }
  }

  const businessName = user?.vendor?.business_name || 'My Storefront'
  const approvalStatus: VendorApprovalStatus = user?.vendor?.approval_status || 'approved'

  return (
    <VendorShell
      businessName={businessName}
      approvalStatus={approvalStatus}
      activeTitle="Inventory"
      subtitle="Manage catalogue availability, rental pricing, and specifications"
    >
      <div className="space-y-6">
        {/* Header with "Add equipment" CTA */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              Equipment Catalogue
            </p>
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-foreground">
              Inventory & Availability
            </h2>
          </div>

          <Button
            onClick={() => updateParams({ equipment: 'new' }, true)}
            className="bg-brand hover:bg-brand-hover text-white text-xs gap-1.5 h-9"
          >
            <Plus className="size-4" />
            <span>Add equipment</span>
          </Button>
        </div>

        {/* Stats Strip */}
        <InventoryStats
          total={stats.total}
          active={stats.active}
          lowStock={stats.lowStock}
          outOfStock={stats.outOfStock}
        />

        {/* Filter Toolbar */}
        <InventoryToolbar
          searchQuery={qParam}
          onSearchChange={(q) => updateParams({ q: q || null, page: '1' })}
          status={statusParam}
          onStatusChange={(s) => updateParams({ status: s === 'all' ? null : s, page: '1' })}
          statusCounts={statusCounts}
          categoryId={categoryParam}
          onCategoryChange={(c) => updateParams({ category: c === 'all' ? null : c, page: '1' })}
          categories={categories}
          lowStockOnly={stockParam === 'low'}
          onLowStockChange={(low) => updateParams({ stock: low ? 'low' : null, page: '1' })}
          sortBy={sortParam}
          onSortChange={(s) => updateParams({ sort: s, page: '1' })}
        />

        {/* Inventory Table */}
        <InventoryTable
          items={inventoryItems}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
          onToggleSelectAll={handleToggleSelectAll}
          totalCount={totalCount}
          currentPage={pageParam}
          pageSize={10}
          onPageChange={(p) => updateParams({ page: String(p) })}
          onEditEquipment={(id) => updateParams({ equipment: id }, true)}
          onManageAvailability={(id) => updateParams({ availability: id }, true)}
          onDuplicateEquipment={handleDuplicate}
          onToggleStatus={handleToggleStatus}
          onArchiveEquipment={handleArchive}
          onClearFilters={() =>
            updateParams({ q: null, status: null, category: null, stock: null, page: '1' })
          }
        />

        {/* Bulk Action Bar */}
        <BulkActionBar
          selectedCount={selectedIds.length}
          onClearSelection={() => setSelectedIds([])}
          onBulkActivate={handleBulkActivate}
          onBulkDeactivate={handleBulkDeactivate}
          onBulkArchive={handleBulkArchive}
        />

        {/* Equipment Form Sheet */}
        <EquipmentFormSheet
          open={Boolean(equipmentParam)}
          onOpenChange={(open) => {
            if (!open) updateParams({ equipment: null })
          }}
          equipmentId={equipmentParam}
          initialItem={itemToEdit}
          categories={categories}
          onSave={handleSaveEquipment}
        />

        {/* Availability Dialog */}
        <AvailabilityDialog
          open={Boolean(availabilityParam && availabilityItem)}
          onOpenChange={(open) => {
            if (!open) updateParams({ availability: null })
          }}
          equipmentId={availabilityParam}
          equipmentName={availabilityItem?.name}
          totalStock={availabilityItem?.stock}
        />
      </div>
    </VendorShell>
  )
}
