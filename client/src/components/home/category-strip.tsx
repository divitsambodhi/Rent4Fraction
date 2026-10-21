import { CategoryCard } from '@/components/shared/category-card'
import { AppLink } from '@/components/shared/app-link'
import { CategoryStripSkeleton } from '@/components/shared/loading-skeleton'
import { ErrorState } from '@/components/shared/error-state'
import { useAsync } from '@/hooks/use-async'
import { getCategories } from '@/lib/api'

/**
 * CategoryStrip: 8 real categories in an evenly spaced grid of compact bordered tiles
 * (8px radius, 16px padding), 4 columns desktop, 2 mobile, zero icons.
 */
export function CategoryStrip() {
  const { data: categories, loading, error, refetch } = useAsync(getCategories)

  return (
    <section className="py-10 md:py-16">
      <div className="flex items-baseline justify-between mb-6">
        <div>
          <h2 className="text-headline-md font-semibold text-foreground">
            Browse by category
          </h2>
          <p className="text-body-sm text-text-secondary mt-1">
            Sound, lighting, seating, and staging equipment for events.
          </p>
        </div>
        <AppLink
          to="/equipment"
          className="text-label-lg text-brand hover:underline shrink-0 hidden sm:inline"
        >
          View all equipment
        </AppLink>
      </div>

      {loading ? (
        <CategoryStripSkeleton />
      ) : error ? (
        <ErrorState
          title="Unable to load categories"
          message={error.message}
          onRetry={refetch}
        />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {categories?.map((cat) => (
            <CategoryCard key={cat.id} category={cat} />
          ))}
        </div>
      )}
    </section>
  )
}
