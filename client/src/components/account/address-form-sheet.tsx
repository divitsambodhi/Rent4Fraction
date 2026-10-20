import { useEffect, useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { AddressForm, type AddressFormData } from './address-form'
import { saveAddress } from '@/lib/api'
import type { Address } from '@/types/account'
import { MapPin, X } from 'lucide-react'
import { toast } from 'sonner'

interface AddressFormSheetProps {
  addressParam: string | null // 'new' | '<id>' | null
  addresses: Address[]
  onClose: () => void
  onAddressSaved: () => void
}

export function AddressFormSheet({
  addressParam,
  addresses,
  onClose,
  onAddressSaved,
}: AddressFormSheetProps) {
  const [targetAddress, setTargetAddress] = useState<Address | null>(null)

  const isOpen = Boolean(addressParam)
  const isNew = addressParam === 'new'

  useEffect(() => {
    if (!addressParam) {
      setTargetAddress(null)
      return
    }

    if (addressParam === 'new') {
      setTargetAddress(null)
      return
    }

    // Existing address edit
    const found = addresses.find((a) => a.id === addressParam)
    if (!found) {
      toast.error('Address not found')
      onClose()
    } else {
      setTargetAddress(found)
    }
  }, [addressParam, addresses, onClose])

  const handleSave = async (data: AddressFormData) => {
    try {
      await saveAddress({
        id: targetAddress?.id,
        ...data,
      })

      toast.success(isNew ? 'Address added' : 'Address updated', {
        description: `${data.name} – ${data.line1}, ${data.city}`,
      })
      onAddressSaved()
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save address.'
      toast.error(msg)
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[480px] h-[95vh] sm:h-full bottom-0 sm:bottom-auto sm:right-0 inset-x-0 sm:inset-x-auto rounded-t-[20px] sm:rounded-none p-0 flex flex-col bg-surface border-t sm:border-t-0 sm:border-l border-border shadow-2xl focus:outline-none"
      >
        {/* Mobile drag handle */}
        <div className="sm:hidden flex justify-center pt-2.5 pb-1">
          <div className="w-12 h-1.5 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Sticky Header */}
        <SheetHeader className="px-5 py-4 border-b border-border bg-surface/95 backdrop-blur-md flex flex-row items-center justify-between gap-3 shrink-0 text-left">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 text-brand text-xs font-bold uppercase tracking-wider">
              <MapPin className="size-3.5" />
              <span>{isNew ? 'New Address' : 'Edit Address'}</span>
            </div>
            <SheetTitle className="text-base sm:text-lg font-serif font-bold text-foreground">
              {isNew ? 'Add delivery address' : `Edit ${targetAddress?.label || 'Address'}`}
            </SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">
              Equipment deliveries and pickups will be routed to this location.
            </SheetDescription>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="size-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0"
            aria-label="Close address form"
          >
            <X className="size-4.5 stroke-[2]" />
          </button>
        </SheetHeader>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          <AddressForm
            initialData={targetAddress}
            onSubmit={handleSave}
            onCancel={onClose}
            submitLabel={isNew ? 'Save address' : 'Update address'}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}
