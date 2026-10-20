import { ChevronLeft, ChevronRight, Eye, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/status-badge'
import type { VendorPayout } from '@/types/vendor'
import { cn } from '@/lib/utils'

interface PayoutsTableProps {
  payouts: VendorPayout[]
  totalCount: number
  currentPage: number
  pageSize: number
  onPageChange: (page: number) => void
  onSelectPayout: (payoutId: string) => void
  className?: string
}

export function PayoutsTable({
  payouts,
  totalCount,
  currentPage,
  pageSize,
  onPageChange,
  onSelectPayout,
  className,
}: PayoutsTableProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  const getPayoutStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <StatusBadge status="completed" label="Paid" />
      case 'processing':
        return <StatusBadge status="processing" label="Processing" />
      case 'pending':
      default:
        return <StatusBadge status="pending" label="Pending" />
    }
  }

  return (
    <div className={cn('space-y-4', className)}>
      {payouts.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-12 text-center text-muted-foreground">
          <Package className="size-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm font-medium text-foreground">No payout records found</p>
          <p className="text-xs text-muted-foreground mt-1">Try adjusting your status or time range filter.</p>
        </div>
      ) : (
        <>
          {/* Desktop Table View (>=768px) */}
          <div className="hidden md:block rounded-2xl border border-border bg-surface overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold">
                    <th className="py-3.5 px-4">Order</th>
                    <th className="py-3.5 px-4">Customer</th>
                    <th className="py-3.5 px-4 text-right">Gross</th>
                    <th className="py-3.5 px-4 text-right">Commission</th>
                    <th className="py-3.5 px-4 text-right">Net Payout</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Paid on</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {payouts.map((payout) => (
                    <tr
                      key={payout.payout_id}
                      onClick={() => onSelectPayout(payout.payout_id)}
                      className="hover:bg-muted/30 transition-colors h-14 cursor-pointer group"
                    >
                      <td className="px-4 py-2 font-semibold text-brand group-hover:underline">
                        {payout.order_number}
                      </td>
                      <td className="px-4 py-2 text-foreground font-medium">
                        {payout.customer_name}
                      </td>
                      <td className="px-4 py-2 text-right text-muted-foreground tabular-nums">
                        ₹{payout.gross_amount.toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-2 text-right text-muted-foreground tabular-nums">
                        -₹{payout.commission_amount.toLocaleString('en-IN')}{' '}
                        <span className="text-[11px] text-muted-foreground/80">({payout.commission_rate}%)</span>
                      </td>
                      <td className="px-4 py-2 text-right font-bold text-foreground tabular-nums">
                        ₹{payout.net_amount.toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        {getPayoutStatusBadge(payout.status)}
                      </td>
                      <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">
                        {payout.paid_at || 'Pending settlement'}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            onSelectPayout(payout.payout_id)
                          }}
                          className="opacity-70 group-hover:opacity-100"
                          aria-label={`View payout for ${payout.order_number}`}
                        >
                          <Eye className="size-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card View (<768px) */}
          <div className="md:hidden space-y-3">
            {payouts.map((payout) => (
              <div
                key={payout.payout_id}
                onClick={() => onSelectPayout(payout.payout_id)}
                className="p-4 rounded-xl border border-border bg-surface hover:border-brand/40 transition-colors space-y-3 cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-brand text-xs sm:text-sm">
                    {payout.order_number}
                  </span>
                  {getPayoutStatusBadge(payout.status)}
                </div>

                <div className="text-xs text-foreground font-medium">
                  {payout.customer_name}
                </div>

                <div className="grid grid-cols-3 gap-2 py-2 border-y border-border/50 text-xs">
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase block">Gross</span>
                    <span className="font-medium text-muted-foreground tabular-nums">
                      ₹{payout.gross_amount.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase block">Comm.</span>
                    <span className="font-medium text-muted-foreground tabular-nums">
                      -₹{payout.commission_amount.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-muted-foreground uppercase block">Net</span>
                    <span className="font-bold text-foreground tabular-nums">
                      ₹{payout.net_amount.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Paid on: {payout.paid_at || 'Pending'}</span>
                  <span className="text-brand font-medium">View details →</span>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-muted-foreground">
                Showing {Math.min((currentPage - 1) * pageSize + 1, totalCount)} to{' '}
                {Math.min(currentPage * pageSize, totalCount)} of {totalCount} payouts
              </span>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="h-8 px-2.5 gap-1 text-xs"
                >
                  <ChevronLeft className="size-3.5" />
                  <span>Previous</span>
                </Button>

                <span className="text-xs font-medium text-foreground px-2">
                  {currentPage} of {totalPages}
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  className="h-8 px-2.5 gap-1 text-xs"
                >
                  <span>Next</span>
                  <ChevronRight className="size-3.5" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
