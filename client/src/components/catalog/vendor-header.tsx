import { CheckCircle2, MapPin, MessageSquare, Package } from 'lucide-react'
import { StarRating } from '@/components/shared/star-rating'
import { Button } from '@/components/ui/button'
import type { CanonicalVendor } from '@/lib/api'
import { cn } from '@/lib/utils'

export interface VendorHeaderProps {
  vendor: CanonicalVendor
  className?: string
}

export function VendorHeader({ vendor, className }: VendorHeaderProps) {
  return (
    <div
      className={cn(
        'rounded-[20px] border border-border bg-surface p-6 sm:p-8 shadow-xs mb-6',
        className,
      )}
    >
      <div className="flex flex-col sm:flex-row items-start justify-between gap-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          {/* Initials Logo Tile */}
          <div className="size-16 sm:size-20 rounded-[16px] bg-brand text-white flex items-center justify-center font-serif text-2xl sm:text-3xl font-bold shadow-md shrink-0">
            {vendor.initials}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-brand">
                Verified Vendor Storefront
              </span>
            </div>

            {/* Vendor Name + Verified Check */}
            <div className="flex items-center gap-2">
              <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-foreground tracking-tight">
                {vendor.name}
              </h1>
              {vendor.verified && (
                <span title="Verified Vendor Seal">
                  <CheckCircle2 className="size-5 text-brand shrink-0" />
                </span>
              )}
            </div>

            {/* Ratings & Meta */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground pt-0.5">
              <StarRating
                rating={vendor.rating}
                reviewCount={vendor.review_count}
                showCount
                starSize={14}
              />
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3.5 text-brand" />
                <span>{vendor.city}</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <Package className="size-3.5" />
                <span className="tabular-nums">{vendor.item_count} items listed</span>
              </span>
              <span className="text-muted-foreground/80">
                Member since {vendor.memberSince}
              </span>
            </div>

            {/* Description */}
            <p className="text-xs sm:text-sm text-muted-foreground max-w-xl leading-relaxed pt-1">
              {vendor.description || vendor.tagline}
            </p>
          </div>
        </div>

        {/* Action: Visibly Disabled Message Vendor Button with Tooltip */}
        <div className="self-stretch sm:self-auto sm:text-right shrink-0">
          <Button
            type="button"
            disabled
            title="Available after login"
            className="w-full sm:w-auto h-11 px-5 rounded-[10px] font-semibold border border-brand/40 text-brand bg-brand/5 opacity-70 cursor-not-allowed hover:bg-brand/5 gap-2"
          >
            <MessageSquare className="size-4" />
            <span>Message vendor</span>
          </Button>
          <p className="text-[11px] text-muted-foreground mt-1.5 sm:text-right">
            Available after login
          </p>
        </div>
      </div>
    </div>
  )
}
