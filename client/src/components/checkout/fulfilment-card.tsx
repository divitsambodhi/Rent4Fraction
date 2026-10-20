import { Truck, MapPin, AlertCircle, Check } from 'lucide-react'
import { formatINR } from '@/lib/format'
import { MOCK_DELIVERY_FEE_PER_VENDOR, MOCK_PICKUP_FEE } from '@/lib/config/pricing-placeholders'
import type { CartVendorGroup, CheckoutFulfilmentType } from '@/types/checkout'
import { cn } from '@/lib/utils'

interface FulfilmentCardProps {
  vendorGroup: CartVendorGroup
  selectedType: CheckoutFulfilmentType
  onChange: (type: CheckoutFulfilmentType) => void
  className?: string
}

export function FulfilmentCard({
  vendorGroup,
  selectedType,
  onChange,
  className,
}: FulfilmentCardProps) {
  // Check if any item from this vendor has delivery_available = false
  const pickupOnlyItem = vendorGroup.lines.find((l) => !l.delivery_available)
  const isDeliveryDisabled = Boolean(pickupOnlyItem)

  const deliveryFee = MOCK_DELIVERY_FEE_PER_VENDOR
  const pickupFee = MOCK_PICKUP_FEE

  return (
    <div
      className={cn(
        'p-5 rounded-[16px] bg-surface border border-border space-y-4 shadow-xs',
        className,
      )}
    >
      {/* Vendor Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border/70">
        <div>
          <h3 className="font-serif font-bold text-sm text-foreground">
            {vendorGroup.vendor_name}
          </h3>
          <p className="text-[11px] text-muted-foreground">
            {vendorGroup.lines.length} {vendorGroup.lines.length === 1 ? 'item' : 'items'} in this shipment
          </p>
        </div>
        <span className="text-xs font-semibold text-muted-foreground">
          Choose fulfilment
        </span>
      </div>

      {/* Radio options grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup">
        {/* Delivery Option */}
        <label
          className={cn(
            'relative flex items-start gap-3 p-4 rounded-[12px] border min-h-[64px] transition-all',
            isDeliveryDisabled
              ? 'opacity-60 bg-muted/20 border-border cursor-not-allowed'
              : selectedType === 'delivery'
                ? 'border-brand bg-brand/5 ring-1 ring-brand/20 cursor-pointer'
                : 'border-border bg-surface hover:border-brand/40 cursor-pointer',
          )}
        >
          <input
            type="radio"
            name={`fulfilment-${vendorGroup.vendor_id}`}
            value="delivery"
            checked={selectedType === 'delivery'}
            disabled={isDeliveryDisabled}
            onChange={() => !isDeliveryDisabled && onChange('delivery')}
            className="sr-only"
          />

          <div
            className={cn(
              'size-8 rounded-full flex items-center justify-center shrink-0 mt-0.5',
              selectedType === 'delivery' && !isDeliveryDisabled
                ? 'bg-brand text-white'
                : 'bg-muted text-muted-foreground',
            )}
          >
            <Truck className="size-4" />
          </div>

          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-xs text-foreground">
                Delivery to your venue
              </span>
              <span className="text-xs font-bold text-foreground tabular-nums">
                {formatINR(deliveryFee)}
              </span>
            </div>

            {isDeliveryDisabled ? (
              <p className="text-[11px] text-danger font-medium flex items-center gap-1">
                <AlertCircle className="size-3 shrink-0" />
                <span>Not available for {pickupOnlyItem?.name}</span>
              </p>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                Delivered and collected by {vendorGroup.vendor_name}
              </p>
            )}
          </div>

          {selectedType === 'delivery' && !isDeliveryDisabled && (
            <span className="absolute top-3 right-3 text-brand">
              <Check className="size-4 stroke-[2.5]" />
            </span>
          )}
        </label>

        {/* Self Pickup Option */}
        <label
          className={cn(
            'relative flex items-start gap-3 p-4 rounded-[12px] border min-h-[64px] transition-all cursor-pointer',
            selectedType === 'pickup'
              ? 'border-brand bg-brand/5 ring-1 ring-brand/20'
              : 'border-border bg-surface hover:border-brand/40',
          )}
        >
          <input
            type="radio"
            name={`fulfilment-${vendorGroup.vendor_id}`}
            value="pickup"
            checked={selectedType === 'pickup'}
            onChange={() => onChange('pickup')}
            className="sr-only"
          />

          <div
            className={cn(
              'size-8 rounded-full flex items-center justify-center shrink-0 mt-0.5',
              selectedType === 'pickup'
                ? 'bg-brand text-white'
                : 'bg-muted text-muted-foreground',
            )}
          >
            <MapPin className="size-4" />
          </div>

          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-xs text-foreground">
                Self pickup
              </span>
              <span className="text-xs font-bold text-success tabular-nums">
                {pickupFee === 0 ? 'Free (₹0)' : formatINR(pickupFee)}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Collect at {vendorGroup.vendor_name} depot / warehouse
            </p>
          </div>

          {selectedType === 'pickup' && (
            <span className="absolute top-3 right-3 text-brand">
              <Check className="size-4 stroke-[2.5]" />
            </span>
          )}
        </label>
      </div>
    </div>
  )
}
