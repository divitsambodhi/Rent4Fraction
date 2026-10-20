
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  DollarSign,
  Package,
  Plus,
  RefreshCw,
  RotateCcw,
  Star,
  Store,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AppLink, useAppSearchParams } from '@/components/shared/app-link'
import { Skeleton } from '@/components/shared/loading-skeleton'
import { KpiCard } from './kpi-card'
import { EarningsChart } from './earnings-chart'
import { AttentionList, type AttentionItem } from './attention-list'
import { RecentOrdersTable } from './recent-orders-table'
import { TopEquipmentCard } from './top-equipment-card'
import { ScheduleCard } from './schedule-card'
import type { OverviewRange, VendorOverview } from '@/types/vendor'

interface OverviewTabProps {
  overview: VendorOverview | null
  loading: boolean
  error: Error | null
  onRefetch: () => void
  currentRange: OverviewRange
  onRangeChange: (range: OverviewRange) => void
}

export function OverviewTab({
  overview,
  loading,
  error,
  onRefetch,
  currentRange,
  onRangeChange,
}: OverviewTabProps) {
  const [searchParams] = useAppSearchParams()
  const simulate = searchParams.get('simulate')

  // Simulation handlers for QA/Dev
  if (simulate === 'error' || error) {
    return (
      <div className="rounded-2xl border border-danger/30 bg-danger/5 p-8 text-center space-y-4 max-w-lg mx-auto my-12">
        <AlertCircle className="size-10 text-danger mx-auto" />
        <div className="space-y-1">
          <h2 className="font-serif text-lg font-bold text-foreground">
            Unable to load overview analytics
          </h2>
          <p className="text-sm text-muted-foreground">
            {error?.message || 'A transient network error prevented loading overview metrics.'}
          </p>
        </div>
        <Button onClick={onRefetch} variant="outline" className="gap-2">
          <RefreshCw className="size-4" />
          <span>Retry</span>
        </Button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-9 w-36 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="lg:col-span-2 h-[340px] rounded-2xl" />
          <Skeleton className="h-[340px] rounded-2xl" />
        </div>
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    )
  }

  if (simulate === 'empty' || !overview || overview.kpis.equipment_listed === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-surface p-8 sm:p-12 text-center space-y-5 max-w-xl mx-auto my-10">
        <div className="size-14 rounded-2xl bg-brand/10 text-brand mx-auto flex items-center justify-center">
          <Store className="size-7" />
        </div>
        <div className="space-y-2">
          <h2 className="font-serif text-2xl font-bold text-foreground">
            Welcome to your vendor workspace!
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your storefront is live and ready for inventory. Start listing your equipment, set rental rates and security deposits, and accept orders from customers.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <AppLink to="/vendor/inventory?equipment=new">
            <Button className="bg-brand hover:bg-brand-hover text-white gap-2">
              <Plus className="size-4" />
              <span>List your first equipment</span>
            </Button>
          </AppLink>
          <AppLink to="/help?tab=how-it-works">
            <Button variant="outline">Learn how it works</Button>
          </AppLink>
        </div>
      </div>
    )
  }

  // Attention items definition
  const attentionItems: AttentionItem[] = [
    {
      id: 'pending_orders',
      label: `${overview.attention.new_orders_waiting} new orders waiting for response`,
      href: '/vendor/orders?status=pending',
      count: overview.attention.new_orders_waiting,
      icon: Package,
      tone: 'warning',
    },
    {
      id: 'returns_awaiting',
      label: `${overview.attention.returns_awaiting_inspection} returns awaiting inspection`,
      href: '/vendor/orders?tab=returns',
      count: overview.attention.returns_awaiting_inspection,
      icon: RotateCcw,
      tone: 'warning',
    },
    {
      id: 'disputed_damage',
      label: `${overview.attention.disputed_damage_reports} disputed damage reports`,
      href: '/vendor/orders?tab=returns&filter=disputed',
      count: overview.attention.disputed_damage_reports,
      icon: AlertTriangle,
      tone: 'danger',
    },
    {
      id: 'reviews_needing_reply',
      label: `${overview.attention.reviews_needing_reply} customer reviews need a reply`,
      href: '/vendor?tab=reviews&reply=needs',
      count: overview.attention.reviews_needing_reply,
      icon: Star,
      tone: 'info',
    },
    {
      id: 'low_stock_items',
      label: `${overview.attention.low_stock_items} items low on stock`,
      href: '/vendor/inventory?stock=low',
      count: overview.attention.low_stock_items,
      icon: AlertTriangle,
      tone: 'warning',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Top Greeting & Range Select */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-muted-foreground">
            Vendor Workspace
          </p>
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-foreground">
            Performance & Operations
          </h2>
        </div>

        {/* Range Selector */}
        <div className="flex items-center gap-2">
          <label htmlFor="overview-range" className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
            Time range:
          </label>
          <select
            id="overview-range"
            value={currentRange}
            onChange={(e) => onRangeChange(e.target.value as OverviewRange)}
            className="h-9 rounded-lg border border-border bg-surface px-3 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-brand cursor-pointer"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="ytd">Year to date</option>
          </select>
        </div>
      </div>

      {/* Six KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard
          label="Net earnings"
          value={`₹${overview.kpis.net_earnings.toLocaleString('en-IN')}`}
          delta={{
            value: `${overview.kpis.net_earnings_delta_percent >= 0 ? '+' : ''}${overview.kpis.net_earnings_delta_percent.toFixed(1)}%`,
            isPositive: overview.kpis.net_earnings_delta_percent >= 0,
          }}
          icon={DollarSign}
        />
        <KpiCard
          label="Pending orders"
          value={overview.kpis.pending_orders}
          delta={
            overview.kpis.pending_orders > 0
              ? { value: 'Needs response', tone: 'warning' }
              : undefined
          }
          icon={Clock3}
        />
        <KpiCard
          label="Active orders"
          value={overview.kpis.active_orders}
          delta={{ value: `${overview.kpis.active_orders_today} today`, tone: 'neutral' }}
          icon={Package}
        />
        <KpiCard
          label="Completed orders"
          value={overview.kpis.completed_orders}
          delta={{
            value: `${overview.kpis.completed_orders_delta_percent >= 0 ? '+' : ''}${overview.kpis.completed_orders_delta_percent.toFixed(1)}%`,
            isPositive: overview.kpis.completed_orders_delta_percent >= 0,
          }}
          icon={CheckCircle2}
        />
        <KpiCard
          label="Equipment listed"
          value={overview.kpis.equipment_listed}
          delta={{ value: 'Active items', tone: 'neutral' }}
          icon={Store}
        />
        <KpiCard
          label="Rating"
          value={overview.kpis.rating.toFixed(1)}
          delta={{ value: `${overview.kpis.review_count} reviews`, tone: 'neutral' }}
          icon={Star}
        />
      </div>

      {/* Grid: Earnings Chart & Attention List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <EarningsChart
            series={overview.earnings_series}
            rangeTotal={overview.kpis.net_earnings}
            deltaPercent={overview.kpis.net_earnings_delta_percent}
          />
        </div>
        <div>
          <AttentionList items={attentionItems} />
        </div>
      </div>

      {/* Recent Orders Table */}
      <RecentOrdersTable orders={overview.recent_orders} />

      {/* Two-Col: Top Equipment & Next 7 Days Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopEquipmentCard items={overview.top_equipment} />
        <ScheduleCard schedule={overview.schedule} />
      </div>
    </div>
  )
}
