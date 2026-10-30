import { useState } from 'react'
import { AppLink } from '@/components/shared/app-link'
import { StatusBadge } from '@/components/shared/status-badge'
import { MessageVendorDialog } from '@/components/detail/message-vendor-dialog'
import { ItemRow } from './item-row'
import { DeliveryTracker } from './delivery-tracker'
import { ReturnInspectionPanel } from './return-inspection-panel'
import { DamageReportCard } from './damage-report-card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Check, MessageSquare, Store, Truck } from 'lucide-react'
import { respondToDeliveryFee } from '@/lib/api/account'
import { formatINR } from '@/lib/format'
import { toast } from 'sonner'
import type { BookingItemDetail, VendorOrder } from '@/types/account'
import { cn } from '@/lib/utils'

interface VendorOrderBlockProps {
  order: VendorOrder
  items: BookingItemDetail[]
  bookingId: string
  bookingStatus: string
  onActionComplete?: () => void
  className?: string
}

export function VendorOrderBlock({
  order,
  items,
  bookingId,
  bookingStatus,
  onActionComplete,
  className,
}: VendorOrderBlockProps) {
  const [messageOpen, setMessageOpen] = useState(false)
  const [respondingFee, setRespondingFee] = useState(false)

  const handleRespondFee = async (action: 'accept' | 'switch_to_pickup') => {
    try {
      setRespondingFee(true)
      await respondToDeliveryFee(bookingId, order.vendor_order_id, action)
      toast.success(
        action === 'accept'
          ? 'Delivery fee accepted.'
          : 'Switched to self-pickup. Delivery fee set to ₹0.'
      )
      onActionComplete?.()
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update delivery choice')
    } finally {
      setRespondingFee(false)
    }
  }

  // Find associated items for this vendor order
  const orderItems = items.filter(
    (item) => order.item_ids.includes(item.item_id) || item.vendor_id === order.vendor_id
  )

  const isRejected = order.status === 'rejected'

  return (
    <div
      className={cn(
        'p-4 rounded-[14px] bg-surface border border-border space-y-4 shadow-xs',
        className
      )}
    >
      {/* Header: Avatar, Name linking to /equipment?vendor=ID, StatusBadge, Message Vendor Button */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/70">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="size-9 rounded-full bg-brand/10 border border-brand/20 text-brand font-bold text-xs flex items-center justify-center shrink-0">
            {order.vendor_initials}
          </div>

          <div className="space-y-0.5 min-w-0">
            <AppLink
              to={`/equipment?vendor=${order.vendor_id}`}
              className="font-serif font-bold text-sm text-foreground hover:text-brand transition-colors truncate block"
            >
              {order.vendor_name}
            </AppLink>
            <div className="text-[11px] text-muted-foreground">
              Order #{order.vendor_order_id}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <StatusBadge status={order.status} size="sm" />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setMessageOpen(true)}
            className="h-8 px-2.5 text-xs text-muted-foreground hover:text-brand gap-1.5"
          >
            <MessageSquare className="size-3.5 stroke-[1.75]" />
            <span className="hidden sm:inline">Message vendor</span>
          </Button>
        </div>
      </div>

      {/* Rejected Order Alert */}
      {isRejected && (
        <div className="p-3.5 rounded-[10px] bg-danger/10 border border-danger/25 text-xs space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold text-danger">
            <AlertTriangle className="size-4 shrink-0" />
            <span>Vendor declined this portion of the rental request</span>
          </div>
          {order.rejection_reason && (
            <p className="text-foreground/90 font-medium">
              &ldquo;{order.rejection_reason}&rdquo;
            </p>
          )}
          <p className="text-muted-foreground text-[11px] leading-relaxed">
            Refunds, if applicable, follow our{' '}
            <AppLink to="/help?tab=refunds" className="text-brand font-semibold hover:underline">
              cancellation and refund policy
            </AppLink>
            .
          </p>
        </div>
      )}

      {/* Item Rows */}
      <div className="space-y-2.5">
        {orderItems.map((item) => (
          <ItemRow
            key={item.item_id}
            item={item}
            bookingId={bookingId}
            bookingStatus={bookingStatus}
            onReviewSubmitted={onActionComplete}
          />
        ))}
      </div>

      {/* Delivery Tracking (if available) */}
      {order.delivery && (
        <DeliveryTracker delivery={order.delivery} />
      )}

      {/* Vendor Quoted Delivery Fee Banner / Prompt */}
      {!isRejected && order.fulfilment_type === 'delivery' && (
        <div className="p-3.5 rounded-[12px] bg-amber-500/10 border border-amber-500/30 text-xs space-y-2.5">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <Truck className="size-3.5 text-amber-600 dark:text-amber-400" />
                Delivery Fee:{' '}
                {order.delivery_fee && order.delivery_fee > 0
                  ? formatINR(order.delivery_fee)
                  : 'Pending vendor review'}
              </span>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                {order.delivery_fee && order.delivery_fee > 0
                  ? 'Vendor calculated the delivery charge based on your venue location. You can accept this delivery charge or switch to self-pickup at no charge.'
                  : 'The vendor will review your event address/distance and calculate the custom delivery charge.'}
              </p>
            </div>
          </div>
          {order.delivery_fee !== undefined && order.delivery_fee > 0 && (
            <div className="flex items-center gap-2 pt-1">
              <Button
                size="sm"
                variant="outline"
                disabled={respondingFee}
                onClick={() => handleRespondFee('accept')}
                className="h-7 text-xs gap-1 border-amber-500/40 text-foreground hover:bg-amber-500/15"
              >
                <Check className="size-3 text-emerald-600 dark:text-emerald-400" />
                Accept Delivery Fee
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={respondingFee}
                onClick={() => handleRespondFee('switch_to_pickup')}
                className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
              >
                <Store className="size-3" />
                Switch to Self-Pickup (₹0)
              </Button>
            </div>
          )}
        </div>
      )}

      {/* When no delivery or return row is created yet */}
      {!order.delivery && !order.return && !isRejected && (
        <div className="p-3 rounded-[10px] bg-muted/40 border border-border/70 text-xs text-muted-foreground flex items-center gap-2.5">
          <Truck className="size-4 shrink-0 text-brand" />
          <span>
            {order.fulfilment_type === 'pickup'
              ? 'Pickup will be arranged by the vendor'
              : 'Delivery will be arranged by the vendor'}
          </span>
        </div>
      )}

      {/* Return & Inspection Panel (if available) */}
      {order.return && (
        <ReturnInspectionPanel returnInspection={order.return} />
      )}

      {/* Damage Reports (if any item has a damage report) */}
      {orderItems
        .filter((it) => it.damage_report !== null)
        .map((it) => (
          <DamageReportCard
            key={it.damage_report!.report_id}
            bookingId={bookingId}
            damageReport={it.damage_report!}
            onActionComplete={onActionComplete}
          />
        ))}

      {/* Message Vendor Dialog Integration */}
      {messageOpen && (
        <MessageVendorDialog
          open={messageOpen}
          onOpenChange={setMessageOpen}
          vendorId={order.vendor_id}
          vendorName={order.vendor_name}
          equipmentId={orderItems[0]?.equipment_id || 'general'}
          equipmentName={orderItems[0]?.name || 'Rental Inquiry'}
        />
      )}
    </div>
  )
}
