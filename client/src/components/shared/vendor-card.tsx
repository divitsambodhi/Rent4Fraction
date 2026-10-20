import { CheckCircle2, MapPin, Package, Star } from 'lucide-react'
import { AppLink } from './app-link'
import type { Vendor } from '@/types'
import { cn } from '@/lib/utils'

interface VendorCardProps {
  vendor: Vendor
  className?: string
}

export function VendorCard({ vendor, className }: VendorCardProps) {
  return (
    <div
      className={cn(
        'group flex flex-col justify-between p-5 rounded-[12px] border border-border bg-surface transition-all duration-200 hover:border-brand/40 hover:shadow-sm',
        className,
      )}
    >
      <div>
        <div className="flex items-start justify-between gap-3 mb-3.5">
          {/* Initials Logo Tile */}
          <div className="size-12 rounded-[10px] bg-brand text-white flex items-center justify-center font-serif text-lg font-bold shadow-xs">
            {vendor.initials}
          </div>

          {/* Rating Badge */}
          <div className="flex items-center gap-1 text-[13px] font-semibold text-foreground bg-warning/10 px-2 py-1 rounded-full border border-warning/20">
            <Star className="size-3.5 fill-warning text-warning" />
            <span className="tabular-nums">{vendor.rating.toFixed(1)}</span>
            <span className="text-muted-foreground text-xs font-normal">
              ({vendor.review_count})
            </span>
          </div>
        </div>

        {/* Vendor Name & Verification */}
        <div className="flex items-center gap-1.5 mb-1">
          <h3 className="font-serif text-base sm:text-lg font-semibold text-foreground group-hover:text-brand transition-colors truncate">
            {vendor.name}
          </h3>
          {vendor.verified && (
            <span title="Verified Vendor">
              <CheckCircle2 className="size-4 text-brand shrink-0" />
            </span>
          )}
        </div>

        {/* Location & Count */}
        <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-muted-foreground mb-3">
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3.5 text-brand" />
            <span>{vendor.city}</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <Package className="size-3.5" />
            <span className="tabular-nums">{vendor.item_count} listings</span>
          </span>
        </div>

        {/* Tagline */}
        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-4">
          {vendor.tagline}
        </p>
      </div>

      {/* Action link */}
      <div className="pt-3 border-t border-border">
        <AppLink
          to={`/equipment?vendor=${encodeURIComponent(vendor.id)}`}
          className="text-xs font-semibold text-brand hover:text-brand-hover inline-flex items-center gap-1 transition-colors"
        >
          <span>View storefront</span>
          <span>→</span>
        </AppLink>
      </div>
    </div>
  )
}
