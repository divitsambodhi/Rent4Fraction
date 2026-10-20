import { EquipmentCard } from '@/components/shared/equipment-card'
import { SectionHeader } from '@/components/shared/section-header'
import { EquipmentCardSkeleton } from '@/components/shared/loading-skeleton'
import { ErrorState } from '@/components/shared/error-state'
import { useAsync } from '@/hooks/use-async'
import { getFeaturedEquipment } from '@/lib/api'

export function FeaturedSection() {
  const {
    data: equipmentList,
    loading,
    error,
    refetch,
  } = useAsync(getFeaturedEquipment)

  return (
    <section className="py-12 sm:py-16">
      <SectionHeader
        eyebrow="Community Favorites"
        title="Popular for your next "
        accentWord="event"
        subtitle="Reserve individual items or bundle sound, lighting, and decor from multiple vendors in one checkout."
        actionHref="/equipment"
        actionText="See all equipment"
      />

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <EquipmentCardSkeleton key={i} />
          ))}
        </div>
      ) : error ? (
        <ErrorState
          title="Could not load featured equipment"
          message={error.message}
          onRetry={refetch}
        />
      ) : (
        /* Grid 4 columns on desktop, 2 on tablet, 1 on mobile (with horizontal snap on phones) */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
          {equipmentList?.map((eq) => (
            <EquipmentCard key={eq.equipment_id} equipment={eq} />
          ))}
        </div>
      )}
    </section>
  )
}
