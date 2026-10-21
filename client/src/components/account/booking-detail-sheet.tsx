import { useEffect, useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/status-badge'
import { AppLink } from '@/components/shared/app-link'
import { VendorOrderBlock } from './vendor-order-block'
import { PriceSummary } from './price-summary'
import { PaymentList } from './payment-list'
import { DepositSummary } from './deposit-summary'
import { ActivityTimeline } from './activity-timeline'
import { CancelBookingDialog } from './cancel-booking-dialog'
import {
  CalendarDays,
  CreditCard,
  HelpCircle,
  MapPin,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { getBookingDetail } from '@/lib/api'
import type { BookingDetail } from '@/types/account'
import { format, parseISO } from 'date-fns'

interface BookingDetailSheetProps {
  bookingId: string | null
  onClose: () => void
  onBookingUpdated?: () => void
  mode?: 'customer' | 'admin'
}

function formatDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'dd MMM yyyy')
  } catch {
    return dateStr
  }
}

export function BookingDetailSheet({
  bookingId,
  onClose,
  onBookingUpdated,
  mode = 'customer',
}: BookingDetailSheetProps) {
  const [booking, setBooking] = useState<BookingDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)

  // Fetch booking details when bookingId changes
  useEffect(() => {
    if (!bookingId) {
      setBooking(null)
      return
    }

    let isMounted = true
    setLoading(true)

    getBookingDetail(bookingId)
      .then((data) => {
        if (!isMounted) return
        if (!data) {
          toast.error(`Booking #${bookingId} not found`)
          onClose()
        } else {
          setBooking(data)
        }
      })
      .catch((err) => {
        if (!isMounted) return
        toast.error(err instanceof Error ? err.message : 'Failed to load booking details.')
        onClose()
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [bookingId, onClose])

  const refreshBooking = () => {
    if (!bookingId) return
    getBookingDetail(bookingId).then((data) => {
      if (data) setBooking(data)
      onBookingUpdated?.()
    })
  }

  const handlePayBalance = () => {
    toast.info('Online payments will be connected soon', {
      description: 'Razorpay / UPI test gateway integration is in progress.',
    })
  }

  const isOpen = Boolean(bookingId)
  const canCancel = booking?.status === 'pending' || booking?.status === 'confirmed'
  const isPartialOrUnpaid =
    booking?.payment_status === 'unpaid' || booking?.payment_status === 'partial'

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-[600px] h-[95vh] sm:h-full bottom-0 sm:bottom-auto sm:right-0 inset-x-0 sm:inset-x-auto rounded-t-[20px] sm:rounded-none p-0 flex flex-col bg-surface border-t sm:border-t-0 sm:border-l border-border shadow-none focus:outline-none"
        >
          {/* Mobile drag handle */}
          <div className="sm:hidden flex justify-center pt-2.5 pb-1">
            <div className="w-12 h-1.5 rounded-full bg-muted-foreground/30" />
          </div>

          {/* Sticky Header */}
          <header className="px-5 py-4 border-b border-border bg-surface flex items-center justify-between gap-3 shrink-0">
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-foreground bg-muted/60 px-2 py-0.5 rounded border border-border/60 tabular-nums">
                  {booking?.booking_id || bookingId}
                </span>
                {booking && <StatusBadge status={booking.status} size="sm" />}
                {booking && <StatusBadge status={booking.payment_status} size="sm" />}
              </div>
              <SheetTitle className="text-base sm:text-lg font-serif font-bold text-foreground truncate text-left">
                {booking?.event_name || 'Booking Details'}
              </SheetTitle>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="size-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0 cursor-pointer"
              aria-label="Close booking details"
            >
              <X className="size-4.5 stroke-[2]" />
            </button>
          </header>

          {/* Scrollable Sheet Content */}
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
            {loading && !booking ? (
              <div className="py-20 text-center text-xs text-muted-foreground">
                Loading booking details...
              </div>
            ) : booking ? (
              <>
                {/* 1. OVERVIEW SECTION */}
                <section className="space-y-3">
                  <h3 className="text-xs font-semibold text-muted-foreground">
                    Booking Overview
                  </h3>
                  <div className="p-4 rounded-[14px] bg-muted/30 border border-border grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="space-y-1">
                      <div className="text-muted-foreground text-[11px] flex items-center gap-1">
                        <CalendarDays className="size-3" />
                        <span>Rental dates</span>
                      </div>
                      <div className="font-semibold text-foreground">
                        {formatDate(booking.start_date)}  to  {formatDate(booking.end_date)}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {booking.rental_days} {booking.rental_days === 1 ? 'day' : 'days'} duration (inclusive)
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-muted-foreground text-[11px] flex items-center gap-1">
                        <MapPin className="size-3" />
                        <span>Venue / City</span>
                      </div>
                      <div className="font-semibold text-foreground">
                        {booking.delivery_city}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {booking.event_type} Celebration
                      </div>
                    </div>

                    <div className="sm:col-span-2 pt-2 border-t border-border/60 space-y-1">
                      <div className="text-muted-foreground text-[11px]">
                        Delivery address snapshot
                      </div>
                      <div className="text-foreground font-medium leading-relaxed">
                        {booking.delivery_address.name}
                        <br />
                        {booking.delivery_address.line1}
                        {booking.delivery_address.line2 && `, ${booking.delivery_address.line2}`}
                        <br />
                        {booking.delivery_address.city}, {booking.delivery_address.state}  to  {booking.delivery_address.pincode}
                      </div>
                    </div>
                  </div>
                </section>

                {/* 2. VENDOR ORDERS SECTION */}
                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-muted-foreground">
                      Vendor Orders ({booking.vendor_orders.length})
                    </h3>
                  </div>

                  <div className="space-y-3">
                    {booking.vendor_orders.map((order) => (
                      <VendorOrderBlock
                        key={order.vendor_order_id}
                        order={order}
                        items={booking.items}
                        bookingId={booking.booking_id}
                        bookingStatus={booking.status}
                        onActionComplete={refreshBooking}
                      />
                    ))}
                  </div>
                </section>

                {/* 3. PAYMENTS & DEPOSITS SECTION */}
                <section className="space-y-3">
                  <h3 className="text-xs font-semibold text-muted-foreground">
                    Payments & Deposit Breakdown
                  </h3>

                  {/* Payment Due Banner if unpaid/partial */}
                  {isPartialOrUnpaid && (
                    <div className="p-3.5 rounded-[12px] bg-brand/10 border border-brand/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <CreditCard className="size-5 text-brand shrink-0" />
                        <div>
                          <div className="text-xs font-bold text-foreground">
                            {booking.payment_status === 'unpaid' ? 'Payment Due' : 'Balance Payment Due'}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            Complete payment to confirm delivery logistics.
                          </div>
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        onClick={handlePayBalance}
                        className="h-8 text-xs font-semibold px-4 shrink-0"
                      >
                        Pay balance
                      </Button>
                    </div>
                  )}

                  {/* Price Summary Breakdown */}
                  <PriceSummary summary={booking.price_summary} />

                  {/* Deposit Summary Tiles */}
                  <DepositSummary deposit={booking.deposit} />

                  {/* Payment Records List */}
                  <div className="space-y-2 pt-2">
                    <h4 className="text-xs font-semibold text-foreground">
                      Transactions & Receipts
                    </h4>
                    <PaymentList payments={booking.payments} />
                  </div>
                </section>

                {/* 4. ACTIVITY TIMELINE SECTION */}
                <section className="pt-2 border-t border-border/80">
                  <ActivityTimeline activity={booking.activity} />
                </section>
              </>
            ) : null}
          </div>

          {/* Sticky Footer */}
          <footer className="px-5 py-3.5 border-t border-border bg-surface/95 backdrop-blur-md flex items-center justify-between gap-3 shrink-0">
            {mode === 'admin' ? (
              <span className="text-xs text-muted-foreground font-mono">
                Admin Console · Read-only view
              </span>
            ) : canCancel ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCancelOpen(true)}
                className="h-9 text-xs text-danger hover:bg-danger/10 hover:text-danger border-border hover:border-danger/30"
              >
                Cancel booking
              </Button>
            ) : (
              <AppLink
                to="/help?tab=contact"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-brand transition-colors"
              >
                <HelpCircle className="size-4" />
                <span>Need help? Contact support</span>
              </AppLink>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="h-9 text-xs px-4"
            >
              Close
            </Button>
          </footer>
        </SheetContent>
      </Sheet>

      {/* Cancel Booking Dialog */}
      {cancelOpen && booking && (
        <CancelBookingDialog
          open={cancelOpen}
          onOpenChange={setCancelOpen}
          bookingId={booking.booking_id}
          eventName={booking.event_name}
          onBookingCancelled={() => {
            refreshBooking()
            onClose()
          }}
        />
      )}
    </>
  )
}
