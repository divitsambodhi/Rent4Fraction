import { formatINR } from '@/lib/format'
import { StatusBadge } from '@/components/shared/status-badge'
import {
  Banknote,
  Building2,
  CreditCard,
  ExternalLink,
  Smartphone,
  Wallet,
} from 'lucide-react'
import type { PaymentMethod, PaymentRecord } from '@/types/account'
import { format, parseISO } from 'date-fns'
import { cn } from '@/lib/utils'

interface PaymentsTableProps {
  payments: PaymentRecord[]
  onOpenBooking: (bookingId: string) => void
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
  card: 'Card',
  netbanking: 'Netbanking',
  cod: 'Cash on delivery',
  wallet: 'Wallet',
  original_method: 'Original method',
  bank_transfer: 'Bank transfer',
}

function formatDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'dd MMM yyyy')
  } catch {
    return dateStr
  }
}

export function PaymentsTable({
  payments,
  onOpenBooking,
  className,
}: PaymentsTableProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {/* DESKTOP TABLE (Hidden on mobile <768px) */}
      <div className="hidden md:block rounded-[14px] border border-border bg-surface overflow-hidden shadow-xs">
        <div className="overflow-x-auto max-h-[600px]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-xs text-muted-foreground font-semibold border-b border-border uppercase tracking-wider text-[11px]">
              <tr>
                <th scope="col" className="py-3.5 pl-4 pr-3">
                  Date
                </th>
                <th scope="col" className="px-3 py-3.5">
                  Booking
                </th>
                <th scope="col" className="px-3 py-3.5">
                  Type
                </th>
                <th scope="col" className="px-3 py-3.5">
                  Method
                </th>
                <th scope="col" className="px-3 py-3.5 text-right">
                  Amount
                </th>
                <th scope="col" className="px-3 py-3.5">
                  Status
                </th>
                <th scope="col" className="py-3.5 pl-3 pr-4">
                  Reference
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {payments.map((p) => {
                const Icon = METHOD_ICONS[p.method] || CreditCard
                const isRefund =
                  p.type === 'refund' || p.type === 'deposit_refund' || p.status === 'refunded'

                return (
                  <tr
                    key={p.payment_id}
                    className="hover:bg-muted/30 transition-colors h-14"
                  >
                    {/* Date */}
                    <td className="py-3.5 pl-4 pr-3 whitespace-nowrap text-muted-foreground">
                      {formatDate(p.created_at)}
                    </td>

                    {/* Booking Link */}
                    <td className="px-3 py-3.5 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onOpenBooking(p.booking_id)}
                        className="font-mono text-brand font-bold hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span>{p.booking_id}</span>
                        <ExternalLink className="size-3" />
                      </button>
                    </td>

                    {/* Type */}
                    <td className="px-3 py-3.5 whitespace-nowrap capitalize text-foreground font-medium">
                      {p.type.replace('_', ' ')}
                    </td>

                    {/* Method with Icon */}
                    <td className="px-3 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Icon className="size-3.5 shrink-0" />
                        <span>{METHOD_LABELS[p.method] || p.method}</span>
                      </div>
                    </td>

                    {/* Right-aligned Tabular Amount */}
                    <td
                      className={cn(
                        'px-3 py-3.5 whitespace-nowrap text-right font-bold tabular-nums font-sans',
                        isRefund ? 'text-success' : 'text-foreground'
                      )}
                    >
                      {isRefund ? `−${formatINR(p.amount)}` : formatINR(p.amount)}
                    </td>

                    {/* Status Badge */}
                    <td className="px-3 py-3.5 whitespace-nowrap">
                      <StatusBadge status={p.status} size="sm" />
                    </td>

                    {/* Reference */}
                    <td className="py-3.5 pl-3 pr-4 whitespace-nowrap font-mono text-[11px] text-muted-foreground">
                      <div>{p.reference}</div>
                      {p.refund_reference && (
                        <div className="text-brand font-medium text-[10px]">
                          Ref: {p.refund_reference}
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MOBILE STACKED CARDS (<768px) */}
      <div className="md:hidden space-y-3">
        {payments.map((p) => {
          const Icon = METHOD_ICONS[p.method] || CreditCard
          const isRefund =
            p.type === 'refund' || p.type === 'deposit_refund' || p.status === 'refunded'

          return (
            <div
              key={p.payment_id}
              className="p-4 rounded-[14px] bg-surface border border-border space-y-2.5 shadow-xs text-xs"
            >
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => onOpenBooking(p.booking_id)}
                  className="font-mono font-bold text-brand hover:underline inline-flex items-center gap-1"
                >
                  <span>{p.booking_id}</span>
                  <ExternalLink className="size-3" />
                </button>
                <StatusBadge status={p.status} size="sm" />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Icon className="size-3.5" />
                  <span className="capitalize">{p.type.replace('_', ' ')} · {METHOD_LABELS[p.method]}</span>
                </div>
                <div
                  className={cn(
                    'font-bold text-sm tabular-nums font-sans',
                    isRefund ? 'text-success' : 'text-foreground'
                  )}
                >
                  {isRefund ? `−${formatINR(p.amount)}` : formatINR(p.amount)}
                </div>
              </div>

              <div className="pt-2 border-t border-border/70 flex items-center justify-between text-[11px] text-muted-foreground font-mono">
                <span>{formatDate(p.created_at)}</span>
                <span>{p.refund_reference || p.reference}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
