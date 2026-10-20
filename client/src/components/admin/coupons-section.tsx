import { useState, useMemo } from 'react'
import { FilterBar } from '@/components/shared/filter-bar'
import { DataTable, type Column } from '@/components/shared/data-table'
import { Button } from '@/components/ui/button'
import {
  getAdminCoupons,
  saveAdminCoupon,
  toggleAdminCouponActive,
} from '@/lib/api/admin-store'
import { CouponFormSheet } from './coupon-form-sheet'
import { deriveCouponStatus, type CouponDerivedStatus } from '@/types/admin'
import type { Coupon } from '@/types/checkout'
import { formatRupees } from '@/lib/pricing'
import { Tag, Plus, Edit2, PowerOff, Check } from 'lucide-react'
import { toast } from 'sonner'

interface CouponsSectionProps {
  statusFilter?: string
  searchQuery?: string
  selectedCouponCode?: string | null
  onStatusChange: (status: string) => void
  onSearchChange: (q: string) => void
  onSelectCoupon: (code: string | null) => void
}

type CouponWithStatus = Coupon & { derivedStatus: CouponDerivedStatus }

export function CouponsSection({
  statusFilter = 'all',
  searchQuery = '',
  selectedCouponCode,
  onStatusChange,
  onSearchChange,
  onSelectCoupon,
}: CouponsSectionProps) {
  const [version, setVersion] = useState(0)

  const allCoupons = useMemo(() => {
    return getAdminCoupons()
  }, [version])

  const couponsWithStatus: CouponWithStatus[] = useMemo(() => {
    return allCoupons.map((c) => ({
      ...c,
      derivedStatus: deriveCouponStatus(c),
    }))
  }, [allCoupons])

  const counts = useMemo(() => {
    return {
      all: couponsWithStatus.length,
      active: couponsWithStatus.filter((c) => c.derivedStatus === 'active').length,
      scheduled: couponsWithStatus.filter((c) => c.derivedStatus === 'scheduled').length,
      expired: couponsWithStatus.filter((c) => c.derivedStatus === 'expired').length,
      inactive: couponsWithStatus.filter((c) => c.derivedStatus === 'inactive').length,
      limit_reached: couponsWithStatus.filter((c) => c.derivedStatus === 'limit_reached').length,
    }
  }, [couponsWithStatus])

  const filteredCoupons = useMemo(() => {
    return couponsWithStatus.filter((coupon) => {
      if (statusFilter !== 'all' && coupon.derivedStatus !== statusFilter) {
        return false
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchCode = coupon.code.toLowerCase().includes(q)
        const matchDesc = coupon.description?.toLowerCase().includes(q)
        if (!matchCode && !matchDesc) return false
      }
      return true
    })
  }, [couponsWithStatus, statusFilter, searchQuery])

  const handleToggleActive = (coupon: Coupon) => {
    const nextState = !coupon.is_active
    toggleAdminCouponActive(coupon.code, nextState)
    toast.success(
      nextState
        ? `Coupon ${coupon.code} activated`
        : `Coupon ${coupon.code} deactivated`
    )
    setVersion((v) => v + 1)
  }

  const activeCoupon = selectedCouponCode && selectedCouponCode !== 'new'
    ? allCoupons.find((c) => c.code === selectedCouponCode) || null
    : null

  const columns: Column<CouponWithStatus>[] = [
    {
      id: 'code',
      header: 'Coupon Code',
      accessor: (c) => (
        <div className="flex items-center gap-2">
          <Tag className="size-3.5 text-brand shrink-0" />
          <span className="font-mono font-bold text-xs text-foreground bg-muted/60 px-2 py-0.5 rounded border border-border/60">
            {c.code}
          </span>
        </div>
      ),
      sortable: true,
    },
    {
      id: 'discount',
      header: 'Discount / Benefit',
      accessor: (c) => (
        <div className="text-xs">
          <div className="font-semibold text-foreground">
            {c.type === 'percent' ? `${c.value}% Off` : `Flat ${formatRupees(c.value)} Off`}
          </div>
          <div className="text-[11px] text-muted-foreground truncate max-w-[200px]">
            {c.description || `Min. order ${formatRupees(c.min_order_amount || 0)}`}
          </div>
        </div>
      ),
      sortable: true,
    },
    {
      id: 'min_order',
      header: 'Min. Order',
      accessor: (c) => (
        <span className="font-mono text-xs text-muted-foreground">
          {c.min_order_amount ? formatRupees(c.min_order_amount) : 'None'}
        </span>
      ),
      sortable: true,
    },
    {
      id: 'usage',
      header: 'Usage Count',
      accessor: (c) => (
        <div className="font-mono text-xs text-foreground">
          <span className="font-semibold">{c.used_count || 0}</span>
          <span className="text-muted-foreground text-[11px] ml-1">
            / {c.usage_limit ? c.usage_limit : 'unlimited'}
          </span>
        </div>
      ),
      sortable: true,
    },
    {
      id: 'status',
      header: 'Derived Status',
      accessor: (c) => {
        let variant: 'success' | 'warning' | 'muted' | 'danger' = 'muted'
        if (c.derivedStatus === 'active') variant = 'success'
        else if (c.derivedStatus === 'scheduled') variant = 'warning'
        else if (c.derivedStatus === 'expired') variant = 'danger'
        else if (c.derivedStatus === 'limit_reached') variant = 'warning'

        return (
          <span
            className={`inline-flex items-center text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full border ${
              variant === 'success'
                ? 'bg-success/10 text-success border-success/30'
                : variant === 'warning'
                ? 'bg-warning/10 text-warning border-warning/30'
                : variant === 'danger'
                ? 'bg-danger/10 text-danger border-danger/30'
                : 'bg-muted text-muted-foreground border-border'
            }`}
          >
            {c.derivedStatus.replace('_', ' ')}
          </span>
        )
      },
      sortable: true,
    },
    {
      id: 'actions',
      header: 'Action',
      accessor: (c) => (
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSelectCoupon(c.code)}
            className="h-8 text-xs font-semibold gap-1 px-2.5"
          >
            <Edit2 className="size-3" />
            <span>Edit</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleToggleActive(c)}
            className={`h-8 text-xs font-semibold gap-1 px-2 ${
              c.is_active
                ? 'text-danger hover:bg-danger/10 hover:text-danger'
                : 'text-success hover:bg-success/10 hover:text-success'
            }`}
          >
            {c.is_active ? <PowerOff className="size-3" /> : <Check className="size-3" />}
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <FilterBar
          searchPlaceholder="Search coupon code or description..."
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          activeStatus={statusFilter}
          onStatusChange={onStatusChange}
          statusPills={[
            { id: 'all', label: 'All Coupons', count: counts.all },
            { id: 'active', label: 'Active', count: counts.active },
            { id: 'scheduled', label: 'Scheduled', count: counts.scheduled },
            { id: 'expired', label: 'Expired', count: counts.expired },
            { id: 'limit_reached', label: 'Limit Reached', count: counts.limit_reached },
            { id: 'inactive', label: 'Inactive', count: counts.inactive },
          ]}
        />

        <Button
          onClick={() => onSelectCoupon('new')}
          className="h-9 text-xs font-semibold bg-brand text-brand-foreground hover:bg-brand-hover gap-1.5 shrink-0"
        >
          <Plus className="size-4" />
          <span>New Coupon</span>
        </Button>
      </div>

      <DataTable<CouponWithStatus>
        columns={columns}
        data={filteredCoupons}
        keyExtractor={(c) => c.code}
        emptyTitle="No coupons found"
        emptyDescription="No promotional coupons found matching your filter."
      />

      <CouponFormSheet
        open={Boolean(selectedCouponCode)}
        onOpenChange={(open) => !open && onSelectCoupon(null)}
        coupon={activeCoupon}
        existingCoupons={allCoupons}
        onSave={async (couponData) => {
          saveAdminCoupon(couponData)
          setVersion((v) => v + 1)
          onSelectCoupon(null)
        }}
      />
    </div>
  )
}
