import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { useAppSearchParams } from '@/components/shared/app-link'
import { usePageTitle } from '@/hooks/use-page-title'
import { Breadcrumbs } from '@/components/shared/breadcrumbs'
import { Stepper, type StepItem } from '@/components/shared/stepper'
import { CartStep } from '@/components/checkout/cart-step'
import { DetailsStep } from '@/components/checkout/details-step'
import { PaymentStep } from '@/components/checkout/payment-step'
import { ResultStep } from '@/components/checkout/result-step'
import { OrderSummary } from '@/components/checkout/order-summary'
import { MobileSummaryBar } from '@/components/checkout/mobile-summary-bar'
import { useCart } from '@/providers/cart-provider'
import { checkCartAvailability, getQuote, placeOrder } from '@/lib/api/cart'
import { getAddresses } from '@/lib/api/account'
import { toast } from 'sonner'
import type {
  CheckoutStep,
  CheckoutDraft,
  Coupon,
} from '@/types/checkout'
import type { Address } from '@/types/account'

const STEPS: StepItem[] = [
  { id: 'cart', title: 'Cart', label: 'Cart' },
  { id: 'details', title: 'Details', label: 'Details' },
  { id: 'payment', title: 'Payment', label: 'Payment' },
  { id: 'result', title: 'Done', label: 'Done' },
]

const DRAFT_STORAGE_KEY = 'r4f-checkout-draft-v1'

