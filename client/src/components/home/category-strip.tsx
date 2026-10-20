import { CategoryCard } from '@/components/shared/category-card'
import { SectionHeader } from '@/components/shared/section-header'
import { CategoryStripSkeleton } from '@/components/shared/loading-skeleton'
import { ErrorState } from '@/components/shared/error-state'
import { useAsync } from '@/hooks/use-async'
import { getCategories } from '@/lib/api'

export function CategoryStrip() {
  const { data: categories, loading, error, refetch } = useAsync(getCategories)

  return (
    <section className="py-12 sm:py-16">
      <SectionHeader
        eyebrow="Curated Event Catalog"
        title="Browse by event "
        accentWord="category"
        subtitle="Reserve specialized sound, stage illumination, seating, and marquee canopies from verified vendors."
        actionHref="/equipment"
        actionText="View all 8 categories"
      />

      {loading ? (
        <CategoryStripSkeleton />
      ) : error ? (
        <ErrorState
          title="Unable to load categories"
          message={error.message}
          onRetry={refetch}
        />
      ) : (
        /* Mobile horizontal scroll with snap; Desktop 8-column clean row */
        <div className="flex sm:grid sm:grid-cols-4 lg:grid-cols-8 gap-3 sm:gap-4 overflow-x-auto pb-4 sm:pb-0 scrollbar-none snap-x snap-mandatory">
          {categories?.map((cat) => (
            <div key={cat.id} className="snap-start shrink-0">
              <CategoryCard category={cat} />
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
