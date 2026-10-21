import { useState } from 'react'
import { Package, MapPin, Truck, ChevronDown, ChevronUp } from 'lucide-react'
import { formatINR } from '@/lib/format'
import type { CartPeriod, CheckoutDraft } from '@/types/checkout'
import type { Address } from '@/types/account'

interface OrderReviewProps {
  period: CartPeriod
  draft: CheckoutDraft
  address?: Address | null
  onEditStep: (step: 'cart' | 'details') => void
}

export function OrderReview({
  period,
  draft,
  address,
  onEditStep,
}: OrderReviewProps) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="p-5 rounded-[16px] bg-surface border border-border space-y-4 shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border/70">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-full bg-brand/10 text-brand flex items-center justify-center">
            <Package className="size-4" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-sm text-foreground">Order Review</h3>
            <p className="text-[11px] text-muted-foreground">
              {period.start_date} to {period.end_date} · {period.days} {period.days === 1 ? 'day' : 'days'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onEditStep('cart')}
            className="text-xs font-semibold text-brand hover:underline px-2 py-1"
          >
            Edit items
          </button>
          <button
            type="button"
            onClick={() => setCollapsed((p) => !p)}
            className="size-7 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground"
            aria-label={collapsed ? 'Expand order review' : 'Collapse order review'}
          >
            {collapsed ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="space-y-4 text-xs">
          {/* Vendor Shipments */}
          <div className="space-y-3">
            {period.vendor_groups.map((vGroup) => {
              const fulType = draft.fulfilment_by_vendor[vGroup.vendor_id] || 'delivery'
              return (
                <div
                  key={vGroup.vendor_id}
                  className="p-3.5 rounded-[12px] bg-muted/30 border border-border/70 space-y-2"
                >
                  <div className="flex items-center justify-between font-semibold text-foreground">
                    <span>{vGroup.vendor_name}</span>
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-normal">
                      {fulType === 'delivery' ? (
                        <>
                          <Truck className="size-3 text-brand" />
                          <span>Venue delivery (₹300)</span>
                        </>
                      ) : (
                        <>
                          <MapPin className="size-3 text-brand" />
                          <span>Self pickup (₹0)</span>
                        </>
                      )}
                    </span>
                  </div>

                  <ul className="space-y-1 text-muted-foreground">
                    {vGroup.lines.map((line) => (
                      <li key={line.cart_item_id} className="flex justify-between">
                        <span className="truncate pr-2">
                          {line.quantity} × {line.name}
                        </span>
                        <span className="tabular-nums font-medium text-foreground shrink-0">
                          {formatINR(line.price_per_day * line.quantity * line.days)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>

          {/* Delivery & Event Details Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border/70">
            {/* Delivery address */}
            <div className="p-3 rounded-[10px] bg-muted/20 border border-border/60 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground text-[11px] uppercase tracking-wider">
                  Contact / Delivery Address
                </span>
                <button
                  type="button"
                  onClick={() => onEditStep('details')}
                  className="text-[11px] text-brand hover:underline font-semibold"
                >
                  Change
                </button>
              </div>
              {address ? (
                <p className="text-muted-foreground leading-relaxed text-[11px]">
                  <strong>{address.name}</strong>, {address.line1}, {address.city}, {address.pincode}
                </p>
              ) : (
                <p className="text-muted-foreground text-[11px] italic">Not selected</p>
              )}
            </div>

            {/* Event details */}
            <div className="p-3 rounded-[10px] bg-muted/20 border border-border/60 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground text-[11px] uppercase tracking-wider">
                  Event & Venue
                </span>
                <button
                  type="button"
                  onClick={() => onEditStep('details')}
                  className="text-[11px] text-brand hover:underline font-semibold"
                >
                  Change
                </button>
              </div>
              <p className="text-muted-foreground leading-relaxed text-[11px]">
                <strong>{draft.event_name || draft.event_type}</strong> on {draft.event_date || period.start_date}
                <br />
                Venue: {draft.venue_address || 'Same as delivery'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
