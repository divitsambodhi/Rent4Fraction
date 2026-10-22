import { EquipmentCard } from '@/components/shared/equipment-card'
import { AppLink } from '@/components/shared/app-link'
import { EquipmentCardSkeleton } from '@/components/shared/loading-skeleton'
import { ErrorState } from '@/components/shared/error-state'
import { useAsync } from '@/hooks/use-async'
import { getFeaturedEquipment } from '@/lib/api'

interface FeaturedSectionProps {
  dates?: { from?: string; to?: string }
}

/**
 * FeaturedSection: Popular equipment grid (4 columns desktop, 2 tablet, 1-2 mobile).
 * Left-aligned section title, plain "View all equipment" link.
 * Shows availability and "₹X for N days" when dates are chosen in hero.
 */
export function FeaturedSection({ dates }: FeaturedSectionProps) {
  const {
    data: equipmentList,
    loading,
    error,
    refetch,
  } = useAsync(getFeaturedEquipment)

  let rentalDays: number | undefined
  if (dates?.from && dates?.to) {
    const start = new Date(dates.from)
    const end = new Date(dates.to)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    rentalDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)))
  }

  return (
    <section className="py-10 md:py-16">
      <div className="flex items-baseline justify-between mb-6">
        <div>
          <h2 className="font-serif text-2xl md:text-3xl font-semibold tracking-[-0.02em] text-foreground">
            Popular equipment
          </h2>
          <p className="text-body-sm text-text-secondary mt-1">
            Sound systems, illumination rigs, and staging available for your dates.
          </p>
        </div>
        <AppLink
          to="/equipment"
          className="text-label-lg text-brand hover:underline shrink-0"
        >
          View all equipment
        </AppLink>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 min-[360px]:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <EquipmentCardSkeleton key={i} />
          ))}
        </div>
      ) : error ? (
        <ErrorState
          title="Could not load equipment"
          message={error.message}
          onRetry={refetch}
        />
      ) : (
        <div className="grid grid-cols-1 min-[360px]:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {equipmentList?.map((eq) => (
            <EquipmentCard
              key={eq.equipment_id}
              equipment={eq}
              rentalDays={rentalDays}
            />
          ))}
        </div>
      )}
    </section>
  )
}
