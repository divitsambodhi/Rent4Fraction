import { useEffect, useState, useRef, useCallback } from 'react'
import { ChevronRight, HelpCircle } from 'lucide-react'
import { AppLink } from '@/components/shared/app-link'
import { PageContainer } from '@/components/shared/page-container'
import { EquipmentCard } from '@/components/shared/equipment-card'
import { EquipmentCardSkeleton } from '@/components/shared/loading-skeleton'
import { ErrorState } from '@/components/shared/error-state'
import { Button } from '@/components/ui/button'

import { CatalogSearchBar } from '@/components/catalog/catalog-search-bar'
import { FilterPanel } from '@/components/catalog/filter-panel'
import { FilterSheet } from '@/components/catalog/filter-sheet'
import { ResultsHeader } from '@/components/catalog/results-header'
import { ActiveFilterChips } from '@/components/catalog/active-filter-chips'
import { CategoryBanner } from '@/components/catalog/category-banner'
import { VendorHeader } from '@/components/catalog/vendor-header'
import { CatalogPagination } from '@/components/catalog/catalog-pagination'
import { EmptyResults } from '@/components/catalog/empty-results'

import { useCatalogParams } from '@/hooks/use-catalog-params'
import { usePageTitle } from '@/hooks/use-page-title'
import {
  searchEquipment,
  getCategoryTree,
  getVendors,
  CANONICAL_CATEGORIES,
  CANONICAL_GROUPS,
  type CategoryTreeGroup,
  type CanonicalVendor,
  type SearchEquipmentResult,
} from '@/lib/api'

