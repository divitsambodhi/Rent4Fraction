import { useState } from 'react'
import { AlertCircle, Clock, FileText, Truck } from 'lucide-react'
import { DeliveryProofDialog } from './delivery-proof-dialog'
import { Button } from '@/components/ui/button'
import type { DeliveryTrackerData } from '@/types/account'
import { cn } from '@/lib/utils'

interface DeliveryTrackerProps {
  delivery: DeliveryTrackerData
  className?: string
}

export function DeliveryTracker({ delivery, className }: DeliveryTrackerProps) {
  const [proofOpen, setProofOpen] = useState(false)

  const isPickup = delivery.type === 'pickup'
  const isFailed = delivery.status === 'failed'

  // Step calculations
  // 1: Scheduled, 2: Out for delivery / Ready for pickup, 3: Delivered / Picked up
  let step = 1
  if (delivery.status === 'out_for_delivery') step = 2
  else if (delivery.status === 'delivered') step = 3

  const stepLabels = isPickup
    ? ['Pickup scheduled', 'Ready for pickup', 'Picked up']
    : ['Scheduled', 'Out for delivery', 'Delivered']

  return (
    <div className={cn('p-4 rounded-[12px] bg-muted/20 border border-border space-y-3', className)}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Truck className="size-4 text-brand" />
          <span className="text-xs font-bold text-foreground">
            {isPickup ? 'Venue Self-Pickup' : 'Equipment Delivery Tracking'}
          </span>
        </div>
        {delivery.delivery_proof_url && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setProofOpen(true)}
            className="h-7 text-[11px] gap-1 px-2.5"
          >
            <FileText className="size-3" />
            <span>View delivery proof</span>
          </Button>
        )}
      </div>

      {isFailed ? (
        <div className="p-2.5 rounded-lg bg-danger/10 border border-danger/20 text-xs text-danger flex items-center gap-2">
          <AlertCircle className="size-4 shrink-0" />
          <span>Delivery failed: {delivery.failure_reason || 'Could not reach venue contact.'}</span>
        </div>
      ) : (
        /* 3-Step Timeline */
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map((s) => {
              const isDone = s <= step
              return (
                <div key={s} className="space-y-1">
                  <div
                    className={cn(
                      'h-1.5 rounded-full transition-colors',
                      isDone ? 'bg-brand' : 'bg-muted'
                    )}
                  />
                  <div
                    className={cn(
                      'text-[10px] font-medium truncate',
                      isDone ? 'text-foreground font-semibold' : 'text-muted-foreground'
                    )}
                  >
                    {stepLabels[s - 1]}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Meta Window and Driver Info */}
      <div className="pt-1 flex flex-wrap items-center justify-between gap-y-1 gap-x-4 text-[11px] text-muted-foreground border-t border-border/60">
        <div className="flex items-center gap-1.5">
          <Clock className="size-3 text-muted-foreground" />
          <span>{delivery.scheduled_window}</span>
        </div>
        {delivery.tracking_info && (
          <div className="flex items-center gap-1 text-foreground font-medium">
            <span>{delivery.tracking_info}</span>
          </div>
        )}
        {delivery.delivered_by && (
          <div>
            <span>By: {delivery.delivered_by}</span>
          </div>
        )}
      </div>

      {proofOpen && (
        <DeliveryProofDialog
          open={proofOpen}
          onOpenChange={setProofOpen}
          proofUrl={delivery.delivery_proof_url}
          deliveredBy={delivery.delivered_by}
          scheduledWindow={delivery.scheduled_window}
        />
      )}
    </div>
  )
}
