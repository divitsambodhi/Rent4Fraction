import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { CheckCircle2, MapPin, Truck, AlertCircle, Loader2 } from 'lucide-react'
import { fetchPrivateDeliveryUrl } from '@/lib/cloudinary'
import { CloudImage } from '@/components/shared/cloud-image'

interface DeliveryProofDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  proofUrl?: string
  proofPublicId?: string
  deliveredBy?: string
  scheduledWindow?: string
}

export function DeliveryProofDialog({
  open,
  onOpenChange,
  proofUrl,
  proofPublicId,
  deliveredBy,
  scheduledWindow,
}: DeliveryProofDialogProps) {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const effectivePublicId =
    proofPublicId ||
    (proofUrl &&
    !proofUrl.startsWith('http://') &&
    !proofUrl.startsWith('https://') &&
    !proofUrl.startsWith('data:')
      ? proofUrl
      : undefined)

  useEffect(() => {
    if (!open) {
      setResolvedUrl(null)
      setError(null)
      return
    }

    if (effectivePublicId) {
      setIsLoading(true)
      setError(null)
      fetchPrivateDeliveryUrl(effectivePublicId)
        .then((url) => {
          setResolvedUrl(url)
        })
        .catch((err) => {
          setError(
            err instanceof Error
              ? err.message
              : 'Failed to authorize delivery proof access.'
          )
        })
        .finally(() => {
          setIsLoading(false)
        })
    } else if (proofUrl) {
      setResolvedUrl(proofUrl)
    }
  }, [open, effectivePublicId, proofUrl])

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
          {/* Proof Photo View */}
          <div className="overflow-hidden rounded-[12px] border border-border bg-muted/40 aspect-4/3 flex items-center justify-center relative">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center p-6 space-y-2 text-muted-foreground">
                <Loader2 className="size-6 animate-spin text-brand" />
                <p className="text-xs">Fetching secure proof verification...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center p-6 space-y-2 text-center text-destructive">
                <AlertCircle className="size-6" />
                <p className="text-xs font-semibold">Access Verification Failed</p>
                <p className="text-[11px] text-muted-foreground">{error}</p>
              </div>
            ) : resolvedUrl ? (
              <CloudImage
                src={resolvedUrl}
                alt="Delivery proof verification"
                preset="detail"
                aspectRatio="4/3"
                className="w-full h-full rounded-none"
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
