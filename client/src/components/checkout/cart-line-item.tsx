import { useState } from 'react'
import { AppLink } from '@/components/shared/app-link'
import { ProductImage } from '@/components/shared/product-image'
import { QuantityStepper } from '@/components/detail/quantity-stepper'
import { DateRangePicker } from '@/components/catalog/date-range-picker'
import { formatINR } from '@/lib/format'
import { lineTotal } from '@/lib/pricing'
import { Truck, MapPin, X, Bookmark, AlertTriangle, AlertCircle, Calendar } from 'lucide-react'
import type { CartLine } from '@/types/checkout'
import type { LineAvailabilityResult } from '@/lib/api/cart'
import { cn } from '@/lib/utils'

interface CartLineItemProps {
  line: CartLine
  availability?: LineAvailabilityResult
  onUpdateQuantity: (quantity: number) => void
  onUpdateDates: (startDate: string, endDate: string) => void
  onRemove: () => void
  onSaveForLater: () => void
  className?: string
}

export function CartLineItem({
  line,
  availability,
  onUpdateQuantity,
  onUpdateDates,
  onRemove,
  onSaveForLater,
  className,
}: CartLineItemProps) {
  const [editingDates, setEditingDates] = useState(false)

  const isBlocked = availability?.is_blocked ?? false
  const warningType = availability?.warning_type
  const availMsg = availability?.message

  const total = lineTotal(line)
  const maxAvailable = availability?.available_quantity !== undefined && availability.available_quantity > 0
    ? availability.available_quantity
    : (line.max_available_quantity || 6)

  return (
    <article
      id={`cart-line-${line.cart_item_id}`}
      tabIndex={-1}
      className={cn(
        'p-4 sm:p-5 rounded-[14px] bg-surface border border-border transition-all space-y-4 focus:outline-none',
        isBlocked && 'border-danger/40 bg-danger/[0.02] ring-1 ring-danger/20',
        className,
      )}
    >
      <div className="flex flex-col sm:flex-row gap-4 items-start justify-between">
        {/* Left: 96px 4:3 Image & Product Info */}
        <div className="flex items-start gap-3.5 min-w-0 w-full sm:w-auto">
          <div className="w-24 shrink-0 overflow-hidden rounded-[10px] border border-border/80 shadow-2xs">
            <ProductImage
              src={line.primary_image_url}
              alt={line.name}
              category={line.category}
              aspectRatio="4/3"
              className="w-full h-full object-cover"
            />
          </div>

          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="font-semibold text-foreground/80">{line.category}</span>
              <span>·</span>
              {line.delivery_available ? (
                <span className="inline-flex items-center gap-1 text-brand font-medium">
                  <Truck className="size-3" />
                  <span>Delivery available</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <MapPin className="size-3" />
                  <span>Pickup only</span>
                </span>
              )}
            </div>

            <AppLink
              to={`/equipment/${line.equipment_id}`}
              className="font-serif font-bold text-sm text-foreground hover:text-brand transition-colors line-clamp-1 block"
            >
              {line.name}
            </AppLink>

            {/* Editable Dates Popover Button */}
            <div className="pt-0.5">
              <button
                type="button"
                onClick={() => setEditingDates((prev) => !prev)}
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-medium underline underline-offset-2 decoration-border hover:decoration-foreground transition-colors cursor-pointer"
              >
                <Calendar className="size-3 text-brand" />
                <span>
                  {line.start_date} → {line.end_date} ({line.days} {line.days === 1 ? 'day' : 'days'})
                </span>
              </button>
            </div>

            {editingDates && (
              <div className="pt-2">
                <DateRangePicker
                  from={line.start_date}
                  to={line.end_date}
                  onChange={(range) => {
                    if (range.from && range.to) {
                      onUpdateDates(range.from, range.to)
                      setEditingDates(false)
                    }
                  }}
                  align="start"
                  className="w-full sm:w-auto"
                />
              </div>
            )}
          </div>
        </div>

        {/* Top Right: Remove Button */}
        <button
          type="button"
          onClick={onRemove}
          className="size-8 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer shrink-0 self-start"
          aria-label={`Remove ${line.name}`}
        >
          <X className="size-4 stroke-[2]" />
        </button>
      </div>

      {/* Availability warning banner if low stock or unavailable */}
      {availMsg && (
        <div
          className={cn(
            'flex items-center gap-2 p-2.5 rounded-[8px] text-xs font-medium',
            warningType === 'unavailable'
              ? 'bg-danger/10 text-danger border border-danger/20'
              : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20',
          )}
        >
          {warningType === 'unavailable' ? (
            <AlertCircle className="size-3.5 shrink-0" />
          ) : (
            <AlertTriangle className="size-3.5 shrink-0" />
          )}
          <span>{availMsg}</span>
        </div>
      )}

      {/* Bottom Row: Quantity Stepper, Price Calculation, Deposit & Actions */}
      <div className="pt-3 border-t border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Quantity Stepper & Save for later */}
        <div className="flex items-center gap-3">
          <QuantityStepper
            quantity={line.quantity}
            onChange={onUpdateQuantity}
            max={Math.max(line.quantity, maxAvailable)}
            min={1}
            disabled={maxAvailable === 0}
            className="w-36"
          />

          <button
            type="button"
            onClick={onSaveForLater}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-brand font-medium transition-colors cursor-pointer"
          >
            <Bookmark className="size-3.5" />
            <span>Save for later</span>
          </button>
        </div>

        {/* Price & Deposit Caption */}
        <div className="text-left sm:text-right space-y-0.5">
          <div className="text-xs text-muted-foreground">
            {line.quantity} {line.quantity === 1 ? 'unit' : 'units'} × {formatINR(line.price_per_day)} × {line.days}{' '}
            {line.days === 1 ? 'day' : 'days'} ={' '}
            <strong className="font-bold text-sm text-foreground tabular-nums font-sans">
              {formatINR(total)}
            </strong>
          </div>
          <div className="text-[11px] text-muted-foreground">
            {formatINR(line.security_deposit)} refundable deposit per unit
          </div>
        </div>
      </div>
    </article>
  )
}
