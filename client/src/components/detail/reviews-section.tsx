import { useState, useEffect } from 'react'
import { ChevronDown, Loader2, Star, X } from 'lucide-react'
import { ReviewSummary } from './review-summary'
import { ReviewCard } from './review-card'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { getEquipmentReviews } from '@/lib/api'
import type { Review, ReviewsResponse } from '@/types'
import { cn } from '@/lib/utils'

interface ReviewsSectionProps {
  equipmentId: string
  vendorName: string
  initialAvgRating: number
  initialReviewCount: number
  className?: string
}

export function ReviewsSection({
  equipmentId,
  vendorName,
  initialAvgRating,
  initialReviewCount,
  className,
}: ReviewsSectionProps) {
  const [ratingFilter, setRatingFilter] = useState<number | undefined>(undefined)
  const [sortOption, setSortOption] = useState<'newest' | 'highest' | 'lowest'>('newest')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [reviewsData, setReviewsData] = useState<ReviewsResponse | null>(null)
  const [displayedReviews, setDisplayedReviews] = useState<Review[]>([])

  // Reset pagination on filter or sort change
  useEffect(() => {
    let mounted = true
    setLoading(true)

    getEquipmentReviews(equipmentId, {
      rating: ratingFilter,
      sort: sortOption,
      page: 1,
      pageSize: 5,
    }).then((res) => {
      if (mounted) {
        setReviewsData(res)
        setDisplayedReviews(res.items)
        setPage(1)
        setLoading(false)
      }
    })

    return () => {
      mounted = false
    }
  }, [equipmentId, ratingFilter, sortOption])

  // Handle "Show more reviews"
  const handleLoadMore = async () => {
    if (loadingMore || !reviewsData) return
    const nextPage = page + 1
    setLoadingMore(true)

    try {
      const res = await getEquipmentReviews(equipmentId, {
        rating: ratingFilter,
        sort: sortOption,
        page: nextPage,
        pageSize: 5,
      })
      setDisplayedReviews((prev) => [...prev, ...res.items])
      setPage(nextPage)
    } finally {
      setLoadingMore(false)
    }
  }

  const totalReviews = reviewsData?.total ?? initialReviewCount
  const hasMore = displayedReviews.length < totalReviews

  const sortLabels = {
    newest: 'Newest first',
    highest: 'Highest rated',
    lowest: 'Lowest rated',
  }

  return (
    <section
      id="reviews"
      className={cn(
        'rounded-[16px] border border-border bg-surface p-5 sm:p-7 shadow-xs space-y-6 scroll-mt-28',
        className,
      )}
      aria-labelledby="reviews-heading"
    >
      <div className="space-y-1">
        <h2
          id="reviews-heading"
          className="font-serif text-xl sm:text-2xl font-bold text-foreground"
        >
          Customer Reviews
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Ratings and written feedback from verified event rentals.
        </p>
      </div>

      {/* Summary with large Fraunces score and 5-bar distribution */}
      {reviewsData && (
        <ReviewSummary
          avgRating={reviewsData.summary.avg || initialAvgRating}
          totalCount={reviewsData.summary.count || initialReviewCount}
          distribution={reviewsData.summary.distribution}
          activeRating={ratingFilter}
          onSelectRating={setRatingFilter}
        />
      )}

      {/* Controls Bar: Active Filter Chip & Sort Dropdown */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/70">
        <div className="flex items-center gap-2">
          {ratingFilter ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand/10 border border-brand/30 text-brand text-xs font-semibold">
              <Star className="size-3 fill-brand" />
              <span>Showing {ratingFilter}-star reviews</span>
              <button
                type="button"
                onClick={() => setRatingFilter(undefined)}
                aria-label="Remove star rating filter"
                className="size-4 rounded-full hover:bg-brand/20 flex items-center justify-center cursor-pointer ml-0.5"
              >
                <X className="size-3" />
              </button>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground font-medium">
              Showing all verified reviews
            </span>
          )}
        </div>

        {/* Sort Select */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] border border-border bg-surface text-xs font-medium text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              <span className="text-muted-foreground">Sort:</span>
              <span>{sortLabels[sortOption]}</span>
              <ChevronDown className="size-3.5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-surface border-border">
            <DropdownMenuItem onClick={() => setSortOption('newest')}>
              Newest first
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortOption('highest')}>
              Highest rated
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortOption('lowest')}>
              Lowest rated
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Reviews List */}
      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="size-6 animate-spin text-brand" />
          <span className="text-xs">Loading reviews...</span>
        </div>
      ) : displayedReviews.length === 0 ? (
        <div className="py-10 text-center rounded-[12px] bg-muted/20 border border-border/60 p-6 space-y-3">
          <p className="text-sm text-foreground font-medium">
            No reviews match your selected {ratingFilter}-star filter.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setRatingFilter(undefined)}
            className="text-xs"
          >
            Clear rating filter
          </Button>
        </div>
      ) : (
        <div className="space-y-3.5">
          {displayedReviews.map((review) => (
            <ReviewCard
              key={review.review_id}
              review={review}
              vendorName={vendorName}
            />
          ))}
        </div>
      )}

      {/* Paging / Load More Footer */}
      {!loading && displayedReviews.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-border/70">
          <span className="text-xs text-muted-foreground tabular-nums">
            Showing {displayedReviews.length} of {totalReviews} reviews
          </span>

          {hasMore && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="text-xs font-semibold px-4 rounded-[8px]"
            >
              {loadingMore ? (
                <>
                  <Loader2 className="size-3.5 animate-spin mr-1.5" />
                  Loading...
                </>
              ) : (
                'Show more reviews'
              )}
            </Button>
          )}
        </div>
      )}

      {/* Strict Policy Note */}
      <p className="text-[11px] text-muted-foreground/80 leading-normal pt-1">
        Only customers who rented this item can leave a review. All ratings are verified against completed bookings.
      </p>
    </section>
  )
}
