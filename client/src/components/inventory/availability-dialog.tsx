import { useCallback, useEffect, useState } from 'react'
import { ResponsiveDialog } from '@/components/ui/responsive-dialog'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { ConfirmDialog } from '@/components/account/confirm-dialog'
import { AvailabilityCalendar } from '@/components/detail/availability-calendar'
import { BlockForm } from './block-form'
import {
  addAvailabilityBlock,
  getAvailability,
  removeAvailabilityBlock,
} from '@/lib/api/equipment-store'
import type { AvailabilityBlock, AvailabilityReason } from '@/types/vendor'
import type { BlockedRange } from '@/types'
import { toast } from 'sonner'

interface AvailabilityDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  equipmentId: string | null
  equipmentName?: string
  totalStock?: number
  onBlockChange?: () => void
}

export function AvailabilityDialog({
  open,
  onOpenChange,
  equipmentId,
  equipmentName,
  totalStock = 4,
  onBlockChange,
}: AvailabilityDialogProps) {
  const [blocks, setBlocks] = useState<AvailabilityBlock[]>([])
  const [, setLoading] = useState(true)
  const [blockToDelete, setBlockToDelete] = useState<AvailabilityBlock | null>(null)

  const loadData = useCallback(() => {
    if (!equipmentId) return
    setLoading(true)
    try {
      const avail = getAvailability(equipmentId)
      if (avail) {
        setBlocks(avail.blocks)
      }
    } finally {
      setLoading(false)
    }
  }, [equipmentId])

  useEffect(() => {
    if (open && equipmentId) {
      loadData()
    }
  }, [open, equipmentId, loadData])

  const handleAddBlock = async (newBlock: {
    start_date: string
    end_date: string
    reason: AvailabilityReason
    units: number
  }) => {
    if (!equipmentId) return
    addAvailabilityBlock(equipmentId, newBlock)
    toast.success('Availability block added.')
    loadData()
    onBlockChange?.()
  }

  const handleConfirmDeleteBlock = () => {
    if (!equipmentId || !blockToDelete) return
    removeAvailabilityBlock(equipmentId, blockToDelete.block_id || blockToDelete.id)
    toast.success('Availability block removed.')
    setBlockToDelete(null)
    loadData()
    onBlockChange?.()
  }

  // Map blocks to BlockedRange format expected by AvailabilityCalendar
  const calendarBlockedRanges: BlockedRange[] = blocks.map((b) => ({
    start_date: b.start_date,
    end_date: b.end_date,
    quantity_blocked: b.units ?? b.quantity ?? 1,
    reason: b.reason === 'booked' ? 'booked' : 'vendor_blocked',
  }))

  const getReasonChip = (reason: AvailabilityReason) => {
    switch (reason) {
      case 'booked':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-info/10 text-info border border-info/20">
            <Icon name="check" size={12} />
            <span>Customer booking</span>
          </span>
        )
      case 'maintenance':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-warning/10 text-warning border border-warning/20">
            <Icon name="package" size={12} />
            <span>Maintenance</span>
          </span>
        )
      case 'vendor_blocked':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
            <span>Vendor blocked</span>
          </span>
        )
    }
  }

  return (
    <>
      <ResponsiveDialog
        open={open}
        onOpenChange={onOpenChange}
        fullScreenMobile={true}
        overlayId="availability-dialog"
        title={equipmentName || 'Equipment Availability'}
        description={`Total inventory: ${totalStock} units. Customer bookings are read-only.`}
        className="sm:max-w-4xl"
      >
        <div className="space-y-6">
          {/* Availability Calendar visualization */}
          <div className="p-4 rounded-xl border border-border bg-background space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground">
              Calendar View (Next 90 Days)
            </h4>
            <AvailabilityCalendar
              blockedRanges={calendarBlockedRanges}
              totalStock={totalStock}
              onSelectRange={() => {}}
            />
          </div>

          {/* Add Block Form */}
          {equipmentId && (
            <BlockForm
              equipmentId={equipmentId}
              totalStock={totalStock}
              onAddBlock={handleAddBlock}
            />
          )}

          {/* Existing Allocation Blocks List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-muted-foreground">
                Active Allocations & Blocks ({blocks.length})
              </h4>
            </div>

            {blocks.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-xs rounded-xl border border-dashed border-border">
                <Icon name="calendar" size={24} className="mx-auto opacity-40 mb-1" />
                <p>All {totalStock} units are currently open for booking across all future dates.</p>
              </div>
            ) : (
              <div className="rounded-xl border border-border divide-y divide-border/60 overflow-hidden bg-background text-xs">
                {blocks.map((block) => {
                  const isSystemBooked = block.reason === 'booked'

                  return (
                    <div
                      key={block.block_id || block.id}
                      className="p-3 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {getReasonChip(block.reason)}
                        <div className="min-w-0">
                          <span className="font-semibold text-foreground block truncate">
                            {block.start_date} → {block.end_date}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {(block.units ?? block.quantity ?? 1)} unit{(block.units ?? block.quantity ?? 1) > 1 ? 's' : ''} blocked
                            {block.order_number ? ` · Order #${block.order_number}` : ''}
                            {block.note ? ` · ${block.note}` : ''}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isSystemBooked ? (
                          <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                            System managed
                          </span>
                        ) : (
                          <Button
                            variant="ghost"
                            onClick={() => setBlockToDelete(block)}
                            className="min-w-[44px] min-h-[44px] p-2 text-danger hover:text-danger hover:bg-danger/10 inline-flex items-center justify-center cursor-pointer"
                            aria-label={`Remove block from ${block.start_date}`}
                          >
                            <Icon name="trash" size={16} />
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </ResponsiveDialog>

      {/* Confirmation Dialog for Block Removal */}
      <ConfirmDialog
        open={Boolean(blockToDelete)}
        onOpenChange={(open) => !open && setBlockToDelete(null)}
        title="Remove availability block?"
        description={`This will release ${blockToDelete?.units} blocked unit(s) from ${blockToDelete?.start_date} to ${blockToDelete?.end_date}, making them available for customer checkout.`}
        confirmLabel="Remove block"
        cancelLabel="Keep block"
        variant="danger"
        onConfirm={handleConfirmDeleteBlock}
      />
    </>
  )
}
