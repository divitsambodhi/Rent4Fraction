import { useState } from 'react'
import { ResponsiveDialog } from '@/components/ui/responsive-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ImageUploader, type UploadedImage } from '@/components/inventory/image-uploader'
import { Icon } from '@/components/ui/icon'
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
        proofPublicId: proofImages[0]?.public_id,
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
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      overlayId="delivered-dialog"
      title={`${isPickup ? 'Confirm Pickup Handover' : 'Mark Order Delivered'} - ${orderId}`}
      description={
        isPickup
          ? 'Record that the customer has received the equipment.'
          : 'Confirm physical delivery at venue with photo verification.'
      }
      className="sm:max-w-[500px]"
      footer={
        <div className="flex flex-col-reverse sm:flex-row items-center justify-end w-full gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="h-11 sm:h-9 text-xs w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || (!isPickup && proofImages.length === 0)}
            className="h-11 sm:h-9 text-xs bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto"
          >
            {isSubmitting ? 'Confirming...' : isPickup ? 'Confirm Handover' : 'Mark Delivered'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 py-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              {isPickup ? 'Handed Over By' : 'Delivered By'}
            </label>
            <Input
              value={deliveredBy}
              onChange={(e) => setDeliveredBy(e.target.value)}
              className="text-base sm:text-xs h-11 sm:h-9"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Date & Time</label>
            <Input
              type="datetime-local"
              value={deliveredAt}
              onChange={(e) => setDeliveredAt(e.target.value)}
              className="text-base sm:text-xs h-11 sm:h-9"
              required
            />
          </div>
        </div>

        {/* Proof Photo Uploader */}
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
            kind="delivery_proof"
            entityId={orderId}
          />
          <p className="text-[11px] text-muted-foreground">
            Photograph equipment placed at venue or handover desk.
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
            className="text-base sm:text-xs resize-none"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 text-destructive text-xs">
            <Icon name="alert" size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </form>
    </ResponsiveDialog>
  )
}
