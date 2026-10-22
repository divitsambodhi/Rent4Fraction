import { useState, useEffect, useCallback, useMemo } from 'react'
import { Icon } from '@/components/ui/icon'
import {
  useAppNavigate,
  useAppParams,
  useAppSearchParams,
  AppLink,
} from '@/components/shared/app-link'
import { PageContainer } from '@/components/shared/page-container'
import { Breadcrumbs } from '@/components/shared/breadcrumbs'
import { ErrorState } from '@/components/shared/error-state'
import { Button } from '@/components/ui/button'
import { usePageTitle } from '@/hooks/use-page-title'
import {
  getEquipmentAvailability,
  getEquipmentDetail,
  getSimilarEquipment,
  getVendorEquipment,
} from '@/lib/api'
import type {
  EquipmentAvailability,
  EquipmentDetail,
  EquipmentListingView,
} from '@/types'

// Detail Components
import { ImageGallery } from '@/components/detail/image-gallery'
import { EquipmentHeader } from '@/components/detail/equipment-header'
import { SectionNav } from '@/components/detail/section-nav'
import { OverviewSection } from '@/components/detail/overview-section'
import { SpecsTable } from '@/components/detail/specs-table'
import { AvailabilityCalendar } from '@/components/detail/availability-calendar'
import { BookingCard } from '@/components/detail/booking-card'
import { BookingSheet } from '@/components/detail/booking-sheet'
import { MobileBookingBar } from '@/components/detail/mobile-booking-bar'
import { ReviewsSection } from '@/components/detail/reviews-section'
import { VendorInfoCard } from '@/components/detail/vendor-info-card'
import { MessageVendorDialog } from '@/components/detail/message-vendor-dialog'
import { SimilarEquipment } from '@/components/detail/similar-equipment'
import { UnavailableBanner } from '@/components/detail/unavailable-banner'
import { DetailSkeleton } from '@/components/detail/detail-skeleton'

