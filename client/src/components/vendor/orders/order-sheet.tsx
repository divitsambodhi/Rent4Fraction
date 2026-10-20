import { useState } from 'react'
import {
  Check,
  CheckCircle2,
  Copy,
  MapPin,
  MessageSquare,
  Package,
  User,
} from 'lucide-react'
import { EntitySheet } from '@/components/shared/entity-sheet'
import { StatusBadge } from '@/components/shared/status-badge'
import { DeliveryTracker } from '@/components/account/delivery-tracker'
import { ItemConditionBadge } from '@/components/account/return-inspection-panel'
import { DamageReportCard } from '@/components/account/damage-report-card'
import { ActivityTimeline } from '@/components/account/activity-timeline'
import { NextStepPanel } from './next-step-panel'
import { AppLink } from '@/components/shared/app-link'
import { calculatePayout } from '@/lib/lifecycle'
import { toast } from 'sonner'
import type { BookingDetail, VendorOrder } from '@/types/account'
import type { LifecycleAction } from '@/lib/lifecycle'

interface OrderSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  order: VendorOrder | null
  booking: BookingDetail | null
  commissionRate?: number
  equipmentDeposits?: Record<string, number>
  onAction: (action: LifecycleAction, payload?: unknown) => Promise<void>
}

export function OrderSheet({
  open,
  onOpenChange,
  order,
  booking,
  commissionRate = 10,
  equipmentDeposits = {},
  onAction,
}: OrderSheetProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null)

  if (!order || !booking) return null

  const orderItems = booking.items.filter((it) => order.item_ids.includes(it.item_id))
  const payout = calculatePayout(order.subtotal, commissionRate)

  // Copy helper
  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(label)
    toast.success(`Copied ${label} to clipboard.`)
    setTimeout(() => setCopiedField(null), 2000)
  }

  // Calculate deposit share
  const depositShare = orderItems.reduce((sum, it) => {
    const unitDep = equipmentDeposits[it.equipment_id] ?? 2000
    return sum + unitDep * (it.quantity || 1)
  }, 0)

  const addr = booking.delivery_address

  return (
    <EntitySheet
      open={open}
      onOpenChange={onOpenChange}
      eyebrow={`ORDER #${order.vendor_order_id}`}
      title={booking.event_name || 'Event Rental'}
      subtitle={`Booking ${booking.booking_id} · Rental: ${booking.rental_days} day${booking.rental_days > 1 ? 's' : ''}`}
      widthClass="sm:max-w-[640px]"
      headerActions={
        <div className="flex items-center gap-2">
          <StatusBadge status={order.status} size="sm" />
          <AppLink
            to={`/vendor?tab=inbox&contact=${encodeURIComponent(addr.name)}`}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-medium text-foreground hover:bg-muted/40 transition-colors"
          >
            <MessageSquare className="size-3.5 text-brand" />
            <span>Message customer</span>
          </AppLink>
        </div>
      }
    >
      <div className="space-y-6">
        {/* 1. CUSTOMER & EVENT DETAILS */}
        <section className="p-4 sm:p-5 rounded-[14px] border border-border bg-surface shadow-none space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <User className="size-3.5" />
              <span>Customer & Event Details</span>
            </span>
            <span className="text-xs text-muted-foreground">{booking.event_type}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <span className="text-muted-foreground font-medium">Customer Name</span>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground text-sm">{addr.name}</span>
                <button
                  type="button"
                  onClick={() => handleCopy(addr.name, 'Customer Name')}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {copiedField === 'Customer Name' ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-muted-foreground font-medium">Event Date Range</span>
              <p className="font-semibold text-foreground">
                {booking.start_date} to {booking.end_date}
              </p>
            </div>
          </div>

          {/* Delivery Address Snapshot */}
          <div className="p-3 rounded-[10px] bg-muted/20 border border-border space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <MapPin className="size-3.5 text-brand" />
                <span>Venue Address Snapshot</span>
              </span>
              <button
                type="button"
                onClick={() =>
                  handleCopy(
                    `${addr.name}, ${addr.line1}, ${addr.line2 || ''}, ${addr.city}, ${addr.state} - ${addr.pincode}`,
                    'Address'
                  )
                }
                className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-[11px]"
              >
                {copiedField === 'Address' ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
                <span>Copy address</span>
              </button>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              {addr.line1}
              {addr.line2 ? `, ${addr.line2}` : ''}
              <br />
              {addr.city}, {addr.state} - {addr.pincode}
            </p>
          </div>
        </section>

        {/* 2. ORDER ITEMS & AVAILABILITY CHECK */}
        <section className="p-4 sm:p-5 rounded-[14px] border border-border bg-surface shadow-none space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Package className="size-3.5" />
              <span>Rental Equipment ({orderItems.length})</span>
            </span>
            <span className="text-xs font-semibold text-foreground">
              {order.fulfilment_type === 'pickup' ? 'Self-Pickup' : 'Delivery'}
            </span>
          </div>

          {/* Availability guarantee pill */}
          <div className="p-2.5 px-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300 font-medium">
            <CheckCircle2 className="size-4 shrink-0" />
            <span>All equipment confirmed available in your inventory for these dates.</span>
          </div>

          <div className="divide-y divide-border">
            {orderItems.map((it) => (
              <div key={it.item_id} className="py-3 flex items-start justify-between gap-3 first:pt-0 last:pb-0">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">{it.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Quantity: {it.quantity} · Rate: ₹{it.unit_price.toLocaleString('en-IN')}/day
                  </p>
                  {it.damage_report && (
                    <div className="pt-1">
                      <ItemConditionBadge condition={it.damage_report.status === 'resolved' ? 'Minor damage' : 'Good'} />
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-sm font-display font-semibold text-foreground tabular-nums">
                    ₹{it.total_price.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 3. NEXT STEP ACTION PANEL */}
        <NextStepPanel
          order={order}
          booking={booking}
          items={booking.items}
          equipmentDeposits={equipmentDeposits}
          onAction={onAction}
        />

        {/* 4. FULFILMENT TRACKER & TIMELINES */}
        <section className="space-y-4">
          {order.delivery && (
            <DeliveryTracker delivery={order.delivery} />
          )}

          {/* Damage reports if filed */}
          {orderItems.some((it) => it.damage_report) && (
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-muted-foreground">
                Damage Assessment Reports
              </h4>
              {orderItems
                .filter((it) => it.damage_report)
                .map((it) => (
                  <DamageReportCard
                    key={it.item_id}
                    bookingId={booking.booking_id}
                    damageReport={it.damage_report!}
                  />
                ))}
            </div>
          )}
        </section>

        {/* 5. FINANCIAL BREAKDOWN */}
        <section className="p-4 sm:p-5 rounded-[14px] border border-border bg-surface shadow-none space-y-4">
          <span className="text-xs font-medium text-muted-foreground">
            Payout & Security Deposit Breakdown
          </span>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between py-1">
              <span className="text-muted-foreground">Vendor Subtotal (Gross)</span>
              <strong className="text-foreground tabular-nums">₹{payout.gross.toLocaleString('en-IN')}</strong>
            </div>

            <div className="flex items-center justify-between py-1 text-muted-foreground">
              <span>Platform Commission ({commissionRate}%)</span>
              <span className="text-destructive tabular-nums">−₹{payout.commission.toLocaleString('en-IN')}</span>
            </div>

            <div className="flex items-center justify-between py-2 border-t border-border font-semibold text-sm">
              <span className="text-foreground">Net Vendor Payout</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-display tabular-nums">
                ₹{payout.net.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="p-3 rounded-[10px] bg-muted/20 border border-border flex items-center justify-between">
              <div>
                <p className="font-semibold text-foreground text-xs">Deposit Share Held</p>
                <p className="text-[11px] text-muted-foreground">Secures physical items for this order</p>
              </div>
              <span className="text-xs font-bold text-foreground tabular-nums">
                ₹{depositShare.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground italic">
            Security deposits are handled and refunded by Rent4Fraction.
          </p>
        </section>

        {/* 6. ACTIVITY TIMELINE */}
        <section className="space-y-3">
          <h4 className="text-xs font-semibold text-muted-foreground">
            Order Activity History
          </h4>
          <ActivityTimeline activity={booking.activity} />
        </section>
      </div>
    </EntitySheet>
  )
}
