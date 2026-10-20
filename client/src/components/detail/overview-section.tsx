import { AlertCircle, Calendar, ShieldCheck, Truck } from 'lucide-react'
import { IncludedList } from './included-list'
import type { EquipmentDetail } from '@/types'
import { cn } from '@/lib/utils'

interface OverviewSectionProps {
  equipment: EquipmentDetail
  className?: string
}

export function OverviewSection({ equipment, className }: OverviewSectionProps) {
  return (
    <section
      id="overview"
      className={cn(
        'rounded-[16px] border border-border bg-surface p-5 sm:p-7 shadow-xs space-y-6 scroll-mt-28',
        className,
      )}
      aria-labelledby="overview-heading"
    >
      <div className="space-y-1">
        <h2
          id="overview-heading"
          className="font-serif text-xl sm:text-2xl font-bold text-foreground"
        >
          Overview
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Detailed product description and operational specifications.
        </p>
      </div>

      {/* Description text */}
      <div className="text-sm sm:text-base text-foreground/90 leading-relaxed space-y-3">
        <p>{equipment.description}</p>
        <p>
          Every rental is inspected, cleaned, and performance-tested prior to release. Handled by{' '}
          <strong className="text-foreground">{equipment.vendor_name}</strong> in{' '}
          <strong className="text-foreground">{equipment.vendor.city}</strong>, ensuring
          professional support throughout your event booking.
        </p>
      </div>

      {/* What's Included */}
      <IncludedList items={equipment.includes} />

      {/* Good to Know Info Box */}
      <div className="rounded-[12px] bg-muted/50 border border-border/80 p-4 sm:p-5 space-y-3">
        <div className="flex items-center gap-2 text-foreground font-semibold text-sm">
          <AlertCircle className="size-4 text-brand stroke-[2]" />
          <span>Good to know before booking</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs sm:text-sm">
          <div className="flex items-start gap-2.5">
            <ShieldCheck className="size-4 text-brand shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-foreground">Refundable deposit</div>
              <div className="text-muted-foreground">
                ₹{equipment.security_deposit.toLocaleString('en-IN')} per unit
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <Calendar className="size-4 text-brand shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-foreground">Minimum duration</div>
              <div className="text-muted-foreground">
                {equipment.min_rental_days} day{equipment.min_rental_days > 1 ? 's' : ''} rental minimum
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <Truck className="size-4 text-brand shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-foreground">Logistics</div>
              <div className="text-muted-foreground">
                {equipment.delivery_available
                  ? 'Delivery & pickup to venue'
                  : 'Warehouse pickup only'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
