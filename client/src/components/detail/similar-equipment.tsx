import { EquipmentCard } from '@/components/shared/equipment-card'
import type { EquipmentListingView } from '@/types'
import { cn } from '@/lib/utils'

interface SimilarEquipmentProps {
  similarItems: EquipmentListingView[]
  vendorItems: EquipmentListingView[]
  vendorName: string
  className?: string
}

export function SimilarEquipment({
  similarItems,
  vendorItems,
  vendorName,
  className,
}: SimilarEquipmentProps) {
  const showVendorSection = vendorItems && vendorItems.length >= 2

  return (
    <div className={cn('space-y-10 pt-4', className)}>
      {/* 1. "You might also like" (4 cards) */}
      {similarItems.length > 0 && (
        <section aria-labelledby="similar-heading" className="space-y-4">
          <div className="space-y-1">
            <h2
              id="similar-heading"
              className="font-serif text-xl sm:text-2xl font-bold text-foreground"
            >
              You Might Also Like
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Frequently paired equipment for similar event scales and audio-visual setups.
            </p>
          </div>

          {/* Horizontal scroll snap on mobile, 4-col grid on desktop */}
          <div className="flex sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-4 overflow-x-auto pb-3 sm:pb-0 snap-x scrollbar-none">
            {similarItems.slice(0, 4).map((item) => (
              <div
                key={item.equipment_id}
                className="w-[260px] sm:w-auto shrink-0 snap-start"
              >
                <EquipmentCard equipment={item} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 2. "More from this vendor" (hidden when < 2 items) */}
      {showVendorSection && (
        <section aria-labelledby="more-vendor-heading" className="space-y-4">
          <div className="space-y-1">
            <h2
              id="more-vendor-heading"
              className="font-serif text-xl sm:text-2xl font-bold text-foreground"
            >
              More from {vendorName}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Bundle rentals from the same supplier to consolidate delivery and setup.
            </p>
          </div>

          <div className="flex sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-4 overflow-x-auto pb-3 sm:pb-0 snap-x scrollbar-none">
            {vendorItems.slice(0, 4).map((item) => (
              <div
                key={item.equipment_id}
                className="w-[260px] sm:w-auto shrink-0 snap-start"
              >
                <EquipmentCard equipment={item} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
