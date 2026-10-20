import { ExternalLink, Store } from 'lucide-react'
import { VendorCard } from '@/components/shared/vendor-card'
import { AppLink } from '@/components/shared/app-link'
import { Button } from '@/components/ui/button'
import type { VendorProfile } from '@/types/vendor'
import type { Vendor } from '@/types'

interface StorefrontPreviewProps {
  profile: VendorProfile
}

export function StorefrontPreview({ profile }: StorefrontPreviewProps) {
  const vendorPreviewData: Vendor = {
    id: profile.vendor_id,
    name: profile.business_name,
    city: profile.city,
    rating: profile.rating || 4.8,
    review_count: profile.review_count || 128,
    item_count: 12,
    verified: profile.approval_status === 'approved',
    initials: profile.business_name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase(),
    tagline: profile.description || 'Professional event and production rental equipment.',
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-xs space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-border/60">
        <div>
          <h3 className="font-serif text-base font-bold text-foreground flex items-center gap-2">
            <Store className="size-4 text-brand" />
            <span>Storefront card preview</span>
          </h3>
          <p className="text-xs text-muted-foreground">
            How your business appears across catalog search and partner directories
          </p>
        </div>

        <AppLink to={`/equipment?vendor=${profile.vendor_id}`}>
          <Button variant="outline" size="sm" className="text-xs h-8 gap-1.5">
            <ExternalLink className="size-3.5" />
            <span>View public storefront</span>
          </Button>
        </AppLink>
      </div>

      <div className="max-w-md mx-auto sm:mx-0">
        <VendorCard vendor={vendorPreviewData} />
      </div>
    </div>
  )
}
