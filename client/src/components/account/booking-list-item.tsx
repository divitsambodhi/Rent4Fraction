import { CalendarDays, ChevronRight, MapPin, Package } from 'lucide-react'
import { StatusBadge } from '@/components/shared/status-badge'
import { PriceText } from '@/components/shared/price-text'
import { BookingProgress } from './booking-progress'
import { ActionNeededChips } from './action-needed-chips'
import type { BookingSummary } from '@/types/account'
import { format, parseISO } from 'date-fns'

interface BookingListItemProps {
  booking: BookingSummary
  onSelect: (bookingId: string) => void
}

function formatDateRange(startDateStr: string, endDateStr: string, days: number): string {
  try {
    const s = parseISO(startDateStr)
    const e = parseISO(endDateStr)
    return `${format(s, 'dd MMM')} – ${format(e, 'dd MMM')} · ${days} ${days === 1 ? 'day' : 'days'}`
  } catch {
    return `${startDateStr} – ${endDateStr} · ${days} days`
  }
}

export function BookingListItem({ booking, onSelect }: BookingListItemProps) {
  const visibleAvatars = booking.vendor_avatars.slice(0, 3)
  const remainingAvatars = booking.vendor_avatars.length - 3

  return (
    <article
      onClick={() => onSelect(booking.booking_id)}
      className="group relative p-5 rounded-[16px] bg-surface border border-border hover:border-brand/40 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer space-y-4"
    >
      {/* Top Row: Booking Number, Status Badges, and View Details Button */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-xs font-bold text-foreground bg-muted/60 px-2 py-0.5 rounded-md border border-border/60">
            {booking.booking_id}
          </span>
          <StatusBadge status={booking.status} size="sm" />
          <StatusBadge status={booking.payment_status} size="sm" />
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onSelect(booking.booking_id)
          }}
          className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:text-brand-hover transition-colors group-hover:translate-x-0.5 transform duration-150"
        >
          <span>View details</span>
          <ChevronRight className="size-3.5 stroke-[2]" />
        </button>
      </div>

      {/* Event Title in Fraunces and Event Type Chip */}
      <div className="flex flex-wrap items-center gap-2.5">
        <h2 className="font-serif text-lg sm:text-xl font-bold text-foreground tracking-tight">
          {booking.event_name || `Booking ${booking.booking_id}`}
        </h2>
        {booking.event_type && (
          <span className="text-[11px] font-medium text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full border border-border">
            {booking.event_type}
          </span>
        )}
      </div>

      {/* Meta Row: Dates, Delivery City, Items & Vendors */}
      <div className="flex flex-wrap items-center gap-y-1.5 gap-x-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <CalendarDays className="size-3.5 stroke-[1.75] text-brand" />
          <span>{formatDateRange(booking.start_date, booking.end_date, booking.rental_days)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <MapPin className="size-3.5 stroke-[1.75]" />
          <span>{booking.delivery_city}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Package className="size-3.5 stroke-[1.75]" />
          <span>
            {booking.item_count} {booking.item_count === 1 ? 'item' : 'items'} from{' '}
            {booking.vendor_count} {booking.vendor_count === 1 ? 'vendor' : 'vendors'}
          </span>
        </div>
      </div>

      {/* Mini Progress Stepper */}
      <BookingProgress status={booking.status} />

      {/* Bottom Row: Vendor Avatars Stack, Total Price, and Action Needed Chips */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-border/60">
        <div className="flex items-center gap-3">
          {/* Vendor Avatars Stack */}
          <div className="flex items-center -space-x-1.5">
            {visibleAvatars.map((v) => (
              <div
                key={v.id}
                title={v.name}
                className="size-7 rounded-full bg-brand/10 border-2 border-surface text-brand text-[10px] font-bold flex items-center justify-center shadow-xs"
              >
                {v.initials}
              </div>
            ))}
            {remainingAvatars > 0 && (
              <div className="size-7 rounded-full bg-muted border-2 border-surface text-muted-foreground text-[10px] font-bold flex items-center justify-center">
                +{remainingAvatars}
              </div>
            )}
          </div>

          {/* Action Needed Chips */}
          <ActionNeededChips actions={booking.action_needed} />
        </div>

        {/* Total Price with caption */}
        <div className="text-right sm:self-end">
          <div className="text-[11px] text-muted-foreground font-normal">
            Total incl. deposit
          </div>
          <PriceText
            amount={booking.total_amount}
            period=""
            amountClassName="text-base sm:text-lg font-bold text-foreground"
          />
        </div>
      </div>
    </article>
  )
}
