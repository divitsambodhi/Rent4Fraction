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
  checkCanArchiveEquipment,
  duplicateInventoryItem,
  getAllStoredEquipment,
  getInventoryItemById,
  queryInventory,
  saveInventoryItem,
  setInventoryItemStatuses,
} from '@/lib/api/equipment-store'
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

  // Query inventory
  const { items: inventoryItems, total: totalCount } = queryInventory(
    {
      q: qParam,
      status: statusParam,
      category: categoryParam,
      stock: stockParam === 'low' ? 'low' : 'all',
      sort: resolvedSort,
      page: pageParam,
      pageSize: 10,
    },
    '1',
  )

  // All items for stats strip
  const allVendorItems = getAllStoredEquipment().filter(
    (e) => e.vendor_id === '1' && e.status !== 'archived',
  )
  const stats = {
    total: allVendorItems.length,
    active: allVendorItems.filter((i) => i.status === 'active').length,
    lowStock: allVendorItems.filter((i) => i.quantity > 0 && i.quantity <= 2).length,
    outOfStock: allVendorItems.filter((i) => i.quantity === 0).length,
  }

  // Status counts for pills
  const statusCounts = {
    all: allVendorItems.length,
    active: allVendorItems.filter((i) => i.status === 'active').length,
    inactive: allVendorItems.filter((i) => i.status === 'inactive').length,
    out_of_stock: allVendorItems.filter((i) => i.quantity === 0).length,
    archived: getAllStoredEquipment().filter((e) => e.vendor_id === '1' && e.status === 'archived').length,
  }

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

  // Open item for edit or check bad ID
  const itemToEdit = equipmentParam && equipmentParam !== 'new'
    ? getInventoryItemById(equipmentParam)
    : null

  // If bad ID provided, clear it
  useEffect(() => {
    if (equipmentParam && equipmentParam !== 'new' && !itemToEdit) {
      updateParams({ equipment: null })
      toast.error('Requested equipment could not be found.')
    }
  }, [equipmentParam, itemToEdit, updateParams])

  // Availability target item
  const availabilityItem = availabilityParam ? getInventoryItemById(availabilityParam) : null

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
  const handleToggleStatus = (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'inactive' : 'active'
    setInventoryItemStatuses([id], nextStatus as EquipmentStatus)

    if (nextStatus === 'inactive') {
      toast("Listing deactivated. Deactivating it won't cancel existing bookings.", {
        action: {
          label: 'Undo',
          onClick: () => setInventoryItemStatuses([id], 'active'),
        },
      })
    } else {
      toast.success('Listing activated.')
    }
  }

  const handleArchive = (id: string) => {
    const canArchive = checkCanArchiveEquipment(id)
    if (!canArchive) {
      toast.error('This equipment has active or upcoming rentals and cannot be archived.')
      return
    }
    setInventoryItemStatuses([id], 'archived')
    toast('Equipment archived.', {
      action: {
        label: 'Undo',
        onClick: () => setInventoryItemStatuses([id], 'active'),
      },
    })
  }

  // Bulk Actions
  const handleBulkActivate = async () => {
    setInventoryItemStatuses(selectedIds, 'active')
    toast.success(`Activated ${selectedIds.length} listings.`)
    setSelectedIds([])
  }

  const handleBulkDeactivate = async () => {
    setInventoryItemStatuses(selectedIds, 'inactive')
    toast(`Deactivated ${selectedIds.length} listings. Deactivating them won't cancel existing bookings.`, {
      action: {
        label: 'Undo',
        onClick: () => setInventoryItemStatuses(selectedIds, 'active'),
      },
    })
    setSelectedIds([])
  }

  const handleBulkArchive = async () => {
    // Check all selected items
    const blockedItems = selectedIds.filter((id) => !checkCanArchiveEquipment(id))
    if (blockedItems.length > 0) {
      toast.error(`${blockedItems.length} item(s) have active bookings and cannot be archived.`)
      return
    }

    setInventoryItemStatuses(selectedIds, 'archived')
    toast(`Archived ${selectedIds.length} listings.`, {
      action: {
        label: 'Undo',
        onClick: () => setInventoryItemStatuses(selectedIds, 'active'),
      },
    })
    setSelectedIds([])
  }

  // Duplicate equipment
  const handleDuplicate = (id: string) => {
    const cloned = duplicateInventoryItem(id)
    if (cloned) {
      toast.success(`Created duplicate "${cloned.name}".`)
    }
  }

  // Save equipment from sheet
  const handleSaveEquipment = async (data: Partial<InventoryItem>, andAddAnother = false) => {
    saveInventoryItem(data, '1')
    toast.success(equipmentParam === 'new' ? 'Equipment listing created.' : 'Equipment listing saved.')
    const next = new URLSearchParams(searchParams)
    if (andAddAnother) {
      next.set('equipment', 'new')
    } else {
      next.delete('equipment')
    }
    setSearchParams(next)
  }

  const businessName = user?.vendor?.business_name || 'Sargam Sound Systems'
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
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
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
