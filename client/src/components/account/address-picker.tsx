import { Plus } from 'lucide-react'
import { AddressCard } from './address-card'
import type { Address } from '@/types/account'
import { cn } from '@/lib/utils'

interface AddressPickerProps {
  addresses: Address[]
  selectedId: string | null
  onSelect: (id: string) => void
  onAddNew: () => void
  className?: string
}

export function AddressPicker({
  addresses,
  selectedId,
  onSelect,
  onAddNew,
  className,
}: AddressPickerProps) {
  return (
    <div className={cn('space-y-3', className)}>
      <div role="radiogroup" aria-label="Select delivery address" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {addresses.map((addr) => (
          <AddressCard
            key={addr.id}
            address={addr}
            selectable
            selected={selectedId === addr.id}
            onSelect={() => onSelect(addr.id)}
            onEdit={() => {}}
            onSetDefault={() => {}}
            onDelete={() => {}}
          />
        ))}

        {/* Add New Address Card Button */}
        <button
          type="button"
          onClick={onAddNew}
          className="p-4 sm:p-6 rounded-[16px] border border-dashed border-border hover:border-brand/50 hover:bg-muted/30 flex flex-col items-center justify-center text-center space-y-2 min-h-[140px] transition-colors cursor-pointer group"
        >
          <div className="size-10 rounded-full bg-brand/10 text-brand flex items-center justify-center group-hover:scale-110 transition-transform">
            <Plus className="size-5 stroke-[2]" />
          </div>
          <div>
            <div className="text-xs font-bold text-foreground group-hover:text-brand transition-colors">
              Add new address
            </div>
            <div className="text-[11px] text-muted-foreground">
              Ship to a new venue or office
            </div>
          </div>
        </button>
      </div>
    </div>
  )
}
