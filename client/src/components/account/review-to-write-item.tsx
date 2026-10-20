import { useState } from 'react'
import { AppLink } from '@/components/shared/app-link'
import { Button } from '@/components/ui/button'
import { ReviewDialog } from './review-dialog'
import { CalendarDays, Star, Tag } from 'lucide-react'
import type { ReviewToWrite } from '@/types/account'
import { format, parseISO } from 'date-fns'

interface ReviewToWriteItemProps {
  item: ReviewToWrite
  onReviewSubmitted: () => void
  onOpenBooking: (bookingId: string) => void
}

function formatDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'dd MMM yyyy')
  } catch {
    return dateStr
  }
}

export function ReviewToWriteItem({
  item,
  onReviewSubmitted,
  onOpenBooking,
}: ReviewToWriteItemProps) {
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <article className="p-4 sm:p-5 rounded-[16px] bg-surface border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs hover:border-brand/40 transition-all">
      <div className="flex items-start gap-4">
        {/* Equipment Thumb */}
        <AppLink
          to={`/equipment/${item.equipment_id}`}
          className="size-16 rounded-[12px] bg-muted/40 border border-border/70 overflow-hidden shrink-0 flex items-center justify-center p-1"
        >
          <img
            src={item.equipment_image}
            alt={item.equipment_name}
            className="w-full h-full object-contain"
          />
        </AppLink>

        <div className="space-y-1">
          <AppLink
            to={`/equipment/${item.equipment_id}`}
            className="font-serif font-bold text-sm sm:text-base text-foreground hover:text-brand transition-colors line-clamp-1"
          >
            {item.equipment_name}
          </AppLink>

          <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-y-1 gap-x-3">
            <span>By <strong>{item.vendor_name}</strong></span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <CalendarDays className="size-3" />
              <span>Returned {formatDate(item.returned_date)}</span>
            </span>
          </div>

          <div>
            <button
              type="button"
              onClick={() => onOpenBooking(item.booking_id)}
              className="font-mono text-[11px] text-brand hover:underline inline-flex items-center gap-1"
            >
              <Tag className="size-3" />
              <span>Booking #{item.booking_id}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="sm:self-center">
        <Button
          type="button"
          onClick={() => setDialogOpen(true)}
          className="w-full sm:w-auto h-9 px-4 text-xs font-semibold gap-1.5"
        >
          <Star className="size-3.5 fill-current" />
          <span>Write review</span>
        </Button>
      </div>

      {dialogOpen && (
        <ReviewDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          bookingId={item.booking_id}
          equipmentId={item.equipment_id}
          equipmentName={item.equipment_name}
          vendorName={item.vendor_name}
          onReviewSubmitted={onReviewSubmitted}
        />
      )}
    </article>
  )
}
