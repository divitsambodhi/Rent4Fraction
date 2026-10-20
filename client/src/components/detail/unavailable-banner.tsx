import { AlertTriangle } from 'lucide-react'
import { AppLink } from '@/components/shared/app-link'
import { Button } from '@/components/ui/button'
import type { EquipmentStatus } from '@/types'
import { cn } from '@/lib/utils'

interface UnavailableBannerProps {
  status: EquipmentStatus
  categoryName?: string
  categoryId?: string
  className?: string
}

export function UnavailableBanner({
  status,
  categoryName,
  categoryId,
  className,
}: UnavailableBannerProps) {
  const statusMessages: Record<EquipmentStatus, { title: string; desc: string }> = {
    out_of_stock: {
      title: 'This equipment is temporarily out of stock',
      desc: 'All units are currently deployed or reserved for active rentals. You can explore similar alternative gear below.',
    },
    inactive: {
      title: 'This listing is temporarily inactive',
      desc: 'The vendor has paused new bookings for this equipment while scheduled maintenance is underway.',
    },
    archived: {
      title: 'This equipment listing is archived',
      desc: 'This item is no longer available for booking. Browse our catalog to find comparable gear for your event.',
    },
    active: {
      title: 'Unavailable',
      desc: 'This equipment is not available for booking.',
    },
  }

  const currentInfo = statusMessages[status] || statusMessages.out_of_stock

  return (
    <div
      role="alert"
      className={cn(
        'p-4 sm:p-5 rounded-[14px] bg-amber-500/10 border border-amber-500/30 text-foreground flex flex-col sm:flex-row sm:items-center justify-between gap-4',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div className="size-9 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
          <AlertTriangle className="size-5" />
        </div>
        <div className="space-y-0.5">
          <div className="font-semibold text-sm sm:text-base text-foreground">
            {currentInfo.title}
          </div>
          <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {currentInfo.desc}
          </div>
        </div>
      </div>

      <AppLink
        to={categoryId ? `/equipment?category=${categoryId}` : '/equipment'}
        className="shrink-0"
      >
        <Button
          type="button"
          size="sm"
          className="text-xs font-semibold h-9 px-4 rounded-[8px] whitespace-nowrap"
        >
          Browse other {categoryName || 'equipment'}
        </Button>
      </AppLink>
    </div>
  )
}