export function CheckoutPage() {
  const [searchParams, setSearchParams] = useAppSearchParams()
  const headingRef = useRef<HTMLHeadingElement>(null)

  // URL query params
  const rawStep = searchParams.get('step') as CheckoutStep
  const currentStep: CheckoutStep = ['cart', 'details', 'payment', 'result'].includes(rawStep)
    ? rawStep
    : 'cart'

  const periodParam = searchParams.get('period')
  const bookingParam = searchParams.get('booking')
  const resultParam = (searchParams.get('result') as 'success' | 'failed') || 'success'
  const simulateParam = searchParams.get('simulate') || undefined

  // Cart store
  const {
    lines: allLines,
    groupedPeriods: allGroupedPeriods,
    removeFromCart,
    restoreLine,
    updateQuantity,
    updateLineDates,
    moveToWishlist,
    applyPeriodToAll,
    loadDemoItems,
    refreshCart,
  } = useCart()

  // Handle ?simulate=empty
  const lines = useMemo(
    () => (simulateParam === 'empty' ? [] : allLines),
    [simulateParam, allLines],
  )
  const groupedPeriods = useMemo(
    () => (simulateParam === 'empty' ? [] : allGroupedPeriods),
    [simulateParam, allGroupedPeriods],
  )

  // Default / sanitized selected period
  const selectedPeriod = useMemo(() => {
    if (groupedPeriods.length === 0) return undefined
    if (periodParam) {
      const match = groupedPeriods.find((p) => p.period_key === periodParam)
      if (match) return match
    }
    return groupedPeriods[0]
  }, [groupedPeriods, periodParam])

  // Availability map for all cart lines
  const availabilityMap = useMemo(() => {
    return checkCartAvailability(lines, simulateParam)
  }, [lines, simulateParam])

  const hasAvailabilityIssues = useMemo(() => {
    if (!selectedPeriod) return false
    return selectedPeriod.lines.some((l) => availabilityMap[l.cart_item_id]?.is_blocked)
  }, [selectedPeriod, availabilityMap])

  // Checkout draft state
  const [draft, setDraft] = useState<CheckoutDraft>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = sessionStorage.getItem(DRAFT_STORAGE_KEY)
        if (saved) return JSON.parse(saved)
      } catch {
        // Ignore
      }
    }
    return {
      period_key: selectedPeriod?.period_key || '',
      address_id: null,
      fulfilment_by_vendor: {},
      event_type: 'Wedding',
      event_date: selectedPeriod?.start_date || '',
      venue_address: '',
      same_as_delivery: true,
      payment_method: 'upi',
      terms_agreed: false,
    }
  })

  // Persist draft to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft))
    } catch {
      // Ignore
    }
  }, [draft])

  // Addresses for review & details
  const [addresses, setAddresses] = useState<Address[]>([])
  useEffect(() => {
    getAddresses().then(setAddresses).catch(() => {})
  }, [])
  const selectedAddress = addresses.find((a) => a.id === draft.address_id) || addresses[0] || null

  // Applied Coupon state
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | undefined>(undefined)

  // Calculate quote for the currently selected period
  const quote = useMemo(() => {
    if (!selectedPeriod) {
      return getQuote([], appliedCoupon, draft.fulfilment_by_vendor)
    }
    return getQuote(selectedPeriod.lines, appliedCoupon, draft.fulfilment_by_vendor)
  }, [selectedPeriod, appliedCoupon, draft.fulfilment_by_vendor])

  // Page title dynamic mapping
  const pageTitle =
    currentStep === 'cart'
      ? 'Your cart | Rent4Fraction'
      : currentStep === 'result'
        ? resultParam === 'success'
          ? 'Booking placed | Rent4Fraction'
          : 'Payment issue | Rent4Fraction'
        : 'Checkout | Rent4Fraction'
  usePageTitle(pageTitle)

  // Step change navigation (pushes browser history)
  const setStep = useCallback((next: CheckoutStep) => {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('step', next)
    setSearchParams(nextParams)
  }, [searchParams, setSearchParams])

  // Non-step param changes (replaces history)
  const setPeriodKey = (key: string) => {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('period', key)
    setSearchParams(nextParams, { replace: true })
    setDraft((prev) => ({ ...prev, period_key: key }))
  }

  // Guard redirects: enforce prerequisites
  useEffect(() => {
    if (currentStep === 'details' || currentStep === 'payment') {
      if (lines.length === 0) {
        setStep('cart')
      } else if (currentStep === 'payment' && !draft.address_id && addresses.length > 0) {
        setStep('details')
      }
    }
  }, [currentStep, lines.length, draft.address_id, addresses.length, setStep])

  // Focus heading on step change
  useEffect(() => {
    headingRef.current?.focus()
  }, [currentStep])

  // Stepper click handler
  const handleStepClick = (stepIndex: number) => {
    const target = STEPS[stepIndex].id as CheckoutStep
    setStep(target)
  }

  // Removal with Undo toast
  const handleRemoveLine = (cartItemId: string) => {
    const removed = removeFromCart(cartItemId)
    if (removed) {
      toast('Item removed from cart', {
        action: {
          label: 'Undo',
          onClick: () => restoreLine(removed),
        },
      })
    }
  }

  // Order placement integration
  const handleCompleteOrder = async (isSuccess: boolean): Promise<void> => {
    if (!selectedPeriod || !selectedAddress) return

    try {
      const res = await placeOrder({
        lines: selectedPeriod.lines,
        period: selectedPeriod,
        address: selectedAddress,
        fulfilmentByVendor: draft.fulfilment_by_vendor,
        eventDetails: {
          event_name: draft.event_name,
          event_type: draft.event_type,
          event_date: draft.event_date || selectedPeriod.start_date,
          venue_address: draft.venue_address || selectedAddress.line1,
          notes: draft.notes,
        },
        paymentMethod: draft.payment_method,
        coupon: appliedCoupon,
        simulateSuccess: isSuccess,
      })

      // Clear checkout draft upon placement
      sessionStorage.removeItem(DRAFT_STORAGE_KEY)
      refreshCart()

      if (res.success) {
        toast.success(`Booking ${res.booking_id} placed!`, {
          description: 'Waiting for vendors to confirm.',
        })
      } else {
        toast.error(`Payment failed for ${res.booking_id}`, {
          description: 'Your booking has been saved as pending.',
        })
      }

      // Navigate to result step with booking ID and status
      const nextParams = new URLSearchParams()
      nextParams.set('step', 'result')
      nextParams.set('booking', res.booking_id)
      nextParams.set('result', res.success ? 'success' : 'failed')
      setSearchParams(nextParams)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to place booking'
      toast.error('Order placement error', { description: msg })
    }
  }

  const stepNumber = STEPS.findIndex((s) => s.id === currentStep) + 1

  const breadcrumbs = [
    { label: 'Home', href: '/' },
    {
      label: currentStep === 'cart' ? 'Cart' : 'Checkout',
      href: currentStep === 'cart' ? undefined : '/checkout?step=cart',
    },
  ]
  if (currentStep !== 'cart') {
    breadcrumbs.push({
      label:
        currentStep === 'details'
          ? 'Details'
          : currentStep === 'payment'
            ? 'Payment'
            : 'Done',
      href: undefined,
    })
  }

  // Summary counts
  const itemCount = selectedPeriod
    ? selectedPeriod.lines.reduce((s, l) => s + l.quantity, 0)
    : 0
  const vendorCount = selectedPeriod ? selectedPeriod.vendor_groups.length : 0

  return (
    <div className="min-h-screen bg-background pb-28 lg:pb-16 pt-4 sm:pt-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Breadcrumbs */}
        <Breadcrumbs items={breadcrumbs} />

        {/* Page Heading & Stepper */}
        <div className="space-y-4">
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground focus:outline-none"
          >
            {currentStep === 'cart'
              ? 'Your cart'
              : currentStep === 'result'
                ? resultParam === 'success'
                  ? 'Booking placed'
                  : 'Payment issue'
                : 'Checkout'}
          </h1>

          {/* Stepper (Only on cart, details, payment, result) */}
          <Stepper
            steps={STEPS}
            currentStep={stepNumber}
            onStepClick={handleStepClick}
            className="py-2"
          />
        </div>

        {/* Main Grid: 8/4 Desktop Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main Content Column (8 cols on desktop) */}
          <main
            className={
              currentStep === 'result'
                ? 'col-span-12'
                : 'col-span-12 lg:col-span-8 space-y-6'
            }
          >
            {currentStep === 'cart' && (
              <CartStep
                periods={groupedPeriods}
                selectedPeriodKey={selectedPeriod?.period_key || ''}
                availabilityMap={availabilityMap}
                appliedCoupon={appliedCoupon}
                subtotal={quote.subtotal}
                hasAvailabilityIssues={hasAvailabilityIssues}
                onSelectPeriod={setPeriodKey}
                onApplyDatesToAll={(pk) => applyPeriodToAll(pk)}
                onUpdateQuantity={updateQuantity}
                onUpdateDates={updateLineDates}
                onRemoveLine={handleRemoveLine}
                onSaveForLater={moveToWishlist}
                onApplyCoupon={(c) => setAppliedCoupon(c)}
                onRemoveCoupon={() => setAppliedCoupon(undefined)}
                onLoadDemoItems={loadDemoItems}
                onContinue={() => setStep('details')}
              />
            )}

            {currentStep === 'details' && selectedPeriod && (
              <DetailsStep
                period={selectedPeriod}
                draft={draft}
                onUpdateDraft={(patch) => setDraft((p) => ({ ...p, ...patch }))}
                onBack={() => setStep('cart')}
                onContinue={() => setStep('payment')}
              />
            )}

            {currentStep === 'payment' && selectedPeriod && (
              <PaymentStep
                period={selectedPeriod}
                draft={draft}
                quote={quote}
                address={selectedAddress}
                onUpdateDraft={(patch) => setDraft((p) => ({ ...p, ...patch }))}
                onBack={() => setStep('details')}
                onEditStep={(s) => setStep(s)}
                onCompletePayment={handleCompleteOrder}
              />
            )}

            {currentStep === 'result' && (
              <ResultStep
                bookingId={bookingParam || undefined}
                resultStatus={resultParam}
                onRetryPayment={() => setStep('payment')}
              />
            )}
          </main>

          {/* Sticky Order Summary Column (4 cols on desktop, hidden on result) */}
          {currentStep !== 'result' && lines.length > 0 && (
            <aside className="hidden lg:block lg:col-span-4 sticky top-[88px]">
              <OrderSummary
                quote={quote}
                period={selectedPeriod}
                vendorCount={vendorCount}
                itemCount={itemCount}
              />
            </aside>
          )}
        </div>
      </div>

      {/* Mobile Sticky Summary Bar (<1024px, hidden on result or empty cart) */}
      {currentStep !== 'result' && lines.length > 0 && (
        <MobileSummaryBar
          quote={quote}
          period={selectedPeriod}
          vendorCount={vendorCount}
          itemCount={itemCount}
          primaryLabel={
            currentStep === 'cart'
              ? 'Continue to details'
              : currentStep === 'details'
                ? 'Continue to payment'
                : draft.payment_method === 'cod'
                  ? 'Place order'
                  : 'Complete payment'
          }
          primaryDisabled={
            currentStep === 'cart'
              ? hasAvailabilityIssues
              : currentStep === 'details'
                ? !selectedAddress
                : !draft.terms_agreed
          }
          onPrimaryClick={() => {
            if (currentStep === 'cart') setStep('details')
            else if (currentStep === 'details') setStep('payment')
            else if (currentStep === 'payment') {
              // Trigger payment step flow
              const payBtn = document.querySelector('button[type="button"]')
              if (payBtn) {
                handleCompleteOrder(true)
              }
            }
          }}
        />
      )}
    </div>
  )
}
