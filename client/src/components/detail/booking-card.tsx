import { useState, useId } from 'react'
import {
  CalendarDays,
  Check,
  Heart,
  MessageSquare,
  ShieldCheck,
  Truck,
} from 'lucide-react'
import { toast } from 'sonner'
import { PriceText } from '@/components/shared/price-text'
import { StarRating } from '@/components/shared/star-rating'
import { QuantityStepper } from './quantity-stepper'
import { PriceBreakdown } from './price-breakdown'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/providers/auth-provider'
import { useCart } from '@/providers/cart-provider'
import { useWishlist } from '@/providers/wishlist-provider'
import { useAppNavigate } from '@/components/shared/app-link'
import type { EquipmentDetail } from '@/types'
import { cn } from '@/lib/utils'

interface BookingCardProps {
  equipment: EquipmentDetail
  from?: string
  to?: string
  quantity: number
  availableQuantity?: number
  onDatesChange: (from?: string, to?: string) => void
  onQuantityChange: (qty: number) => void
  onOpenMessageVendor?: () => void
  className?: string
}

function calculateInclusiveDays(from?: string, to?: string): number {
  if (!from || !to) return 0
  const d1 = new Date(from).getTime()
  const d2 = new Date(to).getTime()
  if (isNaN(d1) || isNaN(d2) || d2 < d1) return 0
  return Math.max(1, Math.round((d2 - d1) / 86400000) + 1)
}

function formatDatesLabel(from?: string, to?: string): string {
  if (!from || !to) return ''
  try {
    const d1 = new Date(from)
    const d2 = new Date(to)
    const opt: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
    return `${d1.toLocaleDateString('en-IN', opt)} to ${d2.toLocaleDateString('en-IN', opt)}`
  } catch {
    return `${from} to ${to}`
  }
}

