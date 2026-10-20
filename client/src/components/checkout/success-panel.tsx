import { CheckCircle2, ArrowRight, ShoppingBag, ShieldCheck, Clock, Truck, RotateCcw } from 'lucide-react'
import { AppLink } from '@/components/shared/app-link'
import { StatusBadge } from '@/components/shared/status-badge'
import { Button } from '@/components/ui/button'
import { formatINR } from '@/lib/format'
import type { BookingDetail } from '@/types/account'

interface SuccessPanelProps {
  booking: BookingDetail
}

export function SuccessPanel({ booking }: SuccessPanelProps) {
  const steps = [
    {
      num: 1,
      title: 'Vendors confirm your order',
      desc: 'Each vendor reviews gear availability and approves the request (typically within 2 hours).',
      icon: Clock,
    },
    {
      num: 2,
      title: 'Fulfilment is coordinated',
      desc: 'Delivery windows and driver contacts are scheduled, or warehouse pickup instructions are sent.',
      icon: Truck,
    },
    {
      num: 3,
      title: 'Event execution & return',
      desc: 'Enjoy your event! At completion, post-event equipment pickup or return is conducted.',
      icon: RotateCcw,
    },
    {
      num: 4,
      title: 'Security deposit release',
      desc: 'Once gear return condition is verified, your refundable deposit is released immediately.',
      icon: ShieldCheck,
    },
  ]

  return (
    <div className="max-w-2xl mx-auto space-y-8 py-6">
      {/* Top Banner Card */}
      <div className="p-6 sm:p-8 rounded-[20px] bg-surface border border-border text-center space-y-4 shadow-sm">
        {/* Animated Check Icon (respects reduced motion) */}
        <div className="size-16 rounded-full bg-success/10 border border-success/30 text-success flex items-center justify-center mx-auto shadow-xs">
          <CheckCircle2 className="size-8 stroke-[2.2] animate-in zoom-in duration-300 motion-reduce:animate-none" />
        </div>

        <div className="space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block font-mono">
            BOOKING {booking.booking_id}
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-foreground">
            Booking placed successfully
          </h1>
          <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
            Your rental reservation has been recorded. Vendors have been notified and will review your
            schedule shortly.
          </p>
        </div>

        {/* Amount Pill */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 border border-border text-sm font-semibold text-foreground tabular-nums">
          <span>Total:</span>
          <span className="text-base font-bold font-sans">
            {formatINR(booking.total_amount)}
          </span>
          <span className="text-xs text-success font-medium">
            ({booking.payment_status === 'paid' ? 'Paid in full' : 'Payment on delivery'})
          </span>
        </div>

        {/* Actions */}
        <div className="pt-3 flex flex-wrap items-center justify-center gap-3">
          <AppLink to={`/account?tab=bookings&booking=${booking.booking_id}`}>
            <Button className="h-11 px-6 rounded-[12px] font-semibold gap-2 shadow-sm">
              <span>View booking details</span>
              <ArrowRight className="size-4" />
            </Button>
          </AppLink>

          <AppLink to="/equipment">
            <Button variant="outline" className="h-11 px-5 rounded-[12px] text-xs font-semibold gap-1.5">
              <ShoppingBag className="size-4" />
              <span>Continue browsing</span>
            </Button>
          </AppLink>
        </div>
      </div>

      {/* Vendor Confirmations Card */}
      <div className="p-5 sm:p-6 rounded-[18px] bg-surface border border-border space-y-4 shadow-xs">
        <div className="space-y-0.5">
          <h2 className="font-serif font-bold text-base text-foreground">
            Vendor Confirmations ({booking.vendor_orders.length})
          </h2>
          <p className="text-xs text-muted-foreground">
            Each supplier fulfills their individual part of your event schedule.
          </p>
        </div>

        <div className="space-y-2.5">
          {booking.vendor_orders.map((vOrder) => (
            <div
              key={vOrder.vendor_order_id}
              className="p-3.5 rounded-[12px] bg-muted/30 border border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
            >
              <div className="space-y-0.5">
                <span className="font-semibold text-foreground text-sm block">
                  {vOrder.vendor_name}
                </span>
                <span className="text-muted-foreground text-[11px]">
                  Waiting for vendor to confirm order #{vOrder.vendor_order_id}
                </span>
              </div>
              <StatusBadge status={vOrder.status} size="sm" />
            </div>
          ))}
        </div>
      </div>

      {/* What Happens Next Timeline */}
      <div className="p-5 sm:p-6 rounded-[18px] bg-surface border border-border space-y-5 shadow-xs">
        <h2 className="font-serif font-bold text-base text-foreground">
          What happens next
        </h2>

        <div className="space-y-5 relative pl-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-[2px] before:bg-border">
          {steps.map((st) => {
            const Icon = st.icon
            return (
              <div key={st.num} className="relative space-y-1">
                <div className="absolute -left-6 top-0 size-5 rounded-full bg-surface border-2 border-brand text-brand font-bold text-[10px] flex items-center justify-center">
                  {st.num}
                </div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-foreground">{st.title}</h3>
                  <Icon className="size-3.5 text-muted-foreground" />
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {st.desc}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
