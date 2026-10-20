import { ArrowRight, Package } from 'lucide-react'
import { AppLink } from '@/components/shared/app-link'
import { StatusBadge } from '@/components/shared/status-badge'
import type { VendorOrderSummary } from '@/types/vendor'
import { cn } from '@/lib/utils'

interface RecentOrdersTableProps {
  orders: VendorOrderSummary[]
  title?: string
  subtitle?: string
  className?: string
}

function formatCustomerInitials(fullName: string): string {
  const parts = fullName.trim().split(' ')
  if (parts.length <= 1) return fullName
  const firstName = parts[0]
  const lastInitial = parts[parts.length - 1][0]
  return `${firstName} ${lastInitial}.`
}

export function RecentOrdersTable({
  orders,
  title = 'Recent orders',
  subtitle = 'Latest activity from your customers',
  className,
}: RecentOrdersTableProps) {
  return (
    <div className={cn('rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-xs', className)}>
      <div className="flex items-center justify-between pb-4 border-b border-border/60">
        <div>
          <h2 className="font-serif text-lg font-bold text-foreground">{title}</h2>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>

        <AppLink
          to="/vendor/orders"
          className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:text-brand-hover transition-colors"
        >
          <span>View all orders</span>
          <ArrowRight className="size-3.5" />
        </AppLink>
      </div>

      <div className="mt-4">
        {orders.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground text-sm">
            <Package className="size-8 mx-auto mb-2 opacity-40" />
            <p>No recent orders found</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View (>=640px) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground font-semibold">
                    <th className="pb-3 px-3">Order</th>
                    <th className="pb-3 px-3">Customer</th>
                    <th className="pb-3 px-3">Items</th>
                    <th className="pb-3 px-3">Rental Dates</th>
                    <th className="pb-3 px-3">Status</th>
                    <th className="pb-3 px-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {orders.slice(0, 5).map((order) => (
                    <tr
                      key={order.order_id}
                      className="hover:bg-muted/30 transition-colors h-14 group"
                    >
                      <td className="px-3 py-2 font-semibold text-brand">
                        <AppLink
                          to={`/vendor/orders?order=${order.order_id}`}
                          className="hover:underline"
                        >
                          {order.order_number}
                        </AppLink>
                      </td>
                      <td className="px-3 py-2 text-foreground font-medium">
                        {formatCustomerInitials(order.customer_name)}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground max-w-[180px] truncate">
                        {order.items_summary}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                        {order.date_range} · <span className="text-foreground font-medium">{order.total_days}d</span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-foreground tabular-nums whitespace-nowrap">
                        ₹{order.amount.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View (<640px) */}
            <div className="sm:hidden space-y-3">
              {orders.slice(0, 5).map((order) => (
                <AppLink
                  key={order.order_id}
                  to={`/vendor/orders?order=${order.order_id}`}
                  className="block p-3.5 rounded-xl border border-border bg-background/50 hover:border-brand/40 transition-colors space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-brand text-xs">
                      {order.order_number}
                    </span>
                    <StatusBadge status={order.status} />
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground">
                      {formatCustomerInitials(order.customer_name)}
                    </span>
                    <span className="font-bold text-foreground tabular-nums">
                      ₹{order.amount.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <p className="text-[11px] text-muted-foreground truncate">
                    {order.items_summary}
                  </p>

                  <div className="text-[11px] text-muted-foreground/80 flex items-center justify-between pt-1 border-t border-border/50">
                    <span>{order.date_range}</span>
                    <span className="font-medium text-foreground">{order.total_days} days</span>
                  </div>
                </AppLink>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
