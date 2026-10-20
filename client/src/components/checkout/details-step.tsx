import { useState, useEffect } from 'react'
import { ArrowLeft, ArrowRight, MapPin, Truck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AddressPicker } from '@/components/account/address-picker'
import { AddressFormSheet } from '@/components/account/address-form-sheet'
import { FulfilmentCard } from './fulfilment-card'
import { EventDetailsForm } from './event-details-form'
import { getAddresses } from '@/lib/api/account'
import type { CartPeriod, CheckoutDraft, CheckoutFulfilmentType, EventType } from '@/types/checkout'
import type { Address } from '@/types/account'

interface DetailsStepProps {
  period: CartPeriod
  draft: CheckoutDraft
  onUpdateDraft: (patch: Partial<CheckoutDraft>) => void
  onBack: () => void
  onContinue: () => void
}

export function DetailsStep({
  period,
  draft,
  onUpdateDraft,
  onBack,
  onContinue,
}: DetailsStepProps) {
  const [addresses, setAddresses] = useState<Address[]>([])
  const [addressSheetOpen, setAddressSheetOpen] = useState(false)
  const [isEventFormValid, setIsEventFormValid] = useState(true)

  // Load customer addresses
  useEffect(() => {
    async function load() {
      try {
        const list = await getAddresses()
        setAddresses(list)
        // If no address currently selected, pre-select default address
        if (!draft.address_id && list.length > 0) {
          const def = list.find((a) => a.is_default) || list[0]
          onUpdateDraft({ address_id: def.id })
        }
      } catch (err) {
        console.error('Failed to load addresses', err)
      }
    }
    load()
  }, [draft.address_id, onUpdateDraft])

  const selectedAddress = addresses.find((a) => a.id === draft.address_id) || addresses[0] || null

  const handleSelectAddress = (id: string) => {
    onUpdateDraft({ address_id: id })
  }

  const handleFulfilmentChange = (vendorId: string, type: CheckoutFulfilmentType) => {
    onUpdateDraft({
      fulfilment_by_vendor: {
        ...draft.fulfilment_by_vendor,
        [vendorId]: type,
      },
    })
  }

  const handleEventDetailsChange = (values: {
    event_name?: string
    event_type: EventType
    event_date: string
    venue_address: string
    same_as_delivery: boolean
    notes?: string
    isValid: boolean
  }) => {
    setIsEventFormValid(values.isValid)
    onUpdateDraft({
      event_name: values.event_name,
      event_type: values.event_type,
      event_date: values.event_date,
      venue_address: values.venue_address,
      same_as_delivery: values.same_as_delivery,
      notes: values.notes,
    })
  }

  const canContinue = Boolean(selectedAddress) && isEventFormValid

  return (
    <div className="space-y-8">
      {/* 1. Delivery Address Section */}
      <section className="space-y-4" aria-labelledby="delivery-address-heading">
        <div className="flex items-center gap-2.5 pb-2 border-b border-border/70">
          <div className="size-8 rounded-full bg-brand/10 text-brand flex items-center justify-center">
            <MapPin className="size-4" />
          </div>
          <div>
            <h2 id="delivery-address-heading" className="font-serif font-bold text-base text-foreground">
              Delivery address
            </h2>
            <p className="text-xs text-muted-foreground">
              Where should vendors deliver your equipment or send booking invoices?
            </p>
          </div>
        </div>

        <AddressPicker
          addresses={addresses}
          selectedId={draft.address_id || selectedAddress?.id || null}
          onSelect={handleSelectAddress}
          onAddNew={() => setAddressSheetOpen(true)}
        />
      </section>

      {/* 2. Fulfilment Cards per Vendor */}
      <section className="space-y-4" aria-labelledby="fulfilment-heading">
        <div className="flex items-center gap-2.5 pb-2 border-b border-border/70">
          <div className="size-8 rounded-full bg-brand/10 text-brand flex items-center justify-center">
            <Truck className="size-4" />
          </div>
          <div>
            <h2 id="fulfilment-heading" className="font-serif font-bold text-base text-foreground">
              Fulfilment method
            </h2>
            <p className="text-xs text-muted-foreground">
              Select venue delivery or self depot pickup for each vendor.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {period.vendor_groups.map((vGroup) => (
            <FulfilmentCard
              key={vGroup.vendor_id}
              vendorGroup={vGroup}
              selectedType={draft.fulfilment_by_vendor[vGroup.vendor_id] || 'delivery'}
              onChange={(t) => handleFulfilmentChange(vGroup.vendor_id, t)}
            />
          ))}
        </div>
      </section>

      {/* 3. Event Details Form */}
      <section className="space-y-4">
        <EventDetailsForm
          period={period}
          deliveryAddress={selectedAddress}
          initialValues={{
            event_name: draft.event_name,
            event_type: draft.event_type,
            event_date: draft.event_date || period.start_date,
            venue_address: draft.venue_address,
            same_as_delivery: draft.same_as_delivery,
            notes: draft.notes,
          }}
          onChange={handleEventDetailsChange}
        />
      </section>

      {/* Bottom Actions (Desktop) */}
      <div className="hidden lg:flex items-center justify-between pt-6 border-t border-border/70">
        <Button
          type="button"
          variant="ghost"
          onClick={onBack}
          className="gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          <span>Back to cart</span>
        </Button>

        <Button
          type="button"
          onClick={onContinue}
          disabled={!canContinue}
          className="h-12 px-8 text-sm font-semibold rounded-[12px] shadow-sm gap-2"
        >
          <span>Continue to payment</span>
          <ArrowRight className="size-4" />
        </Button>
      </div>

      {/* Add New Address Sheet */}
      <AddressFormSheet
        addressParam={addressSheetOpen ? 'new' : null}
        addresses={addresses}
        onClose={() => setAddressSheetOpen(false)}
        onAddressSaved={async () => {
          setAddressSheetOpen(false)
          const list = await getAddresses()
          setAddresses(list)
          if (list.length > 0) {
            onUpdateDraft({ address_id: list[list.length - 1].id })
          }
        }}
      />
    </div>
  )
}