export function BookingCard({
  equipment,
  from,
  to,
  quantity,
  availableQuantity,
  onDatesChange,
  onQuantityChange,
  onOpenMessageVendor,
  className,
}: BookingCardProps) {
  const { role } = useAuth()
  const { addToCart } = useCart()
  const { isWishlisted, toggleWishlist } = useWishlist()
  const navigate = useAppNavigate()
  const errorId = useId()

  const [justAdded, setJustAdded] = useState(false)

  const isListingActive = equipment.status === 'active'
  const isWished = isWishlisted(equipment.equipment_id)

  const days = calculateInclusiveDays(from, to)
  const maxAvailableUnits =
    typeof availableQuantity === 'number' ? availableQuantity : equipment.quantity

  // Validation rules
  const hasDates = Boolean(from && to)
  const isBelowMinDays = hasDates && days < equipment.min_rental_days
  const isFullyBooked = hasDates && availableQuantity === 0
  const isOverQuantity = hasDates && quantity > maxAvailableUnits
  const isDatesInvalid = from && to && new Date(to) < new Date(from)

  const isFormValid =
    isListingActive &&
    hasDates &&
    !isBelowMinDays &&
    !isFullyBooked &&
    !isOverQuantity &&
    !isDatesInvalid &&
    days > 0

  const handleAddToCart = () => {
    if (!isFormValid) return

    addToCart({
      equipment_id: equipment.equipment_id,
      name: equipment.name,
      price_per_day: equipment.price_per_day,
      security_deposit: equipment.security_deposit,
      primary_image_url: equipment.primary_image_url,
      vendor_name: equipment.vendor_name,
      quantity,
      start_date: from,
      end_date: to,
    })

    setJustAdded(true)
    toast.success('Added to cart', {
      description: `${quantity} × ${equipment.name} for ${days} days`,
      action: {
        label: 'View cart',
        onClick: () => navigate('/checkout'),
      },
    })

    setTimeout(() => {
      setJustAdded(false)
    }, 1800)
  }

  const handleVisitorLoginClick = () => {
    const redirectUrl =
      typeof window !== 'undefined'
        ? window.location.pathname + window.location.search
        : `/equipment/${equipment.equipment_id}`
    navigate(`/auth?mode=login&redirect=${encodeURIComponent(redirectUrl)}`)
  }

  return (
    <aside
      className={cn(
        'w-full max-w-[380px] rounded-[16px] border border-border bg-surface p-5 sm:p-6 shadow-none space-y-5 text-foreground max-h-[calc(100dvh-100px)] overflow-y-auto scrollbar-none',
        className,
      )}
      aria-label="Booking and reservation card"
    >
      {/* Price & Rating Header */}
      <div className="flex items-baseline justify-between gap-2 border-b border-border/80 pb-4">
        <div>
          <div className="flex items-baseline gap-1">
            <span className="font-serif text-2xl sm:text-3xl font-bold text-foreground">
              <PriceText amount={equipment.price_per_day} />
            </span>
            <span className="text-xs sm:text-sm font-normal text-muted-foreground">
              /day
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground">
            Security deposit ₹{equipment.security_deposit.toLocaleString('en-IN')}/unit
          </span>
        </div>

        <a
          href="#reviews"
          className="flex flex-col items-end hover:opacity-80 transition-opacity"
        >
          <div className="flex items-center gap-1">
            <StarRating rating={equipment.avg_rating} size="sm" />
            <span className="text-xs font-bold text-foreground tabular-nums">
              {equipment.avg_rating.toFixed(1)}
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground underline decoration-muted-foreground/40">
            {equipment.review_count} reviews
          </span>
        </a>
      </div>

      {/* Date Range Selection Box */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-semibold text-foreground">
          <label htmlFor="booking-from-date">Event dates</label>
          {days > 0 && (
            <span className="text-brand font-medium tabular-nums">
              {formatDatesLabel(from, to)} · {days} {days === 1 ? 'day' : 'days'}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="relative">
            <input
              id="booking-from-date"
              type="date"
              value={from || ''}
              min={new Date().toISOString().split('T')[0]}
              disabled={!isListingActive}
              onChange={(e) => onDatesChange(e.target.value, to)}
              className="w-full h-11 px-3 py-2 rounded-[10px] border border-border bg-surface text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-brand disabled:opacity-50"
              aria-label="Rental start date"
              aria-describedby={errorId}
            />
          </div>

          <div className="relative">
            <input
              id="booking-to-date"
              type="date"
              value={to || ''}
              min={from || new Date().toISOString().split('T')[0]}
              disabled={!isListingActive}
              onChange={(e) => onDatesChange(from, e.target.value)}
              className="w-full h-11 px-3 py-2 rounded-[10px] border border-border bg-surface text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-brand disabled:opacity-50"
              aria-label="Rental end date"
              aria-describedby={errorId}
            />
          </div>
        </div>
      </div>

      {/* Inline Validation Banner with aria-live */}
      <div id={errorId} aria-live="polite" className="text-xs">
        {!hasDates && (
          <p className="text-muted-foreground flex items-center gap-1.5 py-1">
            <CalendarDays className="size-3.5 text-brand" />
            <span>Choose your event dates to see the total</span>
          </p>
        )}

        {isDatesInvalid && (
          <p className="text-danger font-medium py-1">
            End date cannot be earlier than start date.
          </p>
        )}

        {isBelowMinDays && (
          <p className="text-danger font-medium py-1">
            Minimum rental duration is {equipment.min_rental_days} days for this item.
          </p>
        )}

        {isFullyBooked && (
          <p className="text-danger font-medium py-1">
            Fully booked for these dates. Check availability calendar for upcoming dates.
          </p>
        )}

        {isOverQuantity && (
          <p className="text-danger font-medium py-1">
            Only {maxAvailableUnits} units available for these dates.
          </p>
        )}
      </div>

      {/* Quantity Stepper */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-foreground">Quantity</label>
        <QuantityStepper
          quantity={quantity}
          onChange={onQuantityChange}
          max={maxAvailableUnits}
          min={1}
          disabled={!isListingActive || isFullyBooked}
          caption={
            hasDates
              ? `Up to ${maxAvailableUnits} available for selected dates`
              : `${equipment.quantity} units total in stock`
          }
        />
      </div>

      {/* Price Breakdown */}
      {isFormValid && (
        <PriceBreakdown
          pricePerDay={equipment.price_per_day}
          days={days}
          quantity={quantity}
          securityDepositPerUnit={equipment.security_deposit}
        />
      )}

      {/* Primary Role-Aware CTA Button (48px) */}
      <div className="pt-1 space-y-2">
        {!isListingActive ? (
          <Button
            type="button"
            disabled
            className="w-full h-12 text-sm font-semibold rounded-[10px] opacity-60 cursor-not-allowed"
          >
            Listing currently unavailable
          </Button>
        ) : role === 'visitor' ? (
          <Button
            type="button"
            onClick={handleVisitorLoginClick}
            className="w-full h-12 text-sm font-semibold rounded-[10px] shadow-sm hover:scale-[1.01] transition-transform"
          >
            Log in to add to cart
          </Button>
        ) : role === 'vendor' || role === 'admin' ? (
          <div className="space-y-1 text-center">
            <Button
              type="button"
              disabled
              className="w-full h-12 text-sm font-semibold rounded-[10px] opacity-60 cursor-not-allowed"
            >
              Add to cart
            </Button>
            <p className="text-[11px] text-muted-foreground">
              Switch to a customer account to rent equipment
            </p>
          </div>
        ) : (
          <Button
            type="button"
            disabled={!isFormValid || justAdded}
            onClick={handleAddToCart}
            className={cn(
              'w-full h-12 text-sm font-semibold rounded-[10px] shadow-sm transition-all flex items-center justify-center gap-2',
              justAdded && 'bg-emerald-600 hover:bg-emerald-600 text-white',
            )}
          >
            {justAdded ? (
              <>
                <Check className="size-4 stroke-[3]" />
                <span>Added to cart</span>
              </>
            ) : hasDates ? (
              'Add to cart'
            ) : (
              'Select dates to rent'
            )}
          </Button>
        )}

        {/* Secondary Actions Row */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => toggleWishlist(equipment.equipment_id)}
            className="h-10 text-xs font-medium gap-1.5 rounded-[8px]"
          >
            <Heart
              className={cn(
                'size-4',
                isWished ? 'fill-brand text-brand' : 'text-muted-foreground',
              )}
            />
            <span>{isWished ? 'Saved' : 'Save to wishlist'}</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenMessageVendor}
            className="h-10 text-xs font-medium gap-1.5 rounded-[8px]"
          >
            <MessageSquare className="size-4 text-muted-foreground" />
            <span>Ask the vendor</span>
          </Button>
        </div>
      </div>

      {/* Trust Badges List */}
      <ul className="pt-3 border-t border-border/80 space-y-2 text-xs text-muted-foreground">
        <li className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-brand shrink-0" />
          <span>Refundable security deposit</span>
        </li>
        <li className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-brand shrink-0" />
          <span>Verified vendor guarantee</span>
        </li>
        {equipment.delivery_available && (
          <li className="flex items-center gap-2">
            <Truck className="size-4 text-brand shrink-0" />
            <span>Delivery & pickup available to venue</span>
          </li>
        )}
        <li className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-brand shrink-0" />
          <span>Secure payments with instant receipt</span>
        </li>
      </ul>
    </aside>
  )
}
