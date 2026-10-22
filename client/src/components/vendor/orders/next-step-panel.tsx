import { useState } from 'react'
import {
  AlertTriangle,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Package,
  RotateCcw,
  Truck,
  XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/account/confirm-dialog'
import { DeclineDialog } from './decline-dialog'
import { ScheduleDialog } from './schedule-dialog'
import { DeliveredDialog } from './delivered-dialog'
import { FailedDialog } from './failed-dialog'
import { ReturnScheduleDialog } from './return-schedule-dialog'
import { InspectionDialog } from './inspection-dialog'
import { allowedActions } from '@/lib/lifecycle'
import type { BookingDetail, BookingItemDetail, VendorOrder } from '@/types/account'
import type {
  InspectionPayload,
  LifecycleAction,
  MarkDeliveredPayload,
  ScheduleDeliveryPayload,
  ScheduleReturnPayload,
} from '@/lib/lifecycle'
import { cn } from '@/lib/utils'

interface NextStepPanelProps {
  order: VendorOrder
  booking: BookingDetail
  items: BookingItemDetail[]
  equipmentDeposits?: Record<string, number>
  onAction: (action: LifecycleAction, payload?: unknown) => Promise<void>
  className?: string
}

export function NextStepPanel({
  order,
  booking,
  items,
  equipmentDeposits = {},
  onAction,
  className,
}: NextStepPanelProps) {
  const actions = allowedActions(order, 'vendor', items)

  // Dialog states
  const [showAcceptConfirm, setShowAcceptConfirm] = useState(false)
  const [showDeclineDialog, setShowDeclineDialog] = useState(false)
  const [showScheduleDialog, setShowScheduleDialog] = useState(false)
  const [showDeliveredDialog, setShowDeliveredDialog] = useState(false)
  const [showFailedDialog, setShowFailedDialog] = useState(false)
  const [showReturnScheduleDialog, setShowReturnScheduleDialog] = useState(false)
  const [showInspectionDialog, setShowInspectionDialog] = useState(false)
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false)
  const [isBusy, setIsBusy] = useState(false)
  const [successAction, setSuccessAction] = useState<string | null>(null)

  const isPickup = order.fulfilment_type === 'pickup'
  const orderItems = items.filter((it) => order.item_ids.includes(it.item_id))

  // Open damage reports check
  const openDamageReports = orderItems
    .map((it) => it.damage_report)
    .filter((dr) => dr && (dr.status === 'reported' || dr.status === 'disputed'))

  const resolvedDamageReports = orderItems
    .map((it) => it.damage_report)
    .filter((dr) => dr && dr.status === 'resolved')

  const handleExecute = async (action: LifecycleAction, payload?: unknown) => {
    setIsBusy(true)
    try {
      await onAction(action, payload)
      setSuccessAction(action)
      setTimeout(() => setSuccessAction(null), 2500)
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <div className={cn('p-4 sm:p-6 rounded-[16px] border border-border bg-card shadow-xs space-y-4', className)}>
      {successAction && (
        <div className="p-3 rounded-[12px] bg-success/15 border border-success/30 text-success flex items-center gap-2 text-xs font-semibold animate-in fade-in zoom-in-95 duration-200">
          <CheckCircle2 className="size-4 shrink-0 text-success" />
          <span>Milestone updated successfully</span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Next Fulfilment Action
        </span>
        <span className="text-xs font-medium text-muted-foreground capitalize">
          Current state: <strong className="text-foreground">{order.status.replace('_', ' ')}</strong>
        </span>
      </div>

      {/* STATE 1: PENDING */}
      {order.status === 'pending' && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Review the equipment requirements, dates, and venue snapshot. Accepting reserves your stock and confirms
            fulfilment with the customer.
          </p>

          <div className="flex items-center gap-2 pt-1">
            <Button
              type="button"
              onClick={() => setShowAcceptConfirm(true)}
              disabled={isBusy}
              className="h-9 px-4 text-xs font-semibold bg-brand hover:bg-brand-hover text-brand-foreground gap-1.5"
            >
              <Check className="size-3.5" />
              <span>Accept Order</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowDeclineDialog(true)}
              disabled={isBusy}
              className="h-9 px-4 text-xs text-destructive hover:bg-destructive/10 border-destructive/30"
            >
              Decline
            </Button>
          </div>
        </div>
      )}

      {/* STATE 2: ACCEPTED */}
      {order.status === 'accepted' && (
        <div className="space-y-3">
          {actions.includes('schedule_delivery') && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Order is confirmed. Set the dispatch arrival window and assign your delivery vehicle or courier.
              </p>
              <Button
                type="button"
                onClick={() => setShowScheduleDialog(true)}
                disabled={isBusy}
                className="h-9 px-4 text-xs font-semibold bg-brand hover:bg-brand-hover text-brand-foreground gap-1.5"
              >
                <Calendar className="size-3.5" />
                <span>Schedule Delivery Window</span>
              </Button>
            </div>
          )}

          {actions.includes('schedule_pickup') && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Customer will pick up equipment at your warehouse / counter. Set the staging readiness window.
              </p>
              <Button
                type="button"
                onClick={() => setShowScheduleDialog(true)}
                disabled={isBusy}
                className="h-9 px-4 text-xs font-semibold bg-brand hover:bg-brand-hover text-brand-foreground gap-1.5"
              >
                <Calendar className="size-3.5" />
                <span>Schedule Pickup Staging</span>
              </Button>
            </div>
          )}

          {actions.includes('dispatch') && (
            <div className="space-y-2">
              <div className="p-3 rounded-xl bg-muted/40 border border-border text-xs text-muted-foreground">
                Scheduled for: <strong className="text-foreground">{order.delivery?.scheduled_window}</strong>
                {order.delivery?.delivered_by && ` via ${order.delivery.delivered_by}`}
              </div>
              <Button
                type="button"
                onClick={() => handleExecute('dispatch')}
                disabled={isBusy}
                className="h-9 px-4 text-xs font-semibold bg-brand hover:bg-brand-hover text-brand-foreground gap-1.5"
              >
                <Truck className="size-3.5" />
                <span>Mark Out for Delivery</span>
              </Button>
            </div>
          )}
        </div>
      )}

      {/* STATE 3: DISPATCHED */}
      {order.status === 'dispatched' && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Equipment is in transit. When handoff occurs, upload a proof photo to mark delivery complete.
          </p>

          <div className="flex items-center gap-2 pt-1">
            <Button
              type="button"
              onClick={() => setShowDeliveredDialog(true)}
              disabled={isBusy}
              className="h-9 px-4 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
            >
              <CheckCircle2 className="size-3.5" />
              <span>Mark Delivered</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowFailedDialog(true)}
              disabled={isBusy}
              className="h-9 px-4 text-xs text-destructive hover:bg-destructive/10 border-destructive/30 gap-1.5"
            >
              <AlertTriangle className="size-3.5" />
              <span>Delivery Failed</span>
            </Button>
          </div>
        </div>
      )}

      {/* STATE 4: DELIVERED */}
      {order.status === 'delivered' && (
        <div className="space-y-3">
          {actions.includes('schedule_return') && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Equipment is in the customer's possession. Schedule the return retrieval window.
              </p>
              <Button
                type="button"
                onClick={() => setShowReturnScheduleDialog(true)}
                disabled={isBusy}
                className="h-9 px-4 text-xs font-semibold bg-brand hover:bg-brand-hover text-brand-foreground gap-1.5"
              >
                <RotateCcw className="size-3.5" />
                <span>Schedule Return Window</span>
              </Button>
            </div>
          )}

          {actions.includes('mark_returned') && (
            <div className="space-y-2">
              <div className="p-3 rounded-xl bg-muted/40 border border-border text-xs text-muted-foreground flex items-center justify-between">
                <span>
                  Return window: <strong className="text-foreground">{order.return?.scheduled_window}</strong>
                </span>
              </div>
              <Button
                type="button"
                onClick={() => handleExecute('mark_returned')}
                disabled={isBusy}
                className="h-9 px-4 text-xs font-semibold bg-brand hover:bg-brand-hover text-brand-foreground gap-1.5"
              >
                <Check className="size-3.5" />
                <span>Mark Returned</span>
              </Button>
            </div>
          )}
        </div>
      )}

      {/* STATE 5: RETURNED */}
      {order.status === 'returned' && (
        <div className="space-y-3">
          {actions.includes('inspect') && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Equipment has been returned physically. Complete the item condition inspection to finalize the order.
              </p>
              <Button
                type="button"
                onClick={() => setShowInspectionDialog(true)}
                disabled={isBusy}
                className="h-9 px-4 text-xs font-semibold bg-brand hover:bg-brand-hover text-brand-foreground gap-1.5"
              >
                <Package className="size-3.5" />
                <span>Inspect Items</span>
              </Button>
            </div>
          )}

          {openDamageReports.length > 0 && (
            <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/10 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 dark:text-amber-300">
                <Clock className="size-4 shrink-0" />
                <span>
                  {openDamageReports.some((r) => r?.status === 'disputed')
                    ? 'Disputed: Under Review by Rent4Fraction Team'
                    : 'Damage Claim Filed: Waiting for Customer Response'}
                </span>
              </div>
              <p className="text-xs text-amber-800/80 dark:text-amber-300/80">
                Order completion will automatically become available once the customer accepts the deduction or platform admin
                resolves the dispute.
              </p>
            </div>
          )}

          {actions.includes('complete_order') && (
            <div className="space-y-2">
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300">
                {resolvedDamageReports.length > 0
                  ? 'All damage claims resolved. Order is ready to finalize.'
                  : 'Inspection verified clean. Ready to finalize.'}
              </div>
              <Button
                type="button"
                onClick={() => setShowCompleteConfirm(true)}
                disabled={isBusy}
                className="h-9 px-4 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
              >
                <CheckCircle2 className="size-3.5" />
                <span>Mark Order Completed</span>
              </Button>
            </div>
          )}
        </div>
      )}

      {/* STATE 6: COMPLETED */}
      {order.status === 'completed' && (
        <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="size-4" />
            <span>Order Completed Successfully</span>
          </div>
          <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80">
            Fulfillment is finished. Payout has been created and security deposit settled.
          </p>
        </div>
      )}

      {/* STATE 7: REJECTED OR CANCELLED */}
      {(order.status === 'rejected' || order.status === 'cancelled') && (
        <div className="p-4 rounded-xl border border-muted bg-muted/30 space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <XCircle className="size-4 text-destructive" />
            <span>Order {order.status === 'rejected' ? 'Declined' : 'Cancelled'}</span>
          </div>
          {order.rejection_reason && (
            <p className="text-xs text-muted-foreground">
              Reason recorded: <strong className="text-foreground">{order.rejection_reason}</strong>
            </p>
          )}
        </div>
      )}

      {/* ACTION DIALOGS */}
      <ConfirmDialog
        open={showAcceptConfirm}
        onOpenChange={setShowAcceptConfirm}
        title={`Accept Order ${order.vendor_order_id}?`}
        description="Confirming will reserve stock for these rental dates and notify the customer that fulfillment has begun."
        confirmLabel="Confirm & Accept"
        cancelLabel="Review Again"
        onConfirm={() => handleExecute('accept')}
      />

      <DeclineDialog
        open={showDeclineDialog}
        onOpenChange={setShowDeclineDialog}
        orderId={order.vendor_order_id}
        onConfirm={(reason) => handleExecute('decline', { reason })}
      />

      <ScheduleDialog
        open={showScheduleDialog}
        onOpenChange={setShowScheduleDialog}
        orderId={order.vendor_order_id}
        startDate={booking.start_date}
        isPickup={isPickup}
        onConfirm={(payload: ScheduleDeliveryPayload) =>
          handleExecute(isPickup ? 'schedule_pickup' : 'schedule_delivery', payload)
        }
      />

      <DeliveredDialog
        open={showDeliveredDialog}
        onOpenChange={setShowDeliveredDialog}
        orderId={order.vendor_order_id}
        isPickup={isPickup}
        initialDeliveredBy={order.delivery?.delivered_by}
        onConfirm={(payload: MarkDeliveredPayload) => handleExecute('mark_delivered', payload)}
      />

      <FailedDialog
        open={showFailedDialog}
        onOpenChange={setShowFailedDialog}
        orderId={order.vendor_order_id}
        onConfirm={(reason: string) => handleExecute('delivery_failed', { reason })}
      />

      <ReturnScheduleDialog
        open={showReturnScheduleDialog}
        onOpenChange={setShowReturnScheduleDialog}
        orderId={order.vendor_order_id}
        endDate={booking.end_date}
        onConfirm={(payload: ScheduleReturnPayload) => handleExecute('schedule_return', payload)}
      />

      <InspectionDialog
        open={showInspectionDialog}
        onOpenChange={setShowInspectionDialog}
        orderId={order.vendor_order_id}
        items={orderItems}
        equipmentDeposits={equipmentDeposits}
        onConfirm={(payload: InspectionPayload) => handleExecute('inspect', payload)}
      />

      <ConfirmDialog
        open={showCompleteConfirm}
        onOpenChange={setShowCompleteConfirm}
        title={`Finalize Order ${order.vendor_order_id}?`}
        description="This will close the rental order, trigger your vendor payout record, and release the deposit refund to the customer."
        confirmLabel="Finalize & Complete"
        cancelLabel="Back"
        onConfirm={() => handleExecute('complete_order')}
      />
    </div>
  )
}
