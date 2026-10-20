import { formatINR } from '@/lib/format'
import { AlertCircle, CheckCircle2, CircleDollarSign, CreditCard } from 'lucide-react'
import type { PaymentSummaryTilesData } from '@/types/account'
import { cn } from '@/lib/utils'

interface PaymentSummaryTilesProps {
  summary: PaymentSummaryTilesData
  className?: string
}

export function PaymentSummaryTiles({ summary, className }: PaymentSummaryTilesProps) {
  const tiles = [
    {
      label: 'Total paid',
      amount: summary.total_paid,
      icon: CircleDollarSign,
      color: 'text-brand bg-brand/10 border-brand/20',
      textColor: 'text-foreground',
    },
    {
      label: 'Deposits held',
      amount: summary.deposits_held,
      icon: CreditCard,
      color: 'text-info bg-info/15 border-info/30',
      textColor: 'text-foreground',
    },
    {
      label: 'Deductions',
      amount: summary.deductions,
      icon: AlertCircle,
      color: summary.deductions > 0 ? 'text-danger bg-danger/10 border-danger/20' : 'text-muted-foreground bg-muted border-border',
      textColor: summary.deductions > 0 ? 'text-danger' : 'text-foreground',
    },
    {
      label: 'Refunded',
      amount: summary.refunded,
      icon: CheckCircle2,
      color: summary.refunded > 0 ? 'text-success bg-success/15 border-success/30' : 'text-muted-foreground bg-muted border-border',
      textColor: summary.refunded > 0 ? 'text-success' : 'text-foreground',
    },
  ]

  return (
    <div className={cn('grid grid-cols-2 lg:grid-cols-4 gap-4', className)}>
      {tiles.map((tile) => {
        const Icon = tile.icon

        return (
          <div
            key={tile.label}
            className="p-4 rounded-[14px] bg-surface border border-border shadow-xs space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                {tile.label}
              </span>
              <div
                className={cn(
                  'size-7 rounded-full flex items-center justify-center border',
                  tile.color
                )}
              >
                <Icon className="size-4 stroke-[1.75]" />
              </div>
            </div>
            <div className={cn('text-xl font-bold tabular-nums font-sans', tile.textColor)}>
              {formatINR(tile.amount)}
            </div>
          </div>
        )
      })}
    </div>
  )
}
