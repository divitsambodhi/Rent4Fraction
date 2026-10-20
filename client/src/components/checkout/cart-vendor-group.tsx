import { AppLink } from '@/components/shared/app-link'
import { CartLineItem } from './cart-line-item'
import type { CartVendorGroup as CartVendorGroupType, CartLine } from '@/types/checkout'
import type { LineAvailabilityResult } from '@/lib/api/cart'

interface CartVendorGroupProps {
  group: CartVendorGroupType
  availabilityMap: Record<string, LineAvailabilityResult>
  onUpdateQuantity: (cartItemId: string, quantity: number) => void
  onUpdateDates: (cartItemId: string, startDate: string, endDate: string) => void
  onRemoveLine: (cartItemId: string) => void
  onSaveForLater: (cartItemId: string) => void
}

export function CartVendorGroup({
  group,
  availabilityMap,
  onUpdateQuantity,
  onUpdateDates,
  onRemoveLine,
  onSaveForLater,
}: CartVendorGroupProps) {
  const initials = group.vendor_name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <section className="space-y-3" aria-label={`Items from ${group.vendor_name}`}>
      {/* Vendor Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-full bg-brand/10 border border-brand/20 text-brand font-bold text-xs flex items-center justify-center shrink-0">
            {initials}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <AppLink
                to={`/equipment?vendor=${group.vendor_id}`}
                className="font-serif font-bold text-sm text-foreground hover:text-brand transition-colors"
              >
                {group.vendor_name}
              </AppLink>
              <span className="text-xs text-muted-foreground">
                · {group.lines.length} {group.lines.length === 1 ? 'item' : 'items'}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Each vendor fulfils its own part of your order
            </p>
          </div>
        </div>
      </div>

      {/* Vendor Lines */}
      <div className="space-y-3">
        {group.lines.map((line: CartLine) => (
          <CartLineItem
            key={line.cart_item_id}
            line={line}
            availability={availabilityMap[line.cart_item_id]}
            onUpdateQuantity={(qty) => onUpdateQuantity(line.cart_item_id, qty)}
            onUpdateDates={(start, end) => onUpdateDates(line.cart_item_id, start, end)}
            onRemove={() => onRemoveLine(line.cart_item_id)}
            onSaveForLater={() => onSaveForLater(line.cart_item_id)}
          />
        ))}
      </div>
    </section>
  )
}
