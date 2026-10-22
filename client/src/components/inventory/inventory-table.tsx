import { useState } from 'react'
import {
  Archive,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  MoreHorizontal,
  Package,
  Pencil,
  Power,
  PowerOff,
  Star,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { AppLink } from '@/components/shared/app-link'
import { ProductImage } from '@/components/shared/product-image'
import { StatusBadge } from '@/components/shared/status-badge'
import { ConfirmDialog } from '@/components/account/confirm-dialog'
import { resolveCommission } from '@/lib/pricing'
import { getAdminCategories } from '@/lib/api/admin-store'
import { getStoredVendorProfiles } from '@/lib/api/vendor-store'
import type { InventoryItem } from '@/types/vendor'
import { cn } from '@/lib/utils'

interface InventoryTableProps {
  items: InventoryItem[]
  selectedIds: string[]
  onToggleSelect: (id: string) => void
  onToggleSelectAll: () => void
  totalCount: number
  currentPage: number
  pageSize: number
  onPageChange: (page: number) => void
  onEditEquipment: (id: string) => void
  onManageAvailability: (id: string) => void
  onDuplicateEquipment: (id: string) => void
  onToggleStatus: (id: string, currentStatus: string) => void
  onArchiveEquipment: (id: string) => void
  onClearFilters: () => void
}

export function InventoryTable({
  items,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  totalCount,
  currentPage,
  pageSize,
  onPageChange,
  onEditEquipment,
  onManageAvailability,
  onDuplicateEquipment,
  onToggleStatus,
  onArchiveEquipment,
  onClearFilters,
}: InventoryTableProps) {
  const [itemToArchive, setItemToArchive] = useState<InventoryItem | null>(null)
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const allSelected = items.length > 0 && items.every((i) => selectedIds.includes(i.id))
  const categories = getAdminCategories()
  const vendorProfiles = getStoredVendorProfiles()

  const handleConfirmArchive = () => {
    if (itemToArchive) {
      onArchiveEquipment(itemToArchive.id)
      setItemToArchive(null)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <StatusBadge status="completed" label="Active" />
      case 'inactive':
        return <StatusBadge status="neutral" label="Inactive" />
      case 'out_of_stock':
        return <StatusBadge status="cancelled" label="Out of stock" />
      case 'archived':
        return <StatusBadge status="neutral" label="Archived" />
      default:
        return <StatusBadge status="neutral" label={status} />
    }
  }

  return (
    <div className="space-y-4">
      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface p-12 text-center text-muted-foreground space-y-3">
          <Package className="size-10 mx-auto opacity-40 mb-1" />
          <h3 className="font-serif text-lg font-bold text-foreground">
            No equipment matches your filters
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Try clearing your search keyword, category, or status selection to view more items.
          </p>
          <Button variant="outline" size="sm" onClick={onClearFilters} className="text-xs mt-2">
            Clear all filters
          </Button>
        </div>
      ) : (
        <>
          {/* Desktop Table View (>=768px) */}
          <div className="hidden md:block rounded-2xl border border-border bg-surface overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold">
                    <th className="py-3 px-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={onToggleSelectAll}
                        className="rounded border-border text-brand focus:ring-brand size-3.5"
                        aria-label="Select all equipment on this page"
                      />
                    </th>
                    <th className="py-3 px-3">Equipment</th>
                    <th className="py-3 px-3 text-right">Price/day</th>
                    <th className="py-3 px-3 text-right">Deposit</th>
                    <th className="py-3 px-3">Commission</th>
                    <th className="py-3 px-3">Stock</th>
                    <th className="py-3 px-3">Rating</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Updated</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {items.map((item) => {
                    const isSelected = selectedIds.includes(item.id)
                    const isLowStock = item.stock > 0 && item.stock <= 2
                    const isOutOfStock = item.stock === 0

                    return (
                      <tr
                        key={item.id}
                        className={cn(
                          'hover:bg-muted/30 transition-colors h-14',
                          isSelected && 'bg-brand/5',
                        )}
                      >
                        <td className="px-3 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => onToggleSelect(item.id)}
                            className="rounded border-border text-brand focus:ring-brand size-3.5"
                            aria-label={`Select ${item.name}`}
                          />
                        </td>

                        {/* Thumbnail (48px) + Name + Category */}
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="size-12 rounded-lg overflow-hidden border border-border shrink-0">
                              <ProductImage
                                src={item.image}
                                alt={item.name}
                                category={item.category}
                                aspectRatio="1/1"
                              />
                            </div>
                            <div className="min-w-0">
                              <button
                                type="button"
                                onClick={() => onEditEquipment(item.id)}
                                className="font-semibold text-foreground hover:text-brand transition-colors text-left truncate block max-w-[220px] cursor-pointer"
                              >
                                {item.name}
                              </button>
                              <span className="text-[11px] text-muted-foreground block truncate">
                                {item.category}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="px-3 py-2 text-right font-bold text-foreground tabular-nums">
                          ₹{item.price.toLocaleString('en-IN')}
                        </td>

                        <td className="px-3 py-2 text-right text-muted-foreground tabular-nums">
                          ₹{item.deposit.toLocaleString('en-IN')}
                        </td>

                        <td className="px-3 py-2 whitespace-nowrap">
                          {(() => {
                            const cat = categories.find((c) => c.id === item.category_id || c.name === item.category)
                            const vendor = vendorProfiles[item.vendor_id]
                            const resolved = resolveCommission(item, cat, vendor)
                            return (
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-foreground tabular-nums text-xs">
                                  {resolved.rate}%
                                </span>
                                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium border border-border bg-muted/60 text-muted-foreground">
                                  {resolved.source}
                                </span>
                              </div>
                            )
                          })()}
                        </td>

                        {/* Stock with Low / Out chips */}
                        <td className="px-3 py-2 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold tabular-nums text-foreground">
                              {item.stock}
                            </span>
                            {isOutOfStock ? (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-danger/10 text-danger border border-danger/20">
                                Out
                              </span>
                            ) : isLowStock ? (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-warning/10 text-warning border border-warning/20">
                                Low
                              </span>
                            ) : null}
                          </div>
                        </td>

                        {/* Rating with review count */}
                        <td className="px-3 py-2 whitespace-nowrap">
                          <div className="flex items-center gap-1 text-foreground font-medium">
                            <Star className="size-3.5 fill-amber-500 text-amber-500" />
                            <span className="tabular-nums">{item.rating.toFixed(1)}</span>
                            <span className="text-[11px] text-muted-foreground">({item.reviews})</span>
                          </div>
                        </td>

                        <td className="px-3 py-2 whitespace-nowrap">
                          {getStatusBadge(item.status)}
                        </td>

                        <td className="px-3 py-2 text-muted-foreground whitespace-nowrap text-xs">
                          {item.updated}
                        </td>

                        {/* Row Action Menu */}
                        <td className="px-3 py-2 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`Actions for ${item.name}`}
                              >
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 text-xs">
                              <DropdownMenuItem
                                onClick={() => onEditEquipment(item.id)}
                                className="gap-2 cursor-pointer"
                              >
                                <Pencil className="size-3.5" />
                                <span>Edit details</span>
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() => onManageAvailability(item.id)}
                                className="gap-2 cursor-pointer"
                              >
                                <CalendarDays className="size-3.5" />
                                <span>Manage availability</span>
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() => onDuplicateEquipment(item.id)}
                                className="gap-2 cursor-pointer"
                              >
                                <Copy className="size-3.5" />
                                <span>Duplicate listing</span>
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() => onToggleStatus(item.id, item.status)}
                                className="gap-2 cursor-pointer"
                              >
                                {item.status === 'active' ? (
                                  <>
                                    <PowerOff className="size-3.5 text-warning" />
                                    <span>Deactivate</span>
                                  </>
                                ) : (
                                  <>
                                    <Power className="size-3.5 text-success" />
                                    <span>Activate</span>
                                  </>
                                )}
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />

                              <DropdownMenuItem asChild>
                                <AppLink
                                  to={`/equipment/${item.id}?preview=1`}
                                  className="gap-2 cursor-pointer w-full flex items-center"
                                >
                                  <ExternalLink className="size-3.5" />
                                  <span>View public page</span>
                                </AppLink>
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() => setItemToArchive(item)}
                                className="gap-2 text-danger focus:text-danger cursor-pointer"
                              >
                                <Archive className="size-3.5" />
                                <span>Archive equipment</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card View (<768px) */}
          <div className="md:hidden space-y-3">
            {items.map((item) => {
              const isSelected = selectedIds.includes(item.id)
              const isLowStock = item.stock > 0 && item.stock <= 2
              const isOutOfStock = item.stock === 0

              return (
                <div
                  key={item.id}
                  className={cn(
                    'p-4 rounded-xl border border-border bg-surface space-y-3 transition-colors',
                    isSelected && 'border-brand/40 bg-brand/5',
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleSelect(item.id)}
                        className="rounded border-border text-brand focus:ring-brand size-4"
                        aria-label={`Select ${item.name}`}
                      />
                      <div className="size-12 rounded-lg overflow-hidden border border-border shrink-0">
                        <ProductImage
                          src={item.image}
                          alt={item.name}
                          category={item.category}
                          aspectRatio="1/1"
                        />
                      </div>
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={() => onEditEquipment(item.id)}
                          className="font-semibold text-foreground text-left text-xs truncate block max-w-[160px]"
                        >
                          {item.name}
                        </button>
                        <span className="text-[11px] text-muted-foreground block truncate">
                          {item.category}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {getStatusBadge(item.status)}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 text-xs">
                          <DropdownMenuItem onClick={() => onEditEquipment(item.id)}>
                            <Pencil className="size-3.5 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onManageAvailability(item.id)}>
                            <CalendarDays className="size-3.5 mr-2" /> Availability
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onDuplicateEquipment(item.id)}>
                            <Copy className="size-3.5 mr-2" /> Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onToggleStatus(item.id, item.status)}>
                            <Power className="size-3.5 mr-2" /> Toggle status
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild>
                            <AppLink to={`/equipment/${item.id}?preview=1`} className="flex items-center">
                              <ExternalLink className="size-3.5 mr-2" /> View page
                            </AppLink>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setItemToArchive(item)} className="text-danger">
                            <Archive className="size-3.5 mr-2" /> Archive
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2 py-2 border-y border-border/50 text-xs">
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Rate</span>
                      <span className="font-bold text-foreground tabular-nums">
                        ₹{item.price.toLocaleString('en-IN')}/d
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-muted-foreground block">Commission</span>
                      <span className="font-bold text-foreground tabular-nums">
                        {(() => {
                          const cat = categories.find((c) => c.id === item.category_id || c.name === item.category)
                          const vendor = vendorProfiles[item.vendor_id]
                          return resolveCommission(item, cat, vendor).rate
                        })()}%
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-muted-foreground block">Stock</span>
                      <span className="font-semibold tabular-nums text-foreground flex items-center gap-1">
                        {item.stock}
                        {isOutOfStock && <span className="text-[10px] text-danger font-bold">Out</span>}
                        {isLowStock && <span className="text-[10px] text-warning font-bold">Low</span>}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-muted-foreground block">Rating</span>
                      <span className="font-medium text-foreground tabular-nums inline-flex items-center gap-0.5">
                        <Star className="size-3 fill-amber-500 text-amber-500" />
                        {item.rating.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Pagination Controls (10 per page) */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-muted-foreground">
                Showing {Math.min((currentPage - 1) * pageSize + 1, totalCount)} to{' '}
                {Math.min(currentPage * pageSize, totalCount)} of {totalCount} items
              </span>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="h-8 px-2.5 gap-1 text-xs"
                >
                  <ChevronLeft className="size-3.5" />
                  <span>Previous</span>
                </Button>

                <span className="text-xs font-medium text-foreground px-2">
                  {currentPage} of {totalPages}
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  className="h-8 px-2.5 gap-1 text-xs"
                >
                  <span>Next</span>
                  <ChevronRight className="size-3.5" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Row Archive Confirm Dialog */}
      <ConfirmDialog
        open={Boolean(itemToArchive)}
        onOpenChange={(open) => !open && setItemToArchive(null)}
        title={`Archive "${itemToArchive?.name}"?`}
        description="Archiving removes this equipment permanently from the catalogue. Active or upcoming rentals will block archiving."
        confirmLabel="Archive"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleConfirmArchive}
      />
    </div>
  )
}
