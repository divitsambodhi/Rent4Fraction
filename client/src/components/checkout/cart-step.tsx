import { ArrowLeft, ArrowRight, AlertCircle } from 'lucide-react'
import { AppLink } from '@/components/shared/app-link'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { CartPeriodGroup } from './cart-period-group'
import { AvailabilityIssuesBanner } from './availability-issues-banner'
import { CouponBox } from './coupon-box'
import { TestCouponsPanel } from './test-coupons-panel'
import { DemoCartButton } from './demo-cart-button'
import { EmptyCart } from './empty-cart'
import type { CartPeriod, CartLine, Coupon } from '@/types/checkout'
import type { LineAvailabilityResult } from '@/lib/api/cart'

interface CartStepProps {
  periods: CartPeriod[]
  selectedPeriodKey: string
  availabilityMap: Record<string, LineAvailabilityResult>
  appliedCoupon?: Coupon
  subtotal: number
  hasAvailabilityIssues: boolean
  onSelectPeriod: (periodKey: string) => void
  onApplyDatesToAll: (periodKey: string) => { conflicts: { equipment_id: string; name: string; available: number }[] }
  onUpdateQuantity: (cartItemId: string, quantity: number) => void
  onUpdateDates: (cartItemId: string, startDate: string, endDate: string) => void
  onRemoveLine: (cartItemId: string) => void
  onSaveForLater: (cartItemId: string) => void
  onApplyCoupon: (coupon: Coupon) => void
  onRemoveCoupon: () => void
  onLoadDemoItems: () => void
  onContinue: () => void
}

export function CartStep({
  periods,
  selectedPeriodKey,
  availabilityMap,
  appliedCoupon,
  subtotal,
  hasAvailabilityIssues,
  onSelectPeriod,
  onApplyDatesToAll,
  onUpdateQuantity,
  onUpdateDates,
  onRemoveLine,
  onSaveForLater,
  onApplyCoupon,
  onRemoveCoupon,
  onLoadDemoItems,
  onContinue,
}: CartStepProps) {
  if (periods.length === 0) {
    return <EmptyCart onLoadDemoItems={onLoadDemoItems} />
  }

  // All lines across all periods
  const allLines: CartLine[] = periods.flatMap((p) => p.lines)

  return (
    <div className="space-y-6">
      {/* Dev toolbar row */}
      <div className="flex items-center justify-between pb-1">
        <span className="text-xs text-muted-foreground font-medium">
          Review your items and rental periods
        </span>
        <DemoCartButton onLoadDemo={onLoadDemoItems} />
      </div>

      {/* Availability Issues Banner */}
      {hasAvailabilityIssues && (
        <AvailabilityIssuesBanner
          lines={allLines}
          availabilityMap={availabilityMap}
        />
      )}

      {/* Cart Period Groups */}
      <div className="space-y-6">
        {periods.map((period) => (
          <CartPeriodGroup
            key={period.period_key}
            period={period}
            isSelected={period.period_key === selectedPeriodKey}
            hasMultiplePeriods={periods.length > 1}
            availabilityMap={availabilityMap}
            onSelectPeriod={() => onSelectPeriod(period.period_key)}
            onApplyDatesToAll={() => onApplyDatesToAll(period.period_key)}
            onUpdateQuantity={onUpdateQuantity}
            onUpdateDates={onUpdateDates}
            onRemoveLine={onRemoveLine}
            onSaveForLater={onSaveForLater}
          />
        ))}
      </div>

      {/* Coupon box & test panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        <CouponBox
          subtotal={subtotal}
          appliedCoupon={appliedCoupon}
          onApplyCoupon={onApplyCoupon}
          onRemoveCoupon={onRemoveCoupon}
        />
        <TestCouponsPanel onSelectCoupon={onApplyCoupon} />
      </div>

      {/* Navigation Actions (Desktop / In-page) */}
      <div className="hidden lg:flex items-center justify-between pt-6 border-t border-border/70">
        <AppLink to="/equipment" className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="size-4" />
          <span>Continue browsing</span>
        </AppLink>

        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button
                  type="button"
                  onClick={onContinue}
                  disabled={hasAvailabilityIssues}
                  className="h-12 px-8 text-sm font-semibold rounded-[12px] shadow-sm gap-2"
                >
                  <span>Continue to details</span>
                  <ArrowRight className="size-4" />
                </Button>
              </span>
            </TooltipTrigger>
            {hasAvailabilityIssues && (
              <TooltipContent side="top" className="text-xs bg-danger text-white border-danger flex items-center gap-1.5">
                <AlertCircle className="size-3.5" />
                <span>Fix availability issues before continuing</span>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  )
}
