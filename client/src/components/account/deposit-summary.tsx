import { formatINR } from '@/lib/format'
import { AlertCircle, CheckCircle2, Clock, ShieldCheck } from 'lucide-react'
import type { DepositSummaryData } from '@/types/account'
import { cn } from '@/lib/utils'

interface DepositSummaryProps {
  deposit: DepositSummaryData
  className?: string
}

export function DepositSummary({ deposit, className }: DepositSummaryProps) {
  const tiles = [
    {
      label: 'Deposit held',
      amount: deposit.held,
      icon: ShieldCheck,
      color: 'text-brand bg-brand/10 border-brand/20',
      textColor: 'text-foreground',
    },
    {
      label: 'Deductions',
      amount: deposit.deducted,
      icon: AlertCircle,
      color: deposit.deducted > 0 ? 'text-danger bg-danger/10 border-danger/20' : 'text-muted-foreground bg-muted border-border',
      textColor: deposit.deducted > 0 ? 'text-danger' : 'text-foreground',
    },
    {
      label: 'Refunded',
      amount: deposit.refunded,
      icon: CheckCircle2,
      color: deposit.refunded > 0 ? 'text-success bg-success/15 border-success/30' : 'text-muted-foreground bg-muted border-border',
      textColor: deposit.refunded > 0 ? 'text-success' : 'text-foreground',
    },
    {
      label: 'Pending refund',
      amount: deposit.pending_refund,
      icon: Clock,
      color: deposit.pending_refund > 0 ? 'text-warning bg-warning/15 border-warning/30' : 'text-muted-foreground bg-muted border-border',
      textColor: 'text-foreground',
    },
  ]

  return (
    <div className={cn('grid grid-cols-2 md:grid-cols-4 gap-2.5', className)}>
      {tiles.map((tile) => {
        const Icon = tile.icon
        return (
          <div
            key={tile.label}
            className="p-3 rounded-[12px] bg-surface border border-border space-y-1.5"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-muted-foreground">
                {tile.label}
              </span>
              <div
                className={cn(
                  'size-6 rounded-full flex items-center justify-center border',
                  tile.color
                )}
              >
                <Icon className="size-3.5 stroke-[2]" />
              </div>
            </div>
            <div className={cn('text-base font-bold tabular-nums', tile.textColor)}>
              {formatINR(tile.amount)}
            </div>
          </div>
        )
      })}
    </div>
  )
}
