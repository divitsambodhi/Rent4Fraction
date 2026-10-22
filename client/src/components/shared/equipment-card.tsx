import { AppLink } from './app-link'
import { PriceText } from './price-text'
import { ProductImage } from './product-image'
import { StarRating } from './star-rating'
import { StatusBadge } from './status-badge'
import { WishlistButton } from './wishlist-button'
import { formatINR } from '@/lib/format'
import type { EquipmentListingView } from '@/types'
import { cn } from '@/lib/utils'

export interface EquipmentCardProps {
  equipment: EquipmentListingView
  className?: string
  availableQuantity?: number
  rentalDays?: number
}

/**
 * EquipmentCard: Clean mobile-first retail component.
 * White surface, 1px border, 8px radius, compact padding on mobile.
 * 44px minimum tap target for wishlist button, clamped title, price on one line.
 */
export function EquipmentCard({
  equipment,
  className,
  availableQuantity,
  rentalDays,
}: EquipmentCardProps) {
  const isUnavailable = availableQuantity === 0
  const isLowStock =
    availableQuantity !== undefined && availableQuantity >= 1 && availableQuantity <= 3
  const isBelowMinDays =
    Boolean(rentalDays && rentalDays > 0 && equipment.min_rental_days && rentalDays < equipment.min_rental_days)

  return (
    <article
      className={cn(
        'group relative flex flex-col h-full rounded-md border border-border bg-surface overflow-hidden transition-colors duration-150',
        isUnavailable && 'opacity-70',
        className,
      )}
    >
      <AppLink
        to={`/equipment/${equipment.equipment_id}`}
        className="flex flex-col flex-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 rounded-md"
      >
        <div className="relative w-full aspect-[4/3] bg-muted/40 overflow-hidden">
          <ProductImage
            src={equipment.primary_image_url}
            alt={equipment.name}
            category={equipment.category_name || equipment.category_id}
            aspectRatio="4/3"
            widths={[360, 480, 800]}
            sizes="(max-width: 480px) 100vw, (max-width: 768px) 50vw, 33vw"
          />

          {equipment.delivery_available && (
            <div className="absolute top-2 left-2 z-10">
              <StatusBadge
                status="delivery_available"
                label="Delivery"
                size="sm"
                className="bg-surface/90 backdrop-blur-xs border border-border text-foreground text-[10px] sm:text-xs px-1.5 py-0.5"
              />
            </div>
          )}

          {isUnavailable && (
            <div className="absolute bottom-2 left-2 z-10">
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm text-[10px] font-medium bg-surface/90 text-muted-foreground border border-border">
                Unavailable
              </span>
            </div>
          )}

          {isLowStock && (
            <div className="absolute bottom-2 left-2 z-10">
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm text-[10px] font-medium bg-surface/90 text-warning border border-warning/40">
                Only {availableQuantity} left
              </span>
            </div>
          )}

          {/* Wishlist Button: 44px tap target with 8px inset */}
          <div className="absolute top-2 right-2 z-10">
            <WishlistButton
              equipmentId={equipment.equipment_id}
              equipmentName={equipment.name}
            />
          </div>
        </div>

        <div className="p-3 sm:p-4 flex flex-col flex-1 gap-1">
          <div className="text-[11px] sm:text-label-sm font-semibold text-brand truncate">
            {equipment.category_name}
          </div>

          <h3 className="text-sm sm:text-body-md font-semibold text-foreground line-clamp-2 leading-snug">
            {equipment.name}
          </h3>

          <div className="flex items-center gap-1.5 text-xs text-text-secondary">
            <span className="truncate">{equipment.vendor_name}</span>
          </div>

          {equipment.review_count > 0 && (
            <div className="mt-0.5">
              <StarRating
                rating={equipment.avg_rating}
                reviewCount={equipment.review_count}
                starSize={12}
              />
            </div>
          )}

          <div className="mt-auto pt-2.5 border-t border-border flex items-baseline justify-between gap-1 text-xs">
            <div className="min-w-0">
              <PriceText amount={equipment.price_per_day} period="/day" />
              {rentalDays !== undefined && rentalDays > 0 && (
                <div className="text-[11px] font-semibold text-brand tabular-nums">
                  {formatINR(equipment.price_per_day * rentalDays)} ({rentalDays}d)
                </div>
              )}
              {isBelowMinDays && (
                <div className="text-[10px] font-medium text-warning tabular-nums">
                  Min. {equipment.min_rental_days} days
                </div>
              )}
            </div>
            <div className="text-right shrink-0">
              <span className="text-[11px] text-text-secondary tabular-nums">
                {formatINR(equipment.security_deposit)} dep.
              </span>
            </div>
          </div>
        </div>
      </AppLink>
    </article>
  )
}
