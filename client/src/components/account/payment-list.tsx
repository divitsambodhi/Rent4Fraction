import { formatINR } from '@/lib/format'
import { StatusBadge } from '@/components/shared/status-badge'
import {
  Banknote,
  Building2,
  CreditCard,
  Smartphone,
  Wallet,
} from 'lucide-react'
import type { PaymentMethod, PaymentRecord } from '@/types/account'
import { format, parseISO } from 'date-fns'
import { cn } from '@/lib/utils'

interface PaymentListProps {
  payments: PaymentRecord[]
  className?: string
}

const METHOD_ICONS: Record<PaymentMethod, typeof CreditCard> = {
  upi: Smartphone,
  card: CreditCard,
  netbanking: Building2,
  cod: Banknote,
  wallet: Wallet,
  original_method: CreditCard,
  bank_transfer: Building2,
}

const METHOD_LABELS: Record<PaymentMethod, string> = {
  upi: 'UPI',
  card: 'Credit/Debit Card',
  netbanking: 'Net Banking',
  cod: 'Cash on Delivery',
  wallet: 'Digital Wallet',
  original_method: 'Original Method',
  bank_transfer: 'Bank Transfer',
}

function formatDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'dd MMM yyyy')
  } catch {
    return dateStr
  }
}

export function PaymentList({ payments, className }: PaymentListProps) {
  if (!payments || payments.length === 0) {
    return (
      <div className={cn('p-4 rounded-[12px] bg-muted/20 border border-border text-center text-xs text-muted-foreground', className)}>
        No payment records found for this booking yet.
      </div>
    )
  }

  return (
    <div className={cn('space-y-2', className)}>
      {payments.map((p) => {
        const Icon = METHOD_ICONS[p.method] || CreditCard
        const isRefund = p.type === 'refund' || p.type === 'deposit_refund' || p.status === 'refunded'

        return (
          <div
            key={p.payment_id}
            className="p-3.5 rounded-[12px] bg-surface border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
          >
            {/* Left: Method Icon & Type */}
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-full bg-muted flex items-center justify-center text-muted-foreground shrink-0 border border-border/60">
                <Icon className="size-4 stroke-[1.75]" />
              </div>
              <div className="space-y-0.5 min-w-0">
                <div className="font-semibold text-foreground flex items-center gap-2">
                  <span className="capitalize">{p.type.replace('_', ' ')}</span>
                  <StatusBadge status={p.status} size="sm" />
                </div>
                <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 flex-wrap">
                  <span>{METHOD_LABELS[p.method] || p.method}</span>
                  <span>·</span>
                  <span className="font-mono">{p.reference}</span>
                  {p.refund_reference && (
                    <>
                      <span>·</span>
                      <span className="font-mono text-brand font-medium">
                        Ref: {p.refund_reference}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Amount & Date */}
            <div className="sm:text-right flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-2 sm:pt-0 border-border/60">
              <div
                className={cn(
                  'font-bold text-sm sm:text-base tabular-nums font-sans',
                  isRefund ? 'text-success' : 'text-foreground'
                )}
              >
                {isRefund ? `−${formatINR(p.amount)}` : formatINR(p.amount)}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {formatDate(p.created_at)}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
