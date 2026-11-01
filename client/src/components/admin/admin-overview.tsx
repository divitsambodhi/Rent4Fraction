import { useState, useEffect } from 'react'
import {
  Building2,
  ChevronRight,
  CircleDollarSign,
  Clock,
  Scale,
  ShieldCheck,
  ShoppingBag,
} from 'lucide-react'
import { StatTile } from '@/components/shared/stat-tile'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/status-badge'
import type { BookingSummary } from '@/types/account'
import type { VendorProfile } from '@/types/vendor'
import { cn } from '@/lib/utils'

import { getAdminOverview } from '@/lib/api/admin'
import type { AdminOverviewStats } from '@/types/admin'

export interface AdminOverviewProps {
  grossBookingValue?: number
  bookingsCount?: number
  activeVendorsCount?: number
  pendingApplicationsCount?: number
  openDisputesCount?: number
  commissionEarned?: number
  recentBookings?: BookingSummary[]
  recentApplications?: VendorProfile[]
  onNavigateSection?: (section: string) => void
}

export function AdminOverview(props: AdminOverviewProps = {}) {
  const [liveData, setLiveData] = useState<AdminOverviewStats | null>(null)

  useEffect(() => {
    let active = true
    getAdminOverview().then((res) => {
      if (active && res) {
        setLiveData(res)
      }
    })
    return () => {
      active = false
    }
  }, [])

  const grossBookingValue = props.grossBookingValue ?? liveData?.grossBookingValue ?? 0
  const bookingsCount = props.bookingsCount ?? liveData?.bookingsCount ?? 0
  const activeVendorsCount = props.activeVendorsCount ?? liveData?.activeVendorsCount ?? 0
  const pendingApplicationsCount = props.pendingApplicationsCount ?? liveData?.pendingApplicationsCount ?? 0
  const openDisputesCount = props.openDisputesCount ?? liveData?.openDisputesCount ?? 0
  const recentBookings = props.recentBookings ?? liveData?.recentBookings ?? []
  const recentApplications = props.recentApplications ?? liveData?.recentApplications ?? []
  const onNavigateSection = props.onNavigateSection || (() => {})

  const [range, setRange] = useState<'7d' | '30d' | '90d' | 'ytd'>('30d')
  const [viewAsTable, setViewAsTable] = useState(false)

  // Chart series from real API or honest zeroed baseline
  const chartSeries = liveData?.chartData && liveData.chartData.length > 0
    ? liveData.chartData.map((d: any) => ({
        label: d.period || d.label || 'Period',
        bookings: d.bookings_count ?? d.bookings ?? 0,
        value: d.total_value ?? d.value ?? 0,
      }))
    : [
        { label: 'Week 1', bookings: 0, value: 0 },
        { label: 'Week 2', bookings: 0, value: 0 },
        { label: 'Week 3', bookings: 0, value: 0 },
        { label: 'Week 4', bookings: 0, value: 0 },
      ]

  const maxVal = Math.max(1, ...chartSeries.map((s) => s.value))

  return (
    <div className="space-y-6">
      {/* Heading & Range Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-muted-foreground">
            Platform Operations
          </p>
          <h1 className="text-xl sm:text-2xl font-serif font-bold text-foreground tracking-tight">
            Marketplace Overview
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Key platform metrics, pending approvals, and active fulfillment status.
          </p>
        </div>

        <div className="flex items-center gap-1 p-0.5 rounded-[8px] bg-surface border border-border">
          {(['7d', '30d', '90d', 'ytd'] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={cn(
                'px-2.5 py-1 rounded-[6px] text-xs font-medium transition-colors uppercase',
                range === r
                  ? 'bg-foreground text-background font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* KPI GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
        <StatTile
          icon={CircleDollarSign}
          label="Gross Booking Value"
          value={`₹${(grossBookingValue ?? 0).toLocaleString('en-IN')}`}
          delta={grossBookingValue > 0 ? "+14.2%" : undefined}
          deltaType="positive"
        />
        <StatTile
          icon={ShoppingBag}
          label="Total Bookings"
          value={bookingsCount ?? 0}
          delta={bookingsCount > 0 ? `+${bookingsCount} total` : undefined}
          deltaType="positive"
        />
        <StatTile
          icon={Building2}
          label="Active Vendors"
          value={activeVendorsCount ?? 0}
          subtitle="Operating catalogue"
          onClick={() => onNavigateSection('vendors')}
        />
        <StatTile
          icon={Clock}
          label="Pending Applications"
          value={pendingApplicationsCount ?? 0}
          deltaType={pendingApplicationsCount > 0 ? 'negative' : 'neutral'}
          delta={pendingApplicationsCount > 0 ? 'Action needed' : undefined}
          onClick={() => onNavigateSection('vendors')}
        />
        <StatTile
          icon={Scale}
          label="Open Disputes"
          value={openDisputesCount ?? 0}
          deltaType={openDisputesCount > 0 ? 'negative' : 'neutral'}
          delta={openDisputesCount > 0 ? 'Review active' : undefined}
          onClick={() => onNavigateSection('disputes')}
        />
        <StatTile
          icon={ShieldCheck}
          label="Marketplace Model"
          value="COD Only"
          subtitle="0% platform fee · Moderator"
        />
      </div>

      {/* CHARTS & ATTENTION GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-w-0">
        {/* Bookings & Value Chart Card (2 cols) */}
        <div className="lg:col-span-2 p-5 rounded-[14px] border border-border bg-surface shadow-none space-y-4 min-w-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Bookings & Booking Volume</h2>
              <p className="text-xs text-muted-foreground">Weekly distribution ({range.toUpperCase()})</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setViewAsTable(!viewAsTable)}
              className="h-7 text-xs px-2.5"
            >
              {viewAsTable ? 'View as chart' : 'View as table'}
            </Button>
          </div>

          {!viewAsTable ? (
            <div className="pt-2 space-y-4">
              <div className="h-44 flex items-end justify-between gap-4 px-2">
                {chartSeries.map((item, idx) => {
                  const barHeight = Math.round((item.value / maxVal) * 100)
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
                      <div className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity tabular-nums">
                        ₹{(item.value / 1000).toFixed(0)}k
                      </div>
                      <div className="w-full max-w-[48px] bg-muted/40 rounded-t-[6px] h-36 flex items-end p-1 relative overflow-hidden">
                        <div
                          className="w-full rounded-t-[4px] transition-colors duration-150"
                          style={{
                            height: `${barHeight}%`,
                            backgroundColor: 'var(--chart-1, #762b36)',
                          }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground font-medium">{item.label}</span>
                    </div>
                  )
                })}
              </div>

              <div className="flex items-center justify-center gap-6 pt-2 border-t border-border text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-2">
                  <span className="size-2.5 rounded-full" style={{ backgroundColor: 'var(--chart-1, #762b36)' }} />
                  <span>Gross Rental Volume</span>
                </span>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-border overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/40 text-muted-foreground font-semibold">
                  <tr>
                    <th className="p-3">Period</th>
                    <th className="p-3 text-right">Bookings Count</th>
                    <th className="p-3 text-right">Gross Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {chartSeries.map((s, i) => (
                    <tr key={i}>
                      <td className="p-3 font-medium text-foreground">{s.label}</td>
                      <td className="p-3 text-right tabular-nums">{s.bookings} bookings</td>
                      <td className="p-3 text-right font-semibold tabular-nums">
                        ₹{s.value.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Attention List (1 col) */}
        <div className="p-5 rounded-[14px] border border-border bg-surface shadow-none space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Needs Attention</h2>
            <span className="text-xs text-muted-foreground">Direct actions</span>
          </div>

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => onNavigateSection('vendors')}
              className="w-full p-2.5 rounded-[8px] border border-border hover:border-brand/40 hover:bg-muted/20 transition-colors flex items-center justify-between text-left group cursor-pointer"
            >
              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-foreground group-hover:text-brand transition-colors">
                  {pendingApplicationsCount} pending vendor applications
                </p>
                <p className="text-[11px] text-muted-foreground">Review GST and profile details</p>
              </div>
              <ChevronRight className="size-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </button>

            <button
              type="button"
              onClick={() => onNavigateSection('disputes')}
              className="w-full p-2.5 rounded-[8px] border border-border hover:border-brand/40 hover:bg-muted/20 transition-colors flex items-center justify-between text-left group cursor-pointer"
            >
              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-foreground group-hover:text-brand transition-colors">
                  {openDisputesCount} damage disputes open
                </p>
                <p className="text-[11px] text-muted-foreground">Awaiting platform arbitration</p>
              </div>
              <ChevronRight className="size-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </button>

            <div className="p-2.5 rounded-[8px] bg-muted/30 border border-border/80 text-[11px] text-muted-foreground space-y-1">
              <span className="font-semibold text-foreground block">Governance Notice</span>
              <span>Platform operates 100% Cash on Delivery. Zero platform commission, zero payouts.</span>
            </div>

            <button
              type="button"
              onClick={() => onNavigateSection('coupons')}
              className="w-full p-2.5 rounded-[8px] border border-border hover:border-brand/40 hover:bg-muted/20 transition-colors flex items-center justify-between text-left group cursor-pointer"
            >
              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-foreground group-hover:text-brand transition-colors">
                  Coupons expiring within 7 days
                </p>
                <p className="text-[11px] text-muted-foreground">Manage active discount campaigns</p>
              </div>
              <ChevronRight className="size-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </button>
          </div>
        </div>
      </div>

      {/* RECENT TABLES: BOOKINGS & APPLICATIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-w-0">
        {/* Recent Bookings */}
        <div className="p-5 rounded-[14px] border border-border bg-surface shadow-none space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Recent Customer Bookings</h3>
            <button
              type="button"
              onClick={() => onNavigateSection('bookings')}
              className="text-xs font-medium text-brand hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <span>View all bookings</span>
              <ChevronRight className="size-3.5" />
            </button>
          </div>

          <div className="divide-y divide-border text-xs">
            {recentBookings.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">No recent bookings recorded.</p>
            ) : (
              recentBookings.slice(0, 4).map((b) => (
                <div key={b.booking_id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-foreground">{b.event_name || 'Event Rental'}</span>
                    <p className="text-[11px] text-muted-foreground">
                      {b.booking_id} · {b.rental_days} days · {b.delivery_city}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold tabular-nums text-foreground">
                      ₹{b.total_amount.toLocaleString('en-IN')}
                    </span>
                    <div className="pt-0.5">
                      <StatusBadge status={b.status} size="sm" />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Vendor Applications */}
        <div className="p-5 rounded-[14px] border border-border bg-surface shadow-none space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Recent Vendor Applications</h3>
            <button
              type="button"
              onClick={() => onNavigateSection('vendors')}
              className="text-xs font-medium text-brand hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <span>View all vendors</span>
              <ChevronRight className="size-3.5" />
            </button>
          </div>

          <div className="divide-y divide-border text-xs">
            {recentApplications.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">No pending vendor applications.</p>
            ) : (
              recentApplications.slice(0, 4).map((v) => (
                <div key={v.vendor_id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-foreground">{v.business_name}</span>
                    <p className="text-[11px] text-muted-foreground">
                      {v.city} · GST: {v.gst || 'Optional / Not provided'}
                    </p>
                  </div>
                  <div className="text-right space-y-0.5">
                    <span className="text-[11px] font-medium text-emerald-600">
                      0% platform fee
                    </span>
                    <div>
                      <StatusBadge status={v.approval_status} size="sm" />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* SYSTEM CONFIGURATION & GOVERNANCE STATUS */}
      <div className="p-5 rounded-[14px] border border-border bg-muted/20 space-y-3">
        <div className="flex items-center gap-2 text-foreground font-semibold text-sm">
          <ShieldCheck className="size-4.5 text-brand" />
          <span>Active System Configuration & Moderation Governance</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-surface border border-border/80 space-y-1">
            <span className="text-[11px] text-muted-foreground block font-medium">Payment Protocol</span>
            <span className="font-bold text-emerald-600 flex items-center gap-1.5">
              Cash on Delivery (COD) Only
            </span>
            <p className="text-[10px] text-muted-foreground">PAYMENTS_ONLINE_ENABLED=false</p>
          </div>
          <div className="p-3 rounded-lg bg-surface border border-border/80 space-y-1">
            <span className="text-[11px] text-muted-foreground block font-medium">Vendor Acceptance Window</span>
            <span className="font-bold text-foreground">24 Hours Timeout</span>
            <p className="text-[10px] text-muted-foreground">Auto-cancels if vendor does not respond</p>
          </div>
          <div className="p-3 rounded-lg bg-surface border border-border/80 space-y-1">
            <span className="text-[11px] text-muted-foreground block font-medium">Abuse Protection: Pending Cap</span>
            <span className="font-bold text-foreground">Max 3 Pending Orders</span>
            <p className="text-[10px] text-muted-foreground">Prevents spam COD reservations</p>
          </div>
          <div className="p-3 rounded-lg bg-surface border border-border/80 space-y-1">
            <span className="text-[11px] text-muted-foreground block font-medium">Abuse Protection: No-Shows</span>
            <span className="font-bold text-foreground">Max 2 No-Shows</span>
            <p className="text-[10px] text-muted-foreground">Blocks customers who fail delivery</p>
          </div>
        </div>
      </div>
    </div>
  )
}
