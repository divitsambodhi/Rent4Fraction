import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from './confirm-dialog'
import { Check, Edit, MapPin, Trash2 } from 'lucide-react'
import type { Address } from '@/types/account'
import { cn } from '@/lib/utils'

interface AddressCardProps {
  address: Address
  onEdit: (address: Address) => void
  onSetDefault: (id: string) => void
  onDelete: (id: string) => void
  selectable?: boolean
  selected?: boolean
  onSelect?: () => void
  className?: string
}

export function AddressCard({
  address,
  onEdit,
  onSetDefault,
  onDelete,
  selectable = false,
  selected = false,
  onSelect,
  className,
}: AddressCardProps) {
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const isUsed = address.used_in_bookings > 0

  return (
    <div
      onClick={selectable ? onSelect : undefined}
      className={cn(
        'p-5 rounded-[16px] border bg-surface flex flex-col justify-between space-y-4 shadow-xs transition-all relative',
        selectable && 'cursor-pointer hover:border-brand/40',
        selected && 'border-brand ring-2 ring-brand/20 bg-brand/5',
        className
      )}
    >
      <div className="space-y-3">
        {/* Top Header: Label Chip, Default Badge, and Select Radio */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/80 px-2.5 py-0.5 rounded-full border border-border">
              <MapPin className="size-3" />
              <span>{address.label}</span>
            </span>

            {address.is_default && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-success bg-success/15 px-2.5 py-0.5 rounded-full border border-success/30">
                <Check className="size-3" />
                <span>Default</span>
              </span>
            )}
          </div>

          {selectable && (
            <div
              className={cn(
                'size-5 rounded-full border flex items-center justify-center transition-colors',
                selected ? 'bg-brand border-brand text-white' : 'border-border bg-surface'
              )}
            >
              {selected && <Check className="size-3 stroke-[3]" />}
            </div>
          )}
        </div>

        {/* Address Lines */}
        <div className="space-y-1">
          <h3 className="font-serif font-bold text-sm sm:text-base text-foreground">
            {address.name}
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {address.line1}
            {address.line2 && <><br />{address.line2}</>}
            <br />
            {address.city}, {address.state} – {address.pincode}
            <br />
            {address.country}
          </p>
        </div>

        {/* Used in bookings caption */}
        {isUsed && (
          <div className="text-[11px] text-muted-foreground/80 font-medium pt-1">
            Used in {address.used_in_bookings} {address.used_in_bookings === 1 ? 'booking' : 'bookings'}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {!selectable && (
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-border/70">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onEdit(address)}
              className="h-8 text-xs px-2.5 gap-1.5"
            >
              <Edit className="size-3" />
              <span>Edit</span>
            </Button>

            {!address.is_default && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onSetDefault(address.id)}
                className="h-8 text-xs text-muted-foreground hover:text-foreground"
              >
                Set as default
              </Button>
            )}
          </div>

          {/* Delete Button (blocked if used in bookings) */}
          <div
            title={
              isUsed
                ? "Used in bookings, so it can't be deleted"
                : 'Delete address'
            }
          >
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isUsed}
              onClick={() => setDeleteConfirmOpen(true)}
              className="h-8 px-2.5 text-xs text-danger hover:bg-danger/10 hover:text-danger disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Trash2 className="size-3.5" />
              <span className="sr-only">Delete address</span>
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirmOpen && (
        <ConfirmDialog
          open={deleteConfirmOpen}
          onOpenChange={setDeleteConfirmOpen}
          title="Delete Saved Address?"
          description={
            <span>
              Are you sure you want to delete the address for{' '}
              <strong className="text-foreground">{address.name}</strong> at{' '}
              {address.line1}? This action cannot be undone.
            </span>
          }
          confirmLabel="Delete address"
          variant="danger"
          onConfirm={() => {
            setDeleteConfirmOpen(false)
            onDelete(address.id)
          }}
        />
      )}
    </div>
  )
}
