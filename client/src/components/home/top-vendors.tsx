import { VendorCard } from '@/components/shared/vendor-card'
import { SectionHeader } from '@/components/shared/section-header'
import { VendorCardSkeleton } from '@/components/shared/loading-skeleton'
import { ErrorState } from '@/components/shared/error-state'
import { useAsync } from '@/hooks/use-async'
import { getTopVendors } from '@/lib/api'

export function TopVendors() {
  const { data: vendors, loading, error, refetch } = useAsync(getTopVendors)

  return (
    <section id="vendors" className="py-16 sm:py-20 border-t border-border">
      <SectionHeader
        eyebrow="Verified Equipment Partners"
        title="Meet top-rated "
        accentWord="vendors"
        subtitle="Professional sound engineers, lighting technicians, and decor rental companies with proven track records."
        actionHref="/equipment"
        actionText="Explore all vendors"
      />

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <VendorCardSkeleton key={i} />
          ))}
        </div>
      ) : error ? (
        <ErrorState
          title="Could not load vendors"
          message={error.message}
          onRetry={refetch}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {vendors?.map((v) => (
            <VendorCard key={v.id} vendor={v} />
          ))}
        </div>
      )}
    </section>
  )
}
