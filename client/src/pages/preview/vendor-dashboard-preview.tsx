import {
  ArrowUpRight,
  CheckCircle2,
  Package,
  TrendingUp,
  Truck,
} from 'lucide-react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { StatusBadge } from '@/components/shared/status-badge'
import { formatINR } from '@/lib/format'

export function VendorDashboardPreview() {
  return (
    <DashboardLayout type="vendor">
      <div className="space-y-8">
        {/* Banner */}
        <div className="p-6 rounded-[16px] bg-brand text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-brand/20">
          <div>
            <div className="text-xs font-semibold text-white/80">
              // DEV ONLY PREVIEW
            </div>
            <h2 className="font-serif text-2xl font-bold mt-1">
              Sargam Sound Systems Storefront
            </h2>
            <p className="text-sm text-white/90 mt-1">
              Mumbai & Pune Hub • Verified Touring Backline Partner
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1.5 rounded-full bg-white/20 text-xs font-semibold">
              4.9 Rating (142 reviews)
            </span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-[12px] border border-border bg-surface">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-medium">Monthly Rental Volume</span>
              <TrendingUp className="size-4 text-success" />
            </div>
            <div className="text-2xl font-bold font-sans tabular-nums text-foreground">
              {formatINR(385000)}
            </div>
            <div className="text-xs text-success flex items-center gap-1 mt-1 font-medium">
              <ArrowUpRight className="size-3" />
              <span>+18.4% from last month</span>
            </div>
          </div>

          <div className="p-5 rounded-[12px] border border-border bg-surface">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-medium">Active In-Field Orders</span>
              <Truck className="size-4 text-info" />
            </div>
            <div className="text-2xl font-bold font-sans tabular-nums text-foreground">
              6 Events
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              3 returns scheduled today
            </div>
          </div>

          <div className="p-5 rounded-[12px] border border-border bg-surface">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-medium">Listed Inventory Units</span>
              <Package className="size-4 text-brand" />
            </div>
            <div className="text-2xl font-bold font-sans tabular-nums text-foreground">
              38 SKUs
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              94% utilization rate
            </div>
          </div>

          <div className="p-5 rounded-[12px] border border-border bg-surface">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-medium">Escrow Security Held</span>
              <CheckCircle2 className="size-4 text-brand" />
            </div>
            <div className="text-2xl font-bold font-sans tabular-nums text-foreground">
              {formatINR(142000)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Zero active damage disputes
            </div>
          </div>
        </div>

        {/* Recent Dispatch Orders Table */}
        <div className="rounded-[16px] border border-border bg-surface overflow-hidden">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <div>
              <h3 className="font-serif text-lg font-semibold text-foreground">
                Upcoming Venue Dispatches
              </h3>
              <p className="text-xs text-muted-foreground">
                Staged audio equipment and technician timeline
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 text-muted-foreground uppercase text-[11px] font-semibold border-b border-border">
                <tr>
                  <th className="p-3.5 pl-5">Order ID</th>
                  <th className="p-3.5">Equipment Package</th>
                  <th className="p-3.5">Venue Location</th>
                  <th className="p-3.5">Event Dates</th>
                  <th className="p-3.5">Deposit</th>
                  <th className="p-3.5 pr-5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-foreground">
                <tr>
                  <td className="p-3.5 pl-5 font-mono font-semibold">#ORD-9024</td>
                  <td className="p-3.5 font-medium">Pro Line-Array Speaker Pair (x2)</td>
                  <td className="p-3.5 text-muted-foreground">Jio World Garden, BKC</td>
                  <td className="p-3.5 tabular-nums">24 Oct – 26 Oct</td>
                  <td className="p-3.5 tabular-nums">{formatINR(20000)}</td>
                  <td className="p-3.5 pr-5">
                    <StatusBadge status="dispatched" label="Dispatched" size="sm" />
                  </td>
                </tr>
                <tr>
                  <td className="p-3.5 pl-5 font-mono font-semibold">#ORD-9028</td>
                  <td className="p-3.5 font-medium">Wireless Handheld Mic Set (4)</td>
                  <td className="p-3.5 text-muted-foreground">The St. Regis, Lower Parel</td>
                  <td className="p-3.5 tabular-nums">28 Oct – 29 Oct</td>
                  <td className="p-3.5 tabular-nums">{formatINR(3000)}</td>
                  <td className="p-3.5 pr-5">
                    <StatusBadge status="confirmed" label="Confirmed" size="sm" />
                  </td>
                </tr>
                <tr>
                  <td className="p-3.5 pl-5 font-mono font-semibold">#ORD-9031</td>
                  <td className="p-3.5 font-medium">DJ Controller + Mixer Setup</td>
                  <td className="p-3.5 text-muted-foreground">Taj Lands End, Bandra</td>
                  <td className="p-3.5 tabular-nums">02 Nov – 03 Nov</td>
                  <td className="p-3.5 tabular-nums">{formatINR(12000)}</td>
                  <td className="p-3.5 pr-5">
                    <StatusBadge status="scheduled" label="Scheduled" size="sm" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
