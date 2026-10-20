import { useState } from 'react'
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  DollarSign,
  FileCheck,
  Package,
  ShieldAlert,
} from 'lucide-react'
import { EntitySheet } from '@/components/shared/entity-sheet'
import { StatusBadge } from '@/components/shared/status-badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ConfirmDialog } from '@/components/account/confirm-dialog'
import { cn } from '@/lib/utils'
import type { VendorProfile } from '@/types/vendor'

interface VendorReviewSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  vendor: VendorProfile | null
  equipmentCount?: number
  onApprove: (vendorId: string) => Promise<void>
  onReject: (vendorId: string, reason: string) => Promise<void>
  onSuspend: (vendorId: string, reason: string) => Promise<void>
  onReinstate: (vendorId: string) => Promise<void>
  onUpdateCommission: (vendorId: string, newRate: number) => Promise<void>
}

export function VendorReviewSheet({
  open,
  onOpenChange,
  vendor,
  equipmentCount = 0,
  onApprove,
  onReject,
  onSuspend,
  onReinstate,
  onUpdateCommission,
}: VendorReviewSheetProps) {
  if (!vendor) return null

  const [rateInput, setRateInput] = useState(String(vendor.commission_rate ?? 10))
  const [reasonInput, setReasonInput] = useState('')
  const [showReasonDialog, setShowReasonDialog] = useState<'reject' | 'suspend' | null>(null)
  const [showCommissionConfirm, setShowCommissionConfirm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // GST validation
  const gstRegex = /^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/
  const isValidGST = vendor.gst ? gstRegex.test(vendor.gst) : false

  const handleSaveCommission = async () => {
    const val = parseFloat(rateInput)
    if (isNaN(val) || val < 0 || val > 100) {
      setError('Commission rate must be a valid percentage between 0 and 100.')
      return
    }
    const rounded = Math.round(val * 100) / 100
    setIsSubmitting(true)
    setError(null)
    try {
      await onUpdateCommission(vendor.vendor_id, rounded)
      setShowCommissionConfirm(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleActionWithReason = async () => {
    if (reasonInput.trim().length < 10) {
      setError('A formal justification of at least 10 characters is required.')
      return
    }
    setIsSubmitting(true)
    setError(null)
    try {
      if (showReasonDialog === 'reject') {
        await onReject(vendor.vendor_id, reasonInput.trim())
      } else if (showReasonDialog === 'suspend') {
        await onSuspend(vendor.vendor_id, reasonInput.trim())
      }
      setShowReasonDialog(null)
      setReasonInput('')
      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <EntitySheet
        open={open}
        onOpenChange={onOpenChange}
        eyebrow="VENDOR PARTNER REVIEW"
        title={vendor.business_name}
        subtitle={`Member since ${vendor.member_since} · ${vendor.city}`}
        widthClass="sm:max-w-[600px]"
        headerActions={<StatusBadge status={vendor.approval_status} />}
      >
        <div className="space-y-6">
          {/* Business & Legal Overview */}
          <section className="p-4 rounded-xl border border-border bg-card space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Building2 className="size-3.5" />
              <span>Business & Legal Verification</span>
            </span>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-muted-foreground">Owner Name</span>
                <p className="font-semibold text-foreground">{vendor.owner_name}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Contact Email</span>
                <p className="font-semibold text-foreground truncate">{vendor.email}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Contact Phone</span>
                <p className="font-semibold text-foreground">{vendor.phone}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Registered City</span>
                <p className="font-semibold text-foreground">{vendor.city}</p>
              </div>
            </div>

            <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
              <div>
                <span className="text-muted-foreground">GSTIN Number:</span>
                <strong className="ml-1 text-foreground font-mono">{vendor.gst || 'Not provided'}</strong>
              </div>
              {vendor.gst && (
                <span
                  className={cn(
                    'text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1',
                    isValidGST
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                  )}
                >
                  {isValidGST ? <FileCheck className="size-3" /> : <AlertCircle className="size-3" />}
                  <span>{isValidGST ? 'Valid GSTIN format' : 'Invalid format'}</span>
                </span>
              )}
            </div>

            <div className="text-xs pt-1">
              <span className="text-muted-foreground">Registered Address:</span>
              <p className="text-foreground mt-0.5">{vendor.address}</p>
            </div>
          </section>

          {/* Catalogue & Inventory Stats */}
          <section className="p-4 rounded-xl border border-border bg-card flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Package className="size-4 text-brand" />
              <span className="font-medium text-foreground">Catalogue Listings</span>
            </div>
            <strong className="text-foreground tabular-nums text-sm">
              {equipmentCount} active item{equipmentCount !== 1 ? 's' : ''}
            </strong>
          </section>

          {/* Commission Rate Settings */}
          <section className="p-4 rounded-xl border border-border bg-card space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <DollarSign className="size-3.5" />
                <span>Platform Commission Rate</span>
              </span>
              <span className="text-xs font-semibold text-brand">{vendor.commission_rate}% current</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={rateInput}
                  onChange={(e) => setRateInput(e.target.value)}
                  className="text-xs h-9 pr-7"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setShowCommissionConfirm(true)}
                disabled={parseFloat(rateInput) === vendor.commission_rate}
                className="h-9 text-xs"
              >
                Update Rate
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground italic">
              Changes apply to newly completed orders and future payouts. Existing processed payouts remain unaffected.
            </p>
          </section>

          {/* Rejection / Suspension Notice if applicable */}
          {vendor.rejection_reason && (
            <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive space-y-1">
              <span className="font-semibold flex items-center gap-1">
                <ShieldAlert className="size-3.5" /> Reason Recorded:
              </span>
              <p>{vendor.rejection_reason}</p>
            </div>
          )}

          {/* Decision Panel */}
          <section className="p-4 rounded-xl border border-border bg-muted/20 space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Administrative Decision
            </span>

            <div className="flex flex-wrap items-center gap-2">
              {vendor.approval_status === 'pending' && (
                <>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => onApprove(vendor.vendor_id)}
                    className="h-9 px-4 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                  >
                    <CheckCircle2 className="size-3.5" />
                    <span>Approve Application</span>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setShowReasonDialog('reject')
                      setReasonInput('')
                    }}
                    className="h-9 px-4 text-xs text-destructive hover:bg-destructive/10 border-destructive/30"
                  >
                    Reject
                  </Button>
                </>
              )}

              {vendor.approval_status === 'approved' && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setShowReasonDialog('suspend')
                    setReasonInput('')
                  }}
                  className="h-9 px-4 text-xs text-destructive hover:bg-destructive/10 border-destructive/30 gap-1.5"
                >
                  <ShieldAlert className="size-3.5" />
                  <span>Suspend Account</span>
                </Button>
              )}

              {vendor.approval_status === 'suspended' && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => onReinstate(vendor.vendor_id)}
                  className="h-9 px-4 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                >
                  <CheckCircle2 className="size-3.5" />
                  <span>Reinstate Account</span>
                </Button>
              )}

              {vendor.approval_status === 'rejected' && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => onApprove(vendor.vendor_id)}
                  className="h-9 px-4 text-xs font-semibold bg-brand hover:bg-brand-hover text-brand-foreground gap-1.5"
                >
                  <CheckCircle2 className="size-3.5" />
                  <span>Approve After Review</span>
                </Button>
              )}
            </div>
          </section>
        </div>
      </EntitySheet>

      {/* REASON MODAL (Reject or Suspend) */}
      {showReasonDialog && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-card rounded-2xl border border-border p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-display font-semibold text-foreground flex items-center gap-2">
              <ShieldAlert className="size-4 text-destructive" />
              <span>{showReasonDialog === 'reject' ? 'Reject Application' : 'Suspend Vendor Account'}</span>
            </h3>
            <p className="text-xs text-muted-foreground">
              Provide a clear reason for the vendor. This justification will be displayed in their vendor portal.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Justification <span className="text-destructive">* (min 10 characters)</span>
              </label>
              <Textarea
                value={reasonInput}
                onChange={(e) => setReasonInput(e.target.value)}
                placeholder="e.g. Incomplete GSTIN verification document provided."
                rows={3}
                className="text-xs resize-none"
              />
            </div>

            {error && (
              <div className="text-xs text-destructive flex items-center gap-1.5">
                <AlertCircle className="size-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowReasonDialog(null)}
                className="h-8 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={handleActionWithReason}
                disabled={isSubmitting || reasonInput.trim().length < 10}
                className="h-8 text-xs"
              >
                {isSubmitting ? 'Saving...' : 'Confirm Action'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* COMMISSION CONFIRM */}
      <ConfirmDialog
        open={showCommissionConfirm}
        onOpenChange={setShowCommissionConfirm}
        title="Update Commission Rate?"
        description={`Set platform commission for ${vendor.business_name} to ${rateInput}%?`}
        confirmLabel="Confirm Rate Change"
        cancelLabel="Cancel"
        onConfirm={handleSaveCommission}
      />
    </>
  )
}
