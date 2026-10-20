import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { CheckCircle2, MapPin, Truck } from 'lucide-react'

interface DeliveryProofDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  proofUrl?: string
  deliveredBy?: string
  scheduledWindow?: string
}

export function DeliveryProofDialog({
  open,
  onOpenChange,
  proofUrl,
  deliveredBy,
  scheduledWindow,
}: DeliveryProofDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-surface border-border">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2 text-success">
            <CheckCircle2 className="size-5" />
            <span className="text-xs font-semibold text-success">
              Proof of Delivery
            </span>
          </div>
          <DialogTitle className="text-xl font-bold font-serif text-foreground">
            Delivery Completed
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {scheduledWindow || 'Handover confirmed at your venue.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Proof Photo */}
          <div className="overflow-hidden rounded-[12px] border border-border bg-muted/40 aspect-4/3 flex items-center justify-center">
            {proofUrl ? (
              <img
                src={proofUrl}
                alt="Delivery proof verification"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-center p-6 space-y-2">
                <Truck className="size-8 text-muted-foreground mx-auto" />
                <p className="text-xs text-muted-foreground">
                  Signed delivery manifest recorded by logistics dispatch.
                </p>
              </div>
            )}
          </div>

          {/* Verification Details */}
          <div className="p-3 rounded-[8px] bg-muted/40 border border-border/80 text-xs space-y-1.5">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Truck className="size-3.5" />
                <span>Courier / Logistics</span>
              </span>
              <strong className="text-foreground">{deliveredBy || 'Verified Dispatch Partner'}</strong>
            </div>
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <MapPin className="size-3.5" />
                <span>Status</span>
              </span>
              <strong className="text-success">Verified On-Site Handover</strong>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-10 text-xs px-4"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
