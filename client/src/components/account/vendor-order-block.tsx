import { useState } from 'react'
import { AppLink } from '@/components/shared/app-link'
import { StatusBadge } from '@/components/shared/status-badge'
import { MessageVendorDialog } from '@/components/detail/message-vendor-dialog'
import { ItemRow } from './item-row'
import { DeliveryTracker } from './delivery-tracker'
import { ReturnInspectionPanel } from './return-inspection-panel'
import { DamageReportCard } from './damage-report-card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, MessageSquare } from 'lucide-react'
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