export function CatalogPage() {
  const { params, apiSearchParams, setParams, clearAllFilters } =
    useCatalogParams()

  const [mobileSheetOpen, setMobileSheetOpen] = useState(false)
  const [categoryTree, setCategoryTree] = useState<CategoryTreeGroup[]>([])
  const [vendors, setVendors] = useState<CanonicalVendor[]>([])

  const [searchResult, setSearchResult] = useState<SearchEquipmentResult | null>(
    null,
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const resultsTopRef = useRef<HTMLDivElement>(null)
  const latestRequestId = useRef(0)

  const activeCategory = params.category
    ? CANONICAL_CATEGORIES.find((c) => c.id === params.category)
    : undefined

  const activeGroup =
    params.category && !activeCategory
      ? CANONICAL_GROUPS.find((g) => g.id === params.category)
      : undefined

  const activeVendor = params.vendor
    ? vendors.find((v) => v.id === params.vendor)
    : undefined

  const pageTitle = activeCategory
    ? `${activeCategory.name} Equipment`
    : activeGroup
      ? `${activeGroup.name} Equipment`
      : activeVendor
        ? `${activeVendor.name} Storefront`
        : 'Equipment Catalog'

  usePageTitle(pageTitle)

  // 1. Load initial category tree and vendor list for filter panel
  useEffect(() => {
    let mounted = true
    Promise.all([getCategoryTree(), getVendors()]).then(([tree, vList]) => {
      if (mounted) {
        setCategoryTree(tree)
        setVendors(vList)
      }
    })
    return () => {
      mounted = false
    }
  }, [])

  // 2. Fetch search results with stale response protection
  const executeSearch = useCallback(async () => {
    const requestId = ++latestRequestId.current
    setLoading(true)
    setError(null)

    try {
      const res = await searchEquipment(apiSearchParams)
      // Discard response if a newer search request was initiated
      if (requestId === latestRequestId.current) {
        setSearchResult(res)
        setLoading(false)
      }
    } catch (err) {
      if (requestId === latestRequestId.current) {
        setError(err instanceof Error ? err : new Error(String(err)))
        setLoading(false)
      }
    }
  }, [apiSearchParams])

  useEffect(() => {
    executeSearch()
  }, [executeSearch])

  // 3. Resolve unknown Category / Group or Vendor for Mode Headers
  const isUnknownCategory = Boolean(
    params.category &&
      params.category !== 'all' &&
      !activeCategory &&
      !activeGroup,
  )

  const isUnknownVendor = Boolean(
    params.vendor && params.vendor !== 'all' && !activeVendor,
  )

  // 4. Page change with smooth scroll to top of results
  const handlePageChange = (newPage: number) => {
    setParams({ page: newPage }, { push: true })
    if (resultsTopRef.current) {
      resultsTopRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <PageContainer size="wide" className="py-6 sm:py-10">
      {/* Breadcrumb Navigation */}
      <nav
        aria-label="Breadcrumbs"
        className="flex items-center gap-1.5 text-xs text-muted-foreground mb-6 overflow-x-auto whitespace-nowrap scrollbar-none"
      >
        <AppLink to="/" className="hover:text-brand transition-colors">
          Home
        </AppLink>
        <ChevronRight className="size-3.5 text-muted-foreground/60 shrink-0" />
        <AppLink
          to="/equipment"
          className={
            !activeCategory && !activeGroup && !activeVendor
              ? 'text-foreground font-semibold'
              : 'hover:text-brand transition-colors'
          }
        >
          Equipment
        </AppLink>

        {(activeCategory || activeGroup) && (
          <>
            <ChevronRight className="size-3.5 text-muted-foreground/60 shrink-0" />
            <span className="text-foreground font-semibold">
              {activeCategory?.name || activeGroup?.name}
            </span>
          </>
        )}

        {activeVendor && (
          <>
            <ChevronRight className="size-3.5 text-muted-foreground/60 shrink-0" />
            <span className="text-foreground font-semibold">
              {activeVendor.name}
            </span>
          </>
        )}
      </nav>

      {/* Mode Header 1: Default Hero Header (When no specific category/vendor selected) */}
      {!params.category && !params.vendor && (
        <div className="mb-8 max-w-3xl">
          <p className="text-[11px] font-bold uppercase tracking-widest text-brand mb-2">
            Make room for more
          </p>
          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-semibold text-foreground tracking-tight leading-tight">
            Rent better.{' '}
            <em className="italic font-normal text-brand">Live bigger.</em>
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-3 leading-relaxed">
            Quality event equipment from trusted local suppliers, verified and ready for your next celebration, concert, or gathering.
          </p>
        </div>
      )}

      {/* Mode Header 2: Category Banner Mode */}
      {activeCategory && (
        <CategoryBanner
          category={activeCategory}
          tree={categoryTree}
          onSelectCategory={(catId) => setParams({ category: catId })}
        />
      )}

      {/* Mode Header 2b: Category Group Banner (e.g. Sound, Lighting) */}
      {activeGroup && (
        <div className="rounded-[20px] border border-border bg-surface p-6 sm:p-8 shadow-xs mb-6">
          <p className="text-[11px] font-bold uppercase tracking-widest text-brand mb-1">
            Category Group
          </p>
          <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl font-semibold text-foreground tracking-tight">
            {activeGroup.name} Equipment.{' '}
            <em className="italic font-normal text-brand">Explore all.</em>
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
            Browse all items under {activeGroup.name}. Select a sub-category in the filter panel to narrow down specific gear.
          </p>
        </div>
      )}

      {/* Mode Header 3: Vendor Storefront Mode */}
      {activeVendor && <VendorHeader vendor={activeVendor} />}

      {/* In-page Not Found Block for Unknown Category or Vendor */}
      {(isUnknownCategory || isUnknownVendor) && (
        <div className="rounded-[20px] border border-warning/30 bg-warning/5 p-6 sm:p-8 shadow-xs mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <HelpCircle className="size-6 text-warning shrink-0 mt-0.5" />
            <div>
              <h2 className="font-serif text-lg font-semibold text-foreground">
                {isUnknownCategory
                  ? `Category "${params.category}" not found`
                  : `Vendor "${params.vendor}" not found`}
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                The requested {isUnknownCategory ? 'category' : 'vendor'} could not be located in our verified directory. Showing all equipment instead.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setParams({ category: undefined, vendor: undefined })}
            className="text-xs font-semibold shrink-0"
          >
            View all equipment
          </Button>
        </div>
      )}

      {/* Main Search Bar Row */}
      <div className="mb-8">
        <CatalogSearchBar
          initialQuery={params.q}
          from={params.from}
          to={params.to}
          rentalDays={params.rentalDays}
          onSearch={(q) => setParams({ q })}
          onDateChange={({ from, to }) => setParams({ from, to })}
        />
      </div>

      {/* Results Anchor for smooth scrolling */}
      <div ref={resultsTopRef} />

      {/* 2-Column Catalog Layout: Sticky 280px Sidebar + Results Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 lg:gap-8 items-start">
        {/* Desktop Sticky Filter Sidebar (≥1024px) */}
        <aside
          aria-label="Filters"
          className="hidden lg:block sticky top-[88px] max-h-[calc(100vh-104px)] overflow-y-auto pr-1 scrollbar-thin"
        >
          <FilterPanel
            params={params}
            categoryTree={categoryTree}
            vendors={vendors}
            onUpdateParams={(updates) => setParams(updates)}
            onClearAll={clearAllFilters}
          />
        </aside>

        {/* Results Column */}
        <section
          className="min-w-0 space-y-5"
          aria-busy={loading}
          aria-label="Search results"
        >
          {/* Header Row: Result Count Announcement + Sort Select + Mobile Filters Trigger */}
          <ResultsHeader
            total={searchResult?.total ?? 0}
            page={params.page}
            pageSize={12}
            loading={loading}
            sort={params.sort}
            activeFilterCount={params.activeFilterCount}
            onSortChange={(sort) => setParams({ sort })}
            onOpenMobileFilters={() => setMobileSheetOpen(true)}
          />

          {/* Active Filter Chips */}
          <ActiveFilterChips
            params={params}
            onRemoveParam={(key) => setParams({ [key]: undefined })}
            onClearAll={clearAllFilters}
          />

          {/* Main Results View States */}
          {loading ? (
            /* 12-Card Loading Skeleton Grid matching real card layout */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 12 }).map((_, idx) => (
                <EquipmentCardSkeleton key={idx} />
              ))}
            </div>
          ) : error ? (
            /* Error State with Retry Button */
            <ErrorState
              title="Unable to load catalog"
              message={error.message}
              onRetry={executeSearch}
              className="my-8"
            />
          ) : !searchResult?.items.length ? (
            /* Empty State with Filter Relax Hint & 4 Category Chips */
            <EmptyResults
              hasFilters={params.activeFilterCount > 0}
              onClearFilters={clearAllFilters}
              onSelectCategory={(catId) => setParams({ category: catId })}
              className="my-6"
            />
          ) : (
            /* 12-Card Responsive Grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {searchResult.items.map((item) => (
                <EquipmentCard
                  key={item.equipment_id}
                  equipment={item}
                  availableQuantity={item.available_quantity}
                  rentalDays={params.rentalDays}
                  className="h-full"
                />
              ))}
            </div>
          )}

          {/* Catalog Pagination */}
          {!loading && !error && searchResult && searchResult.total > 0 && (
            <CatalogPagination
              page={params.page}
              total={searchResult.total}
              pageSize={12}
              onPageChange={handlePageChange}
            />
          )}
        </section>
      </div>

      {/* Mobile / Tablet Filter Sheet (<1024px) */}
      <FilterSheet
        open={mobileSheetOpen}
        onOpenChange={setMobileSheetOpen}
        params={params}
        categoryTree={categoryTree}
        vendors={vendors}
        totalResults={searchResult?.total ?? 0}
        onUpdateParams={(updates) => setParams(updates)}
        onClearAll={clearAllFilters}
      />
    </PageContainer>
  )
}