export function EquipmentDetailPage() {
  const { id } = useAppParams<{ id: string }>()
  const [searchParams, setSearchParams] = useAppSearchParams()
  const navigate = useAppNavigate()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [equipment, setEquipment] = useState<EquipmentDetail | null>(null)
  const [similarItems, setSimilarItems] = useState<EquipmentListingView[]>([])
  const [vendorItems, setVendorItems] = useState<EquipmentListingView[]>([])
  const [availability, setAvailability] = useState<EquipmentAvailability | null>(null)

  const [mobileSheetOpen, setMobileSheetOpen] = useState(false)
  const [messageDialogOpen, setMessageDialogOpen] = useState(false)

  // URL State values
  const isPreview = searchParams.get('preview') === '1'
  const urlFrom = searchParams.get('from') || undefined
  const urlTo = searchParams.get('to') || undefined
  const urlQty = parseInt(searchParams.get('qty') || '1', 10)
  const simulateParam = searchParams.get('simulate') || undefined

  // Sanitize quantity
  const quantity = Math.max(1, isNaN(urlQty) ? 1 : urlQty)

  // Document Title
  const title = equipment
    ? `${equipment.name} | Rent4Fraction`
    : 'Equipment Rental | Rent4Fraction'
  usePageTitle(title)

  // Sync dates & qty to URL with replace: true
  const updateUrlState = useCallback(
    (newFrom?: string, newTo?: string, newQty?: number) => {
      const nextParams = new URLSearchParams(searchParams)

      if (newFrom) nextParams.set('from', newFrom)
      else nextParams.delete('from')

      if (newTo) nextParams.set('to', newTo)
      else nextParams.delete('to')

      if (newQty && newQty > 1) nextParams.set('qty', String(newQty))
      else nextParams.delete('qty')

      setSearchParams(nextParams, { replace: true })
    },
    [searchParams, setSearchParams],
  )

  // Handle dates change
  const handleDatesChange = (from?: string, to?: string) => {
    // Sanitize to >= from
    let validTo = to
    if (from && to && new Date(to) < new Date(from)) {
      validTo = from
    }
    updateUrlState(from, validTo, quantity)
  }

  // Handle quantity change
  const handleQuantityChange = (newQty: number) => {
    updateUrlState(urlFrom, urlTo, newQty)
  }

  // Fetch equipment detail and related recommendations
  const loadDetail = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)

    try {
      const detail = await getEquipmentDetail(id, simulateParam)
      setEquipment(detail)

      if (detail) {
        const [sim, ven, avail] = await Promise.all([
          getSimilarEquipment(detail.equipment_id),
          getVendorEquipment(detail.vendor_id, detail.equipment_id),
          getEquipmentAvailability(detail.equipment_id, urlFrom, urlTo),
        ])
        setSimilarItems(sim)
        setVendorItems(ven)
        setAvailability(avail)
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      setLoading(false)
    }
  }, [id, simulateParam, urlFrom, urlTo])

  useEffect(() => {
    loadDetail()
  }, [loadDetail])

  // Re-check live availability when date range changes
  useEffect(() => {
    if (equipment) {
      getEquipmentAvailability(equipment.equipment_id, urlFrom, urlTo).then(
        (res) => {
          setAvailability(res)
        },
      )
    }
  }, [equipment, urlFrom, urlTo])

  // Breadcrumbs items
  const breadcrumbItems = useMemo(() => {
    if (!equipment) return []
    const path = equipment.category_path || []
    return [
      { label: 'Home', href: '/' },
      { label: 'Equipment', href: '/equipment' },
      ...(path[0]
        ? [
            {
              label: path[0].name,
              href: `/equipment?category=${path[0].id}`,
            },
          ]
        : []),
      ...(path[1]
        ? [
            {
              label: path[1].name,
              href: `/equipment?category=${path[1].id}`,
            },
          ]
        : []),
      { label: equipment.name },
    ]
  }, [equipment])

  // 1. LOADING STATE
  if (loading) {
    return <DetailSkeleton />
  }

  // 2. ERROR STATE (Supports ?simulate=error)
  if (error) {
    return (
      <PageContainer className="py-12">
        <ErrorState
          title="Could not load equipment details"
          message={error.message || 'An error occurred while retrieving gear details.'}
          onRetry={loadDetail}
        />
      </PageContainer>
    )
  }

  // 3. NOT FOUND STATE (e.g. /equipment/999)
  if (!equipment) {
    return (
      <PageContainer className="py-16 flex flex-col items-center justify-center text-center">
        <div className="size-12 rounded-sm bg-muted text-muted-foreground flex items-center justify-center mb-4">
          <Icon name="box" size={24} />
        </div>
        <h1 className="text-headline-sm font-semibold text-foreground mb-2">
          Equipment listing not found
        </h1>
        <p className="text-body-sm text-text-secondary max-w-md mb-6 leading-normal">
          The requested equipment (ID: {id}) could not be located. It may have been unlisted or removed.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <AppLink to="/equipment">
            <Button size="default">
              Browse all equipment
            </Button>
          </AppLink>
          <Button
            variant="outline"
            size="default"
            onClick={() => navigate(-1)}
            className="gap-2"
          >
            <Icon name="arrow-left" size={16} />
            <span>Go back</span>
          </Button>
        </div>
      </PageContainer>
    )
  }

  const isUnavailable = equipment.status !== 'active'

  return (
    <PageContainer className="py-5 sm:py-7 space-y-6 pb-[calc(5rem+env(safe-area-inset-bottom,0px))] lg:pb-7">
      {/* Top Breadcrumb Navigation */}
      <Breadcrumbs items={breadcrumbItems} />

      {/* Unavailable Listing Banner (if inactive/out_of_stock or ?simulate=unavailable) */}
      {isUnavailable && (
        <UnavailableBanner
          status={equipment.status}
          categoryName={equipment.category_name}
          categoryId={equipment.category_id}
        />
      )}

      {/* Main Two-Column Layout (Desktop >=1024px: 8 cols left, 4 cols sticky right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
        {/* Left Column: Gallery, Title Block, Sticky Section Nav, Content Cards */}
        <div className="lg:col-span-8 space-y-8 min-w-0">
          {/* 1. Image Gallery with Lightbox */}
          <ImageGallery
            equipmentId={equipment.equipment_id}
            equipmentName={equipment.name}
            images={equipment.images}
            category={equipment.category_id}
            readOnly={isPreview}
          />

          {/* 2. Equipment Header Title Block */}
          <EquipmentHeader equipment={equipment} />

          {/* 3. Sticky Scroll-Spy Section Nav (48px high) */}
          <SectionNav />

          {/* 4. Section: Overview (#overview) */}
          <OverviewSection equipment={equipment} />

          {/* 5. Section: Specifications (#specifications) */}
          <section
            id="specifications"
            className="rounded-[16px] border border-border bg-surface p-5 sm:p-7 shadow-none space-y-5 scroll-mt-28"
            aria-labelledby="specs-heading"
          >
            <div className="space-y-1">
              <h2
                id="specs-heading"
                className="font-serif text-xl sm:text-2xl font-bold text-foreground"
              >
                Specifications
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Technical parameters, electrical power, and venue suitability metrics.
              </p>
            </div>
            <SpecsTable specifications={equipment.specifications} />
          </section>

          {/* 6. Section: Availability Calendar (#availability) */}
          <AvailabilityCalendar
            from={urlFrom}
            to={urlTo}
            onSelectRange={handleDatesChange}
            blockedRanges={equipment.blocked_ranges}
            totalStock={equipment.quantity}
            availableQuantity={availability?.available_quantity}
            nextAvailableFrom={availability?.next_available_from}
          />

          {/* 7. Section: Reviews (#reviews) */}
          <ReviewsSection
            equipmentId={equipment.equipment_id}
            vendorName={equipment.vendor_name}
            initialAvgRating={equipment.avg_rating}
            initialReviewCount={equipment.review_count}
          />

          {/* 8. Section: Vendor Profile (#vendor) */}
          <VendorInfoCard
            vendor={equipment.vendor}
            onOpenMessage={isPreview ? undefined : () => setMessageDialogOpen(true)}
            preview={isPreview}
          />

          {/* 9. Recommendations: "You might also like" + "More from this vendor" */}
          <SimilarEquipment
            similarItems={similarItems}
            vendorItems={vendorItems}
            vendorName={equipment.vendor_name}
          />
        </div>

        {/* Right Sticky Column (>=1024px Desktop: Top Offset 88px, width ~380px) */}
        <div className="hidden lg:block lg:col-span-4 sticky top-[88px] z-20">
          {isPreview ? (
            <div className="rounded-[16px] border border-border bg-surface p-6 space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Listing preview</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                This is a read-only preview of the customer view. Booking, cart, messaging, and wishlist actions are disabled.
              </p>
            </div>
          ) : (
            <BookingCard
              equipment={equipment}
              from={urlFrom}
              to={urlTo}
              quantity={quantity}
              availableQuantity={availability?.available_quantity}
              onDatesChange={handleDatesChange}
              onQuantityChange={handleQuantityChange}
              onOpenMessageVendor={() => setMessageDialogOpen(true)}
            />
          )}
        </div>
      </div>

      {/* Mobile Sticky Booking Bar (<1024px) */}
      {!isPreview && (
        <MobileBookingBar
          equipment={equipment}
          from={urlFrom}
          to={urlTo}
          onOpenSheet={() => setMobileSheetOpen(true)}
        />
      )}

      {/* Mobile Booking Sheet Bottom Drawer */}
      {!isPreview && (
        <BookingSheet
          open={mobileSheetOpen}
          onOpenChange={setMobileSheetOpen}
          equipment={equipment}
          from={urlFrom}
          to={urlTo}
          quantity={quantity}
          availableQuantity={availability?.available_quantity}
          onDatesChange={handleDatesChange}
          onQuantityChange={handleQuantityChange}
          onOpenMessageVendor={() => setMessageDialogOpen(true)}
        />
      )}

      {/* Direct Message Vendor Dialog */}
      {!isPreview && (
        <MessageVendorDialog
          open={messageDialogOpen}
          onOpenChange={setMessageDialogOpen}
          vendorId={equipment.vendor_id}
          vendorName={equipment.vendor_name}
          equipmentId={equipment.equipment_id}
          equipmentName={equipment.name}
        />
      )}
    </PageContainer>
  )
}
