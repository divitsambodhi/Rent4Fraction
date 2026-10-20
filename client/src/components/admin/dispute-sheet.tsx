import { useMemo, useState } from 'react'
import {
  AlertCircle,
  Building2,
  Gavel,
  ShieldCheck,
  User,
} from 'lucide-react'
import { EntitySheet } from '@/components/shared/entity-sheet'
import { StatusBadge } from '@/components/shared/status-badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ConfirmDialog } from '@/components/account/confirm-dialog'
import { evaluateDisputeResolution, type DisputeResolutionResult } from '@/lib/lifecycle'
import { cn } from '@/lib/utils'
import type { AdminDispute } from '@/types/admin'

interface DisputeSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  dispute: AdminDispute | null
  onResolve: (reportId: string, outcome: 'full' | 'partial' | 'reject', finalAmount: number, note: string) => Promise<void>
}

export function DisputeSheet({
  open,
  onOpenChange,
  dispute,
  onResolve,
}: DisputeSheetProps) {
  const [outcome, setOutcome] = useState<'full' | 'partial' | 'reject'>('partial')
  const [partialAmount, setPartialAmount] = useState(
    dispute ? String(Math.round(dispute.claimed_amount / 2)) : '0'
  )
  const [resolutionNote, setResolutionNote] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Evaluation
  const evalResult: DisputeResolutionResult = useMemo(() => {
    if (!dispute) return { isValid: false, finalAmount: 0, deductedFromDeposit: 0 }
    return evaluateDisputeResolution(
      dispute.claimed_amount,
      dispute.deposit_held,
      outcome,
      outcome === 'partial' ? parseFloat(partialAmount) : undefined
    )
  }, [dispute, outcome, partialAmount])

  if (!dispute) return null

  const isResolved = dispute.status === 'resolved'
  // Deduction vs Refund calculation preview
  const estimatedRefund = Math.max(0, dispute.deposit_held - evalResult.deductedFromDeposit)

  const handleConfirmResolve = async () => {
    if (!evalResult.isValid) {
      setError(evalResult.error || 'Invalid dispute resolution terms.')
      return
    }
    if (resolutionNote.trim().length < 10) {
      setError('Resolution note must be at least 10 characters long.')
      return
    }

    setIsSubmitting(true)
    setError(null)
    try {
      await onResolve(
        dispute.dispute_id,
        outcome,
        evalResult.finalAmount,
        resolutionNote.trim()
      )
      setShowConfirm(false)
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
        eyebrow={`DISPUTE CASE #${dispute.dispute_id}`}
        title={`Damage Claim: ${dispute.equipment_name}`}
        subtitle={`Booking ${dispute.booking_id} · Order ${dispute.vendor_order_id}`}
        widthClass="sm:max-w-[620px]"
        headerActions={<StatusBadge status={dispute.status} />}
      >
        <div className="space-y-6">
          {/* Stakeholders & Deposit Context */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-xl border border-border bg-card space-y-1">
              <span className="text-muted-foreground flex items-center gap-1">
                <User className="size-3" /> Customer
              </span>
              <p className="font-semibold text-foreground text-sm">{dispute.customer_name}</p>
              <p className="text-[11px] text-muted-foreground truncate">{dispute.customer_email}</p>
            </div>

            <div className="p-3.5 rounded-xl border border-border bg-card space-y-1">
              <span className="text-muted-foreground flex items-center gap-1">
                <Building2 className="size-3" /> Vendor
              </span>
              <p className="font-semibold text-foreground text-sm">{dispute.vendor_name}</p>
              <p className="text-[11px] text-muted-foreground font-mono">ID: {dispute.vendor_id}</p>
            </div>
          </div>

          {/* Deposit Share Held Tile */}
          <div className="p-4 rounded-xl border border-border bg-muted/20 flex items-center justify-between text-xs">
            <div>
              <p className="font-semibold text-foreground">Security Deposit Share Held</p>
              <p className="text-[11px] text-muted-foreground">Maximum allowable deduction for this equipment</p>
            </div>
            <strong className="text-sm font-display text-foreground tabular-nums">
              ₹{dispute.deposit_held.toLocaleString('en-IN')}
            </strong>
          </div>

          {/* Vendor Claim & Customer Dispute Statements */}
          <section className="space-y-3">
            <div className="p-4 rounded-xl border border-border bg-card space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">Vendor's Damage Claim</span>
                <strong className="text-destructive font-display text-sm tabular-nums">
                  ₹{dispute.claimed_amount.toLocaleString('en-IN')}
                </strong>
              </div>
              <p className="text-muted-foreground italic">“{dispute.description}”</p>
            </div>

            <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/10 space-y-1.5 text-xs">
              <span className="font-semibold text-amber-900 dark:text-amber-300">
                Customer's Dispute Reason
              </span>
              <p className="text-amber-800/90 dark:text-amber-300/90 italic">
                “{dispute.dispute_reason || 'Customer states equipment was returned in original condition with pre-existing cosmetic marks.'}”
              </p>
            </div>
          </section>

          {/* RESOLVED CASE VIEW */}
          {isResolved ? (
            <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 space-y-3">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-semibold text-sm">
                <ShieldCheck className="size-5" />
                <span>Arbitration Finalized</span>
              </div>
              <div className="text-xs space-y-1 text-emerald-900 dark:text-emerald-200">
                <p>
                  Final Amount Awarded: <strong>₹{(dispute.deducted_from_deposit || 0).toLocaleString('en-IN')}</strong>
                </p>
                {dispute.resolved_by && <p>Resolved by: {dispute.resolved_by}</p>}
                {dispute.resolution_note && (
                  <p className="italic pt-1 border-t border-emerald-500/20">
                    Note: “{dispute.resolution_note}”
                  </p>
                )}
              </div>
            </div>
          ) : (
            /* ACTIVE ARBITRATION DECISION PANEL */
            <section className="p-4 rounded-xl border border-border bg-card space-y-4">
              <div className="flex items-center gap-2">
                <Gavel className="size-4 text-brand" />
                <h3 className="text-sm font-semibold text-foreground">Arbitration Decision</h3>
              </div>

              {/* Outcome Radios */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'full', label: 'Uphold in Full' },
                  { id: 'partial', label: 'Uphold Partially' },
                  { id: 'reject', label: 'Reject Claim' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setOutcome(opt.id as 'full' | 'partial' | 'reject')
                      setError(null)
                    }}
                    className={cn(
                      'p-2.5 rounded-xl border text-xs font-semibold text-center transition-all',
                      outcome === opt.id
                        ? 'bg-foreground text-background border-foreground shadow-xs'
                        : 'bg-card border-border text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Partial Amount Input */}
              {outcome === 'partial' && (
                <div className="space-y-1.5 text-xs">
                  <label className="font-semibold text-foreground flex items-center justify-between">
                    <span>Approved Deduction Amount (₹)</span>
                    <span className="text-[11px] text-muted-foreground">
                      Must be &gt; 0 and &lt; ₹{dispute.claimed_amount.toLocaleString('en-IN')}
                    </span>
                  </label>
                  <Input
                    type="number"
                    value={partialAmount}
                    onChange={(e) => {
                      setPartialAmount(e.target.value)
                      setError(null)
                    }}
                    className="h-9 text-xs"
                    min={1}
                    max={dispute.claimed_amount - 1}
                  />
                </div>
              )}

              {/* Live Preview Sentence */}
              <div className="p-3 rounded-xl bg-muted/40 border border-border text-xs text-foreground font-medium">
                Preview:{' '}
                <strong className="text-destructive font-semibold">
                  ₹{evalResult.deductedFromDeposit.toLocaleString('en-IN')}
                </strong>{' '}
                will be deducted from the deposit;{' '}
                <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">
                  ₹{estimatedRefund.toLocaleString('en-IN')}
                </strong>{' '}
                refunded to the customer.
              </div>

              {/* Required Resolution Note */}
              <div className="space-y-1.5 text-xs">
                <label className="font-semibold text-foreground">
                  Arbitration Note <span className="text-destructive">* (min 10 characters)</span>
                </label>
                <Textarea
                  value={resolutionNote}
                  onChange={(e) => {
                    setResolutionNote(e.target.value)
                    setError(null)
                  }}
                  placeholder="e.g. Reviewed photographic logs. Minor scratch confirmed, but electrical components function normally. Partial cost awarded."
                  rows={3}
                  className="text-xs resize-none"
                  required
                />
              </div>

              {error && (
                <div className="text-xs text-destructive flex items-center gap-1.5">
                  <AlertCircle className="size-3.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button
                type="button"
                onClick={() => setShowConfirm(true)}
                disabled={!evalResult.isValid || resolutionNote.trim().length < 10}
                className="w-full h-9 text-xs font-semibold bg-brand hover:bg-brand-hover text-brand-foreground"
              >
                Resolve Dispute
              </Button>
            </section>
          )}
        </div>
      </EntitySheet>

      {/* CONFIRM DIALOG */}
      <ConfirmDialog
        open={showConfirm}
        onOpenChange={setShowConfirm}
        title="Finalize Dispute Arbitration?"
        description={`Outcome: ${outcome.toUpperCase()}. ₹${evalResult.deductedFromDeposit.toLocaleString('en-IN')} deducted from deposit, ₹${estimatedRefund.toLocaleString('en-IN')} refunded to customer.`}
        confirmLabel="Finalize & Notify Parties"
        cancelLabel="Review Terms"
        loading={isSubmitting}
        onConfirm={handleConfirmResolve}
      />
    </>
  )
}
