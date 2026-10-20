import { Star, Truck } from 'lucide-react'
import { EquipmentCard } from '@/components/shared/equipment-card'
import { PriceText } from '@/components/shared/price-text'
import type { EquipmentListingView } from '@/types'

interface EquipmentPreviewProps {
  formValues: {
    name: string
    description: string
    category_id: string
    category_name: string
    price_per_day: number
    security_deposit: number
    quantity: number
    min_rental_days: number
    delivery_available: boolean
    images: { url: string; isPrimary: boolean }[]
    specifications: Record<string, string | number>
    included: string[]
    status: string
  }
  vendorName?: string
}

export function EquipmentPreview({
  formValues,
  vendorName = 'Sargam Sound Systems',
}: EquipmentPreviewProps) {
  const primaryImg =
    formValues.images.find((img) => img.isPrimary)?.url ||
    formValues.images[0]?.url ||
    'https://images.unsplash.com/photo-1598387993281-cecf8b71a8f8?auto=format&fit=crop&w=600&q=80'

  const previewListing: EquipmentListingView = {
    equipment_id: 'preview-id',
    name: formValues.name || 'Sample Equipment Name',
    description: formValues.description || 'Professional grade rental equipment in top condition.',
    category_id: formValues.category_id || 'speakers',
    category_name: formValues.category_name || 'Audio & Sound',
    parent_category_id: null,
    parent_category_name: null,
    price_per_day: Number(formValues.price_per_day) || 2500,
    security_deposit: Number(formValues.security_deposit) || 3000,
    quantity: Number(formValues.quantity) || 4,
    min_rental_days: Number(formValues.min_rental_days) || 1,
    delivery_available: Boolean(formValues.delivery_available),
    primary_image_url: primaryImg,
    specifications: Object.fromEntries(
      Object.entries(formValues.specifications || {}).map(([k, v]) => [k, String(v)]),
    ),
    vendor_id: '1',
    vendor_name: vendorName,
    avg_rating: 4.8,
    review_count: 128,
  }

  return (
    <div className="space-y-6">
      {/* 1. Detail Page Title Block Preview */}
      <div className="p-5 rounded-2xl border border-border bg-surface shadow-xs space-y-3">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Detail Page Header Preview
        </span>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{previewListing.category_name}</span>
            <span>·</span>
            <span>By {vendorName}</span>
          </div>

          <h1 className="font-serif text-xl sm:text-2xl font-bold text-foreground">
            {previewListing.name}
          </h1>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-1 font-semibold text-foreground">
              <Star className="size-3.5 fill-amber-500 text-amber-500" />
              <span>4.8</span>
              <span className="text-muted-foreground font-normal">(128 reviews)</span>
            </div>

            <span>·</span>

            <div className="flex items-center gap-1.5 text-muted-foreground">
              {previewListing.delivery_available ? (
                <span className="inline-flex items-center gap-1 text-brand font-medium">
                  <Truck className="size-3.5" />
                  <span>Delivery & pickup available</span>
                </span>
              ) : (
                <span>Venue pickup only</span>
              )}
            </div>
          </div>

          <div className="pt-2 flex items-baseline gap-2">
            <PriceText amount={previewListing.price_per_day} amountClassName="text-2xl font-bold" />
            <span className="text-xs text-muted-foreground">
              + ₹{previewListing.security_deposit.toLocaleString('en-IN')} refundable deposit
            </span>
          </div>
        </div>
      </div>

      {/* 2. Catalogue Card Preview */}
      <div className="p-5 rounded-2xl border border-border bg-surface shadow-xs space-y-3">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Search / Catalogue Card Preview
        </span>
        <div className="max-w-[320px] mx-auto sm:mx-0">
          <EquipmentCard equipment={previewListing} />
        </div>
      </div>
    </div>
  )
}
