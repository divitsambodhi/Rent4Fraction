import { useState } from 'react'
import { AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react'
import { StatusBadge } from '@/components/shared/status-badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from './confirm-dialog'
import { DisputeDialog } from './dispute-dialog'
import { formatINR } from '@/lib/format'
import { toast } from 'sonner'
import { respondToDamageReport } from '@/lib/api'
import type { DamageReport } from '@/types/account'
import { cn } from '@/lib/utils'

interface DamageReportCardProps {
  bookingId: string
  damageReport: DamageReport
  onActionComplete?: () => void
  className?: string
}

export function DamageReportCard({
  bookingId,
  damageReport,
  onActionComplete,
  className,
}: DamageReportCardProps) {
  const [acceptOpen, setAcceptOpen] = useState(false)
  const [disputeOpen, setDisputeOpen] = useState(false)
  const [accepting, setAccepting] = useState(false)

  const handleAcceptConfirm = async () => {
    setAccepting(true)
    try {
      await respondToDamageReport(bookingId, damageReport.report_id, 'accept')
      toast.success('Damage charge accepted', {
        description: `₹${damageReport.deducted_from_deposit.toLocaleString('en-IN')} has been deducted from your security deposit. Remaining deposit will be refunded.`,
      })
      setAcceptOpen(false)
      onActionComplete?.()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not accept charge.'
      toast.error(msg)
    } finally {
      setAccepting(false)
    }
  }

  const isReported = damageReport.status === 'reported'
  const isDisputed = damageReport.status === 'disputed'
  const isResolved = damageReport.status === 'resolved'

  return (
    <div
      className={cn(
        'p-4 rounded-[12px] border space-y-3 text-xs transition-colors',
        isReported
          ? 'bg-danger/5 border-danger/30'
          : isDisputed
          ? 'bg-warning/5 border-warning/30'
          : 'bg-muted/30 border-border',
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 font-bold text-foreground">
          <ShieldAlert className="size-4 text-danger" />
          <span>Damage Report: {damageReport.equipment_name}</span>
        </div>
        <StatusBadge status={damageReport.status} size="sm" />
      </div>

      <p className="text-foreground/90 leading-relaxed">
        {damageReport.description}
      </p>

      {/* Financial Deduction Row */}
      <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface border border-border/80">
        <span className="text-muted-foreground">Proposed deposit deduction</span>
        <span className="font-bold tabular-nums text-danger font-sans text-sm">
          {formatINR(damageReport.deducted_from_deposit)}
        </span>
      </div>

      {/* Disputed State Notice */}
      {isDisputed && (
        <div className="p-3 rounded-lg bg-warning/10 border border-warning/25 text-xs text-foreground space-y-1">
          <div className="font-semibold flex items-center gap-1.5 text-warning">
            <AlertCircle className="size-4" />
            <span>Your dispute is under review by our team.</span>
          </div>
          {damageReport.dispute_reason && (
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              &ldquo;{damageReport.dispute_reason}&rdquo;
            </p>
          )}
        </div>
      )}

      {/* Resolved State Notice */}
      {isResolved && (
        <div className="p-2.5 rounded-lg bg-success/10 border border-success/20 text-xs text-success flex items-center gap-2">
          <CheckCircle2 className="size-4 shrink-0" />
          <span>Damage charge resolved and deducted from held security deposit.</span>
        </div>
      )}

      {/* Actions (Only for 'reported' status) */}
      {isReported && (
        <div className="flex items-center justify-end gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setDisputeOpen(true)}
            className="h-8 text-xs px-3"
          >
            Dispute charge
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => setAcceptOpen(true)}
            className="h-8 text-xs px-3.5 font-semibold bg-danger hover:bg-danger/90 text-white"
          >
            Accept charge
          </Button>
        </div>
      )}

      {/* Accept Confirmation Dialog */}
      {acceptOpen && (
        <ConfirmDialog
          open={acceptOpen}
          onOpenChange={setAcceptOpen}
          title="Accept Damage Charge?"
          description={
            <span>
              By accepting this report,{' '}
              <strong className="text-foreground">
                {formatINR(damageReport.deducted_from_deposit)}
              </strong>{' '}
              will be permanently deducted from your held security deposit. The remainder of your deposit will be returned to your payment method.
            </span>
          }
          confirmLabel="Accept deduction"
          variant="danger"
          loading={accepting}
          onConfirm={handleAcceptConfirm}
        />
      )}

      {/* Dispute Dialog */}
      {disputeOpen && (
        <DisputeDialog
          open={disputeOpen}
          onOpenChange={setDisputeOpen}
          bookingId={bookingId}
          reportId={damageReport.report_id}
          equipmentName={damageReport.equipment_name}
          repairCost={damageReport.deducted_from_deposit}
          onDisputeSubmitted={onActionComplete}
        />
      )}
    </div>
  )
}
