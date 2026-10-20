import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ImageUploader, type UploadedImage } from '@/components/inventory/image-uploader'
import { CheckCircle2, ShieldAlert } from 'lucide-react'
import type { MarkDeliveredPayload } from '@/lib/lifecycle'

interface DeliveredDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orderId: string
  isPickup?: boolean
  initialDeliveredBy?: string
  onConfirm: (payload: MarkDeliveredPayload) => Promise<void>
}

export function DeliveredDialog({
  open,
  onOpenChange,
  orderId,
  isPickup = false,
  initialDeliveredBy = '',
  onConfirm,
}: DeliveredDialogProps) {
  const [deliveredBy, setDeliveredBy] = useState(initialDeliveredBy || 'Ramesh (Driver)')
  const [deliveredAt, setDeliveredAt] = useState(new Date().toISOString().slice(0, 16))
  const [proofImages, setProofImages] = useState<UploadedImage[]>([])
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!isPickup && proofImages.length === 0) {
      setError('Proof of delivery photo is required to mark delivery handoff complete.')
      return
    }

    setIsSubmitting(true)
    try {
      await onConfirm({
        deliveredBy,
        deliveredAt: new Date(deliveredAt).toISOString(),
        proofPhotoUrl: proofImages[0]?.url,
        notes,
      })
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-lg font-display font-semibold text-foreground flex items-center gap-2">
              <CheckCircle2 className="size-5 text-emerald-600" />
              <span>{isPickup ? 'Confirm Pickup Handover' : 'Mark Order Delivered'} · {orderId}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {isPickup
                ? 'Record that the customer or their authorised representative has received the equipment.'
                : 'Confirm successful physical delivery at the venue with photo verification.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  {isPickup ? 'Handed Over By' : 'Delivered By'}
                </label>
                <Input
                  value={deliveredBy}
                  onChange={(e) => setDeliveredBy(e.target.value)}
                  className="text-xs h-9"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Date & Time</label>
                <Input
                  type="datetime-local"
                  value={deliveredAt}
                  onChange={(e) => setDeliveredAt(e.target.value)}
                  className="text-xs h-9"
                  required
                />
              </div>
            </div>

            {/* Proof Photo Uploader (Mandatory for deliveries) */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>Proof of Delivery Photo</span>
                {isPickup ? (
                  <span className="text-[11px] text-muted-foreground font-normal">Optional for pickups</span>
                ) : (
                  <span className="text-[11px] text-brand font-semibold">Required</span>
                )}
              </label>

              <ImageUploader
                images={proofImages}
                onChange={setProofImages}
                maxImages={1}
              />
              <p className="text-[11px] text-muted-foreground">
                Photograph equipment assembled or placed at venue / receiving dock.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Receiving Notes <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Received in pristine condition by event coordinator Arjun."
                rows={2}
                className="text-xs resize-none"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 text-destructive text-xs">
                <ShieldAlert className="size-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="h-9 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || (!isPickup && proofImages.length === 0)}
              className="h-9 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isSubmitting ? 'Confirming...' : isPickup ? 'Confirm Handover' : 'Mark Delivered'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
