import { CheckCircle2, MessageSquare, Store } from 'lucide-react'
import { AppLink } from '@/components/shared/app-link'
import { StarRating } from '@/components/shared/star-rating'
import { Button } from '@/components/ui/button'
import type { VendorDetail } from '@/types'
import { cn } from '@/lib/utils'

interface VendorInfoCardProps {
  vendor: VendorDetail
  onOpenMessage?: () => void
  preview?: boolean
  className?: string
}

function getInitials(name: string): string {
  const parts = name.trim().split(' ')
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

export function VendorInfoCard({
  vendor,
  onOpenMessage,
  preview = false,
  className,
}: VendorInfoCardProps) {
  const initials = getInitials(vendor.business_name)

  return (
    <section
      id="vendor"
      className={cn(
        'rounded-[16px] border border-border bg-surface p-5 sm:p-7 shadow-xs space-y-6 scroll-mt-28',
        className,
      )}
      aria-labelledby="vendor-heading"
    >
      <div className="space-y-1">
        <h2
          id="vendor-heading"
          className="font-serif text-xl sm:text-2xl font-bold text-foreground"
        >
          About the Vendor
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Verified event supplier responsible for maintenance, dispatch, and returns.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-5 p-4 sm:p-5 rounded-[12px] bg-muted/30 border border-border/80">
        {/* Avatar */}
        <div className="size-14 sm:size-16 rounded-[14px] bg-brand text-white font-serif font-bold text-lg sm:text-xl flex items-center justify-center shrink-0 shadow-xs">
          {initials}
        </div>

        {/* Info */}
        <div className="flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-serif text-lg sm:text-xl font-bold text-foreground">
              {vendor.business_name}
            </h3>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand bg-brand/10 px-2 py-0.5 rounded-full">
              <CheckCircle2 className="size-3.5 fill-brand/10 text-brand" />
              <span>Verified Vendor</span>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <StarRating rating={vendor.avg_rating} size="sm" />
              <span className="font-bold text-foreground tabular-nums">
                {vendor.avg_rating.toFixed(1)}
              </span>
              <span>({vendor.review_count} reviews)</span>
            </div>
            <span>•</span>
            <span>{vendor.city}</span>
            <span>•</span>
            <span>Member since {vendor.member_since}</span>
            <span>•</span>
            <span className="font-medium text-foreground">{vendor.item_count} items listed</span>
          </div>

          <p className="text-xs sm:text-sm text-foreground/80 leading-relaxed pt-1">
            {vendor.description}
          </p>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 pt-2">
            <AppLink to={preview ? `/equipment?vendor=${vendor.vendor_id}&preview=1` : `/equipment?vendor=${vendor.vendor_id}`}>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs font-semibold gap-1.5 h-10 px-4 rounded-[8px]"
              >
                <Store className="size-3.5" />
                <span>View storefront</span>
              </Button>
            </AppLink>

            {!preview && onOpenMessage && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onOpenMessage}
                className="text-xs font-semibold gap-1.5 h-10 px-4 rounded-[8px]"
              >
                <MessageSquare className="size-3.5" />
                <span>Message vendor</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
