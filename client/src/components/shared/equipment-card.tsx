import React from 'react'
import { CheckCircle2, Heart } from 'lucide-react'
import { AppLink } from './app-link'
import { PriceText } from './price-text'
import { ProductImage } from './product-image'
import { StarRating } from './star-rating'
import { StatusBadge } from './status-badge'
import { useWishlist } from '@/providers/wishlist-provider'
import { formatINR } from '@/lib/format'
import type { EquipmentListingView } from '@/types'
import { cn } from '@/lib/utils'

export interface EquipmentCardProps {
  equipment: EquipmentListingView
  className?: string
  availableQuantity?: number
  rentalDays?: number
}

export function EquipmentCard({
  equipment,
  className,
  availableQuantity,
  rentalDays,
}: EquipmentCardProps) {
  const { isWishlisted, toggleWishlist } = useWishlist()
  const wishlisted = isWishlisted(equipment.equipment_id)
  const isUnavailable = availableQuantity === 0
  const isLowStock =
    availableQuantity !== undefined && availableQuantity >= 1 && availableQuantity <= 3
  const isBelowMinDays =
    Boolean(rentalDays && rentalDays > 0 && equipment.min_rental_days && rentalDays < equipment.min_rental_days)

  const handleHeartClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    toggleWishlist(equipment.equipment_id)
  }

  return (
    <article
      className={cn(
        'group relative flex flex-col h-full rounded-[14px] border border-border bg-surface overflow-hidden shadow-none transition-colors duration-150 hover:border-brand/50',
        isUnavailable && 'opacity-70 hover:opacity-90',
        className,
      )}
    >
      {/* Clickable Card Link Container */}
      <AppLink
        to={`/equipment/${equipment.equipment_id}`}
        className="flex flex-col flex-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 rounded-[14px]"
      >
        {/* Media Container: 4:3 ratio */}
        <div className="relative w-full aspect-4/3 overflow-hidden bg-muted/40">
          <ProductImage
            src={equipment.primary_image_url}
            alt={equipment.name}
            category={equipment.category_id}
            aspectRatio="4/3"
          />

          {/* Top-Left: Delivery available badge */}
          {equipment.delivery_available && (
            <div className="absolute top-3 left-3 z-10">
              <StatusBadge
                status="delivery_available"
                label="Delivery available"
                size="sm"
                className="bg-surface border border-border text-foreground"
              />
            </div>
          )}

          {/* Bottom-Left: Date Availability Badge */}
          {isUnavailable && (
            <div className="absolute bottom-3 left-3 z-10">
              <span className="inline-flex items-center px-2.5 py-1 rounded-[6px] text-[11px] font-semibold bg-surface text-muted-foreground border border-border">
                Unavailable for your dates
              </span>
            </div>
          )}

          {isLowStock && (
            <div className="absolute bottom-3 left-3 z-10">
              <span className="inline-flex items-center px-2.5 py-1 rounded-[6px] text-[11px] font-semibold bg-warning/15 text-warning border border-warning/30">
                Only {availableQuantity} left
              </span>
            </div>
          )}

          {/* Top-Right: Wishlist Heart Button (persisted, aria-pressed, doesn't navigate) */}
          <button
            type="button"
            onClick={handleHeartClick}
            aria-label={
              wishlisted
                ? `Remove ${equipment.name} from wishlist`
                : `Save ${equipment.name} to wishlist`
            }
            aria-pressed={wishlisted}
            className={cn(
              'absolute top-3 right-3 z-10 size-8.5 rounded-full flex items-center justify-center transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand border border-border/60',
              wishlisted
                ? 'bg-brand text-white border-brand'
                : 'bg-surface/90 text-muted-foreground hover:text-brand hover:bg-surface',
            )}
          >
            <Heart
              size={17}
              className={cn(
                'transition-transform active:scale-125',
                wishlisted ? 'fill-white stroke-white' : 'stroke-current fill-none',
              )}
            />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 flex flex-col flex-1 gap-2">
          {/* Category Label */}
          <div className="text-xs font-semibold text-brand">
            {equipment.category_name}
          </div>

          {/* Equipment Name (Semibold, 2-line clamp) */}
          <h3 className="font-serif text-base sm:text-lg font-semibold text-foreground line-clamp-2 leading-snug group-hover:text-brand transition-colors">
            {equipment.name}
          </h3>

          {/* Vendor Name with Verified Check */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="truncate">{equipment.vendor_name}</span>
            <CheckCircle2 className="size-3.5 text-brand shrink-0" />
          </div>

          {/* Rating Row */}
          <div className="mt-1">
            <StarRating
              rating={equipment.avg_rating}
              reviewCount={equipment.review_count}
              starSize={14}
            />
          </div>

          {/* Price & Deposit Row (Bottom Pinned) */}
          <div className="mt-auto pt-3 border-t border-border flex items-baseline justify-between gap-2">
            <div>
              <PriceText amount={equipment.price_per_day} period="/day" />
              {rentalDays !== undefined && rentalDays > 0 && (
                <div className="text-xs font-semibold text-brand tabular-nums mt-0.5">
                  {formatINR(equipment.price_per_day * rentalDays)} for {rentalDays}{' '}
                  {rentalDays === 1 ? 'day' : 'days'}
                </div>
              )}
              {isBelowMinDays && (
                <div className="text-[11px] font-medium text-warning tabular-nums mt-0.5">
                  Min. {equipment.min_rental_days} days
                </div>
              )}
            </div>
            <div className="text-right self-end">
              <span className="text-[12px] text-muted-foreground font-normal tabular-nums">
                {formatINR(equipment.security_deposit)} deposit
              </span>
            </div>
          </div>
        </div>
      </AppLink>
    </article>
  )
}
