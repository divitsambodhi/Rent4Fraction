import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/providers/auth-provider'
import { useAppNavigate, useAppSearchParams } from '@/components/shared/app-link'
import { usePageTitle } from '@/hooks/use-page-title'
import { VendorShell } from '@/components/vendor/vendor-shell'
import { FilterBar } from '@/components/shared/filter-bar'
import { OrdersTable, type VendorOrderRowData } from '@/components/vendor/orders/orders-table'
import { ReturnsTable, type VendorReturnRowData } from '@/components/vendor/orders/returns-table'
import { OrderSheet } from '@/components/vendor/orders/order-sheet'
import { InspectionDialog } from '@/components/vendor/orders/inspection-dialog'
import { applyAction, type InspectionPayload, type LifecycleAction } from '@/lib/lifecycle'
import { loadAccountState, saveAccountState } from '@/lib/api/account'
import { getAllStoredEquipment } from '@/lib/api/inventory'
import { toast } from 'sonner'
import type { BookingDetail, VendorOrder } from '@/types/account'
import { cn } from '@/lib/utils'

export function VendorOrdersPage() {
  const { user } = useAuth()
  const navigate = useAppNavigate()
  const [searchParams, setSearchParams] = useAppSearchParams()

  const vendorId = String(user?.vendor?.vendor_id || '1')
  const approvalStatus = user?.vendor?.approval_status || 'approved'

  // Non-approved vendors are redirected to /vendor
  useEffect(() => {
    if (approvalStatus !== 'approved') {
      navigate('/vendor', { replace: true })
    }
  }, [approvalStatus, navigate])

  const tabParam = (searchParams.get('tab') as 'orders' | 'returns') || 'orders'
  const statusParam = searchParams.get('status') || 'all'
  const filterParam = searchParams.get('filter') || 'all'
  const qParam = searchParams.get('q') || ''
  const pageParam = parseInt(searchParams.get('page') || '1', 10)
  const orderIdParam = searchParams.get('order')
  const inspectIdParam = searchParams.get('inspect')

  usePageTitle(tabParam === 'returns' ? 'Vendor Returns & Inspection' : 'Vendor Orders')

  const [accountState, setAccountState] = useState(loadAccountState)
  const [selectedOrderRow, setSelectedOrderRow] = useState<VendorOrderRowData | null>(null)
  const [inspectingOrder, setInspectingOrder] = useState<VendorOrder | null>(null)
  const [inspectingBooking, setInspectingBooking] = useState<BookingDetail | null>(null)

  // Equipment deposits map
  const equipmentDeposits = useMemo(() => {
    const list = getAllStoredEquipment()
    const map: Record<string, number> = {}
    list.forEach((eq) => {
      map[eq.equipment_id] = eq.security_deposit || 2000
    })
    return map
  }, [])

  // Vendor profile defaults
  const profile = useMemo(() => ({
    commission_rate: 0.15,
    business_name: user?.vendor?.business_name || 'My Storefront',
  }), [user])

  // All vendor orders across bookings
  const allVendorOrders = useMemo(() => {
    const rows: VendorOrderRowData[] = []
    const bookingsList = Array.isArray(accountState.bookings) ? accountState.bookings : []
    bookingsList.forEach((booking: any) => {
      (booking.vendor_orders || []).forEach((vo: any) => {
        if (vo.vendor_id === vendorId) {
          const itemNames = (booking.items || [])
            .filter((it: any) => (vo.item_ids || []).includes(it.item_id))
            .map((it: any) => `${it.name} ×${it.quantity}`)
            .join(', ')

          let nextLabel = ''
          if (vo.status === 'pending') nextLabel = 'Awaiting your response'
          else if (vo.status === 'accepted') {
            nextLabel = vo.delivery?.status === 'scheduled' ? 'Mark out for delivery' : 'Schedule delivery'
          } else if (vo.status === 'dispatched') nextLabel = 'Mark delivered'
          else if (vo.status === 'delivered') nextLabel = vo.return?.scheduled_window ? 'Mark returned' : 'Schedule return'
          else if (vo.status === 'returned') nextLabel = vo.return?.inspected_at ? 'Resolve damage' : 'Inspect items'

          rows.push({
            order: vo,
            booking,
            itemsSummary: itemNames || 'Sound & Stage Equipment',
            rentalDates: `${booking.start_date} to ${booking.end_date}`,
            totalDays: booking.rental_days,
            city: booking.delivery_address.city,
            nextStepLabel: nextLabel,
          })
        }
      })
    })
    return rows
  }, [accountState, vendorId])

  // Synchronize URL order param with drawer
  useEffect(() => {
    if (orderIdParam) {
      const match = allVendorOrders.find((r) => r.order.vendor_order_id === orderIdParam)
      if (match) setSelectedOrderRow(match)
    } else {
      setSelectedOrderRow(null)
    }
  }, [orderIdParam, allVendorOrders])

  // Synchronize URL inspect param
  useEffect(() => {
    if (inspectIdParam) {
      const match = allVendorOrders.find((r) => r.order.vendor_order_id === inspectIdParam)
      if (match) {
        setInspectingOrder(match.order)
        setInspectingBooking(match.booking)
      }
    } else {
      setInspectingOrder(null)
      setInspectingBooking(null)
    }
  }, [inspectIdParam, allVendorOrders])

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return allVendorOrders.filter((r) => {
      // Query filter
      if (qParam) {
        const query = qParam.toLowerCase()
        const text = `${r.order.vendor_order_id} ${r.booking.booking_id} ${r.booking.delivery_address.name} ${r.booking.event_name} ${r.itemsSummary}`.toLowerCase()
        if (!text.includes(query)) return false
      }

      // Status mapping:
      // pending = pending
      // active = accepted, dispatched, delivered, returned
      // completed = completed
      // closed = rejected, cancelled
      if (statusParam === 'pending') return r.order.status === 'pending'
      if (statusParam === 'active') {
        return ['accepted', 'dispatched', 'delivered', 'returned'].includes(r.order.status)
      }
      if (statusParam === 'completed') return r.order.status === 'completed'
      if (statusParam === 'closed') return ['rejected', 'cancelled'].includes(r.order.status)

      return true
    })
  }, [allVendorOrders, qParam, statusParam])

  // Filtered Returns
  const returnRows: VendorReturnRowData[] = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10)
    return allVendorOrders
      .filter((r) => ['delivered', 'returned', 'completed'].includes(r.order.status) && r.order.return)
      .map((r) => {
        const ret = r.order.return!
        const returnDate = r.booking.end_date
        const isLate = todayStr > returnDate && r.order.status !== 'returned' && r.order.status !== 'completed'

        const orderItems = r.booking.items.filter((it) => r.order.item_ids.includes(it.item_id))
        const hasOpenReport = orderItems.some(
          (it) => it.damage_report && it.damage_report.status !== 'resolved'
        )
        const hasDisputed = orderItems.some(
          (it) => it.damage_report && it.damage_report.status === 'disputed'
        )
        const hasResolved = orderItems.some(
          (it) => it.damage_report && it.damage_report.status === 'resolved'
        )

        let inspectionState: VendorReturnRowData['inspectionState'] = 'not_inspected'
        if (hasDisputed) inspectionState = 'disputed'
        else if (hasOpenReport) inspectionState = 'damage_reported'
        else if (hasResolved) inspectionState = 'resolved'
        else if (ret.inspected_at) inspectionState = 'clean'

        return {
          order: r.order,
          booking: r.booking,
          customerName: r.booking.delivery_address.name,
          returnDate: r.booking.end_date,
          returnWindow: ret.scheduled_window || 'Standard window',
          itemsCount: orderItems.length,
          isLate,
          inspectionState,
        }
      })
      .filter((r) => {
        if (qParam) {
          const query = qParam.toLowerCase()
          const text = `${r.order.vendor_order_id} ${r.customerName} ${r.booking.booking_id}`.toLowerCase()
          if (!text.includes(query)) return false
        }
        if (filterParam === 'scheduled') return r.order.status === 'delivered'
        if (filterParam === 'to_inspect') return r.order.status === 'returned' && r.inspectionState === 'not_inspected'
        if (filterParam === 'inspected') return r.inspectionState === 'clean' || r.inspectionState === 'resolved'
        if (filterParam === 'disputed') return r.inspectionState === 'disputed'
        return true
      })
  }, [allVendorOrders, qParam, filterParam])

  // Counts
  const orderCounts = useMemo(() => {
    return {
      all: allVendorOrders.length,
      pending: allVendorOrders.filter((r) => r.order.status === 'pending').length,
      active: allVendorOrders.filter((r) => ['accepted', 'dispatched', 'delivered', 'returned'].includes(r.order.status)).length,
      completed: allVendorOrders.filter((r) => r.order.status === 'completed').length,
      closed: allVendorOrders.filter((r) => ['rejected', 'cancelled'].includes(r.order.status)).length,
    }
  }, [allVendorOrders])

  const returnCounts = useMemo(() => {
    return {
      all: allVendorOrders.filter((r) => r.order.return).length,
      to_inspect: allVendorOrders.filter((r) => r.order.status === 'returned' && !r.order.return?.inspected_at).length,
    }
  }, [allVendorOrders])

  // Action execution
  const handleLifecycleAction = async (action: LifecycleAction, payload?: unknown) => {
    if (!selectedOrderRow && !inspectingOrder) return

    const currentOrder = selectedOrderRow?.order || inspectingOrder!
    const currentBooking = selectedOrderRow?.booking || inspectingBooking!

    const res = applyAction(
      currentBooking,
      currentOrder.vendor_order_id,
      action,
      payload,
      'vendor',
      {
        vendorCommissionRate: profile.commission_rate,
        equipmentDeposits,
      }
    )

    if (res.error) {
      toast.error(res.error)
      return
    }

    // Persist to store
    const state = loadAccountState() as { bookings: BookingDetail[] }
    const bIndex = state.bookings.findIndex((b) => b.booking_id === res.booking.booking_id)
    if (bIndex !== -1) {
      state.bookings[bIndex] = res.booking
      saveAccountState(state)
      setAccountState(state as any)
    }

    toast.success(`Order ${currentOrder.vendor_order_id} updated successfully.`)
  }

  const handleTabChange = (nextTab: 'orders' | 'returns') => {
    const next = new URLSearchParams(searchParams)
    next.set('tab', nextTab)
    next.delete('page')
    setSearchParams(next)
  }

  const handleStatusChange = (nextStatus: string) => {
    const next = new URLSearchParams(searchParams)
    if (nextStatus === 'all') next.delete('status')
    else next.set('status', nextStatus)
    next.delete('page')
    setSearchParams(next, { replace: true })
  }

  const handleFilterChange = (nextFilter: string) => {
    const next = new URLSearchParams(searchParams)
    if (nextFilter === 'all') next.delete('filter')
    else next.set('filter', nextFilter)
    next.delete('page')
    setSearchParams(next, { replace: true })
  }

  const handleSearchChange = (query: string) => {
    const next = new URLSearchParams(searchParams)
    if (!query) next.delete('q')
    else next.set('q', query)
    next.delete('page')
    setSearchParams(next, { replace: true })
  }

  const handleOpenOrder = (orderId: string) => {
    const next = new URLSearchParams(searchParams)
    next.set('order', orderId)
    setSearchParams(next)
  }

  const handleCloseOrder = () => {
    const next = new URLSearchParams(searchParams)
    next.delete('order')
    setSearchParams(next)
  }

  const handleOpenInspect = (orderId: string) => {
    const next = new URLSearchParams(searchParams)
    next.set('inspect', orderId)
    setSearchParams(next)
  }

  const handleCloseInspect = () => {
    const next = new URLSearchParams(searchParams)
    next.delete('inspect')
    setSearchParams(next)
  }

  return (
    <VendorShell
      businessName={profile.business_name}
      approvalStatus={approvalStatus}
      activeTitle="Orders & Returns"
      subtitle="Fulfill customer orders, schedule logistics, and verify equipment condition"
    >
      <div className="space-y-6">
        {/* Top-level Tabs (Orders vs Returns) - Underline tab on 1px rule */}
        <div className="flex items-center gap-6 border-b border-border">
          <button
            type="button"
            onClick={() => handleTabChange('orders')}
            className={cn(
              'pb-2.5 text-xs sm:text-sm font-semibold transition-colors inline-flex items-center gap-2 relative cursor-pointer',
              tabParam === 'orders'
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <span>Orders</span>
            {orderCounts.pending > 0 && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-brand/10 text-brand tabular-nums">
                {orderCounts.pending} pending
              </span>
            )}
            {tabParam === 'orders' && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-brand rounded-full" aria-hidden="true" />
            )}
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('returns')}
            className={cn(
              'pb-2.5 text-xs sm:text-sm font-semibold transition-colors inline-flex items-center gap-2 relative cursor-pointer',
              tabParam === 'returns'
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <span>Returns & Inspection</span>
            {returnCounts.to_inspect > 0 && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 tabular-nums">
                {returnCounts.to_inspect} to inspect
              </span>
            )}
            {tabParam === 'returns' && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-brand rounded-full" aria-hidden="true" />
            )}
          </button>
        </div>

        {/* ORDERS TAB VIEW */}
        {tabParam === 'orders' && (
          <div className="space-y-4">
            <FilterBar
              searchQuery={qParam}
              onSearchChange={handleSearchChange}
              searchPlaceholder="Search order number, customer, or equipment..."
              activeStatus={statusParam}
              onStatusChange={handleStatusChange}
              statusPills={[
                { id: 'all', label: 'All Orders', count: orderCounts.all },
                { id: 'pending', label: 'Pending', count: orderCounts.pending },
                { id: 'active', label: 'Active', count: orderCounts.active },
                { id: 'completed', label: 'Completed', count: orderCounts.completed },
                { id: 'closed', label: 'Closed', count: orderCounts.closed },
              ]}
              onClearAll={() => {
                const next = new URLSearchParams()
                next.set('tab', 'orders')
                setSearchParams(next)
              }}
            />

            <p className="text-xs text-muted-foreground" aria-live="polite">
              Showing {filteredOrders.length} rental order{filteredOrders.length !== 1 ? 's' : ''}
            </p>

            <OrdersTable
              orders={filteredOrders}
              page={pageParam}
              pageSize={10}
              totalItems={filteredOrders.length}
              onPageChange={(page) => {
                const next = new URLSearchParams(searchParams)
                next.set('page', String(page))
                setSearchParams(next)
              }}
              onRowClick={(row) => handleOpenOrder(row.order.vendor_order_id)}
            />
          </div>
        )}

        {/* RETURNS TAB VIEW */}
        {tabParam === 'returns' && (
          <div className="space-y-4">
            <FilterBar
              searchQuery={qParam}
              onSearchChange={handleSearchChange}
              searchPlaceholder="Search return order, customer..."
              activeStatus={filterParam}
              onStatusChange={handleFilterChange}
              statusPills={[
                { id: 'all', label: 'All Returns', count: returnRows.length },
                { id: 'scheduled', label: 'Scheduled' },
                { id: 'to_inspect', label: 'To Inspect', count: returnCounts.to_inspect },
                { id: 'inspected', label: 'Inspected' },
                { id: 'disputed', label: 'Disputed' },
              ]}
              onClearAll={() => {
                const next = new URLSearchParams()
                next.set('tab', 'returns')
                setSearchParams(next)
              }}
            />

            <ReturnsTable
              returns={returnRows}
              page={pageParam}
              pageSize={10}
              totalItems={returnRows.length}
              onPageChange={(page) => {
                const next = new URLSearchParams(searchParams)
                next.set('page', String(page))
                setSearchParams(next)
              }}
              onRowClick={(row) => handleOpenOrder(row.order.vendor_order_id)}
              onMarkReturned={(orderId) => {
                const row = returnRows.find((r) => r.order.vendor_order_id === orderId)
                if (row) {
                  setSelectedOrderRow({
                    order: row.order,
                    booking: row.booking,
                    itemsSummary: '',
                    rentalDates: '',
                    totalDays: 0,
                    city: '',
                    nextStepLabel: '',
                  })
                  handleLifecycleAction('mark_returned')
                }
              }}
              onInspect={(orderId) => handleOpenInspect(orderId)}
            />
          </div>
        )}

        {/* SLIDE-OVER ORDER DETAIL SHEET */}
        {selectedOrderRow && (
          <OrderSheet
            open={Boolean(orderIdParam)}
            onOpenChange={(open) => {
              if (!open) handleCloseOrder()
            }}
            order={selectedOrderRow.order}
            booking={selectedOrderRow.booking}
            commissionRate={profile.commission_rate}
            equipmentDeposits={equipmentDeposits}
            onAction={handleLifecycleAction}
          />
        )}

        {/* INSPECTION MULTI-STEP DIALOG */}
        {inspectingOrder && inspectingBooking && (
          <InspectionDialog
            open={Boolean(inspectIdParam)}
            onOpenChange={(open) => {
              if (!open) handleCloseInspect()
            }}
            orderId={inspectingOrder.vendor_order_id}
            items={inspectingBooking.items.filter((it) => inspectingOrder.item_ids.includes(it.item_id))}
            equipmentDeposits={equipmentDeposits}
            onConfirm={async (payload: InspectionPayload) => {
              await handleLifecycleAction('inspect', payload)
              handleCloseInspect()
            }}
          />
        )}
      </div>
    </VendorShell>
  )
}
