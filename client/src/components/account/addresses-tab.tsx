import { useEffect, useState } from 'react'
import { AddressCard } from './address-card'
import { AddressFormSheet } from './address-form-sheet'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/empty-state'
import { useAppSearchParams } from '@/components/shared/app-link'
import { deleteAddress, getAddresses, setDefaultAddress } from '@/lib/api'
import type { Address } from '@/types/account'
import { MapPin, Plus } from 'lucide-react'
import { toast } from 'sonner'

export function AddressesTab() {
  const [searchParams, setSearchParams] = useAppSearchParams()
  const addressParam = searchParams.get('address') // 'new' | '<id>' | null

  const [addresses, setAddresses] = useState<Address[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = () => {
    getAddresses().then((data) => {
      setAddresses(data)
      setLoading(false)
    })
  }

  useEffect(() => {
    loadData()
  }, [])

  const updateAddressParam = (val: string | null) => {
    const next = new URLSearchParams(searchParams)
    if (val === null) {
      next.delete('address')
    } else {
      next.set('address', val)
    }
    setSearchParams(next, { replace: true })
  }

  const handleEdit = (addr: Address) => {
    updateAddressParam(addr.id)
  }

  const handleAddNew = () => {
    updateAddressParam('new')
  }

  const handleSetDefault = async (id: string) => {
    try {
      const updated = await setDefaultAddress(id)
      setAddresses(updated)
      toast.success('Default address updated')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Could not set default address.')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteAddress(id)
      loadData()
      toast.success('Address deleted')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Could not delete address.')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header and Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h2 className="text-xl font-serif font-bold text-foreground">
            Saved delivery addresses ({addresses.length})
          </h2>
          <p className="text-xs text-muted-foreground">
            Manage destinations for event deliveries, stage pickups, and venue logistics.
          </p>
        </div>

        <Button
          type="button"
          onClick={handleAddNew}
          className="h-10 px-4 text-xs font-semibold gap-1.5 self-start sm:self-auto"
        >
          <Plus className="size-4 stroke-[2]" />
          <span>Add new address</span>
        </Button>
      </div>

      {/* Grid of Address Cards */}
      {loading ? (
        <div className="py-20 text-center text-xs text-muted-foreground">
          Loading addresses…
        </div>
      ) : addresses.length === 0 ? (
        <EmptyState
          icon={<MapPin className="size-7" />}
          title="No saved addresses"
          description="Add your home, office, or event venue addresses for faster booking checkouts."
          actionLabel="Add address"
          onAction={handleAddNew}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {addresses.map((addr) => (
            <AddressCard
              key={addr.id}
              address={addr}
              onEdit={handleEdit}
              onSetDefault={handleSetDefault}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Address Form Sheet (hosts reusable AddressForm) */}
      <AddressFormSheet
        addressParam={addressParam}
        addresses={addresses}
        onClose={() => updateAddressParam(null)}
        onAddressSaved={loadData}
      />
    </div>
  )
}
