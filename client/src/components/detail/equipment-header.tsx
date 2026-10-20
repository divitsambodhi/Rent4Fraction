import { CheckCircle2, ShieldCheck, Truck } from 'lucide-react'
import { AppLink } from '@/components/shared/app-link'
import { StarRating } from '@/components/shared/star-rating'
import { Badge } from '@/components/ui/badge'
import type { EquipmentDetail } from '@/types'

interface EquipmentHeaderProps {
  equipment: EquipmentDetail
}

export function EquipmentHeader({ equipment }: EquipmentHeaderProps) {
  return (
    <div className="space-y-3.5 pt-2">
      {/* Category Pill Link */}
      <div>
        <AppLink
          to={`/equipment?category=${equipment.category_id}`}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand/10 text-brand hover:bg-brand/15 text-xs font-semibold tracking-wide transition-colors"
        >
          {equipment.category_name}
        </AppLink>
      </div>

      {/* Main Fraunces H1 Title */}
      <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground tracking-tight leading-tight">
        {equipment.name}
      </h1>

      {/* Meta Row: Rating, Reviews Link, Vendor */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
        <a
          href="#reviews"
          className="flex items-center gap-1.5 hover:text-brand transition-colors group focus:outline-none focus-visible:ring-1 focus-visible:ring-brand rounded"
        >
          <StarRating rating={equipment.avg_rating} size="sm" />
          <span className="font-bold text-foreground tabular-nums">
            {equipment.avg_rating.toFixed(1)}
          </span>
          <span className="underline decoration-muted-foreground/40 group-hover:decoration-brand underline-offset-4">
            ({equipment.review_count} reviews)
          </span>
        </a>

        <span className="text-border">•</span>

        {/* Vendor Line with Verified Check */}
        <div className="flex items-center gap-1.5">
          <span>Provided by</span>
          <AppLink
            to={`/equipment?vendor=${equipment.vendor_id}`}
            className="font-semibold text-foreground hover:text-brand transition-colors inline-flex items-center gap-1"
          >
            <span>{equipment.vendor_name}</span>
            <CheckCircle2 className="size-4 text-brand inline fill-brand/10" />
          </AppLink>
        </div>
      </div>

      {/* Badges Strip */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        {equipment.delivery_available ? (
          <Badge
            variant="outline"
            className="border-brand/30 bg-brand/5 text-brand text-xs font-medium py-1 px-2.5 gap-1.5"
          >
            <Truck className="size-3.5" />
            <span>Delivery available</span>
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="border-muted text-muted-foreground text-xs font-medium py-1 px-2.5"
          >
            Pickup only
          </Badge>
        )}

        <Badge
          variant="secondary"
          className="text-xs font-medium py-1 px-2.5 bg-muted/60 text-foreground"
        >
          Min. {equipment.min_rental_days} day{equipment.min_rental_days > 1 ? 's' : ''}
        </Badge>

        <Badge
          variant="secondary"
          className="text-xs font-medium py-1 px-2.5 bg-muted/60 text-foreground"
        >
          {equipment.quantity} units in stock
        </Badge>

        <Badge
          variant="outline"
          className="border-border text-xs text-muted-foreground py-1 px-2.5 gap-1"
        >
          <ShieldCheck className="size-3.5 text-brand" />
          <span>Verified vendor</span>
        </Badge>
      </div>

      {/* Short Summary Description */}
      <p className="text-sm sm:text-base text-muted-foreground leading-relaxed pt-1">
        {equipment.description}
      </p>
    </div>
  )
}
