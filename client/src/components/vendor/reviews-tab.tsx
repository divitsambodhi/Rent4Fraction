import { ChevronLeft, ChevronRight, MessageSquare, RefreshCw, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAppSearchParams } from '@/components/shared/app-link'
import { Skeleton } from '@/components/shared/loading-skeleton'
import { ReviewSummary } from './review-summary'
import { VendorReviewCard } from './vendor-review-card'
import type { VendorReviewsResult } from '@/types/vendor'

interface ReviewsTabProps {
  data: VendorReviewsResult | null
  loading: boolean
  error: Error | null
  onRefetch: () => void
  onSaveReply: (reviewId: string, replyText: string) => Promise<void>
  equipmentOptions?: { id: string; name: string }[]
}

export function ReviewsTab({
  data,
  loading,
  error,
  onRefetch,
  onSaveReply,
  equipmentOptions = [],
}: ReviewsTabProps) {
  const [searchParams, setSearchParams] = useAppSearchParams()
  const ratingParam = searchParams.get('rating') ? parseInt(searchParams.get('rating')!, 10) : undefined
  const replyParam = searchParams.get('reply') || 'all'
  const equipmentParam = searchParams.get('equipment') || 'all'
  const sortParam = searchParams.get('sort') || 'newest'
  const pageParam = parseInt(searchParams.get('page') || '1', 10)

  const handleRatingChange = (rating?: number) => {
    const next = new URLSearchParams(searchParams)
    if (rating) {
      next.set('rating', String(rating))
    } else {
      next.delete('rating')
    }
    next.set('page', '1')
    setSearchParams(next)
  }

  const handleReplyFilter = (mode: 'all' | 'needs') => {
    const next = new URLSearchParams(searchParams)
    if (mode === 'needs') {
      next.set('reply', 'needs')
    } else {
      next.delete('reply')
    }
    next.set('page', '1')
    setSearchParams(next)
  }

  const handleEquipmentChange = (equipmentId: string) => {
    const next = new URLSearchParams(searchParams)
    if (equipmentId === 'all') {
      next.delete('equipment')
    } else {
      next.set('equipment', equipmentId)
    }
    next.set('page', '1')
    setSearchParams(next)
  }

  const handleSortChange = (newSort: string) => {
    const next = new URLSearchParams(searchParams)
    next.set('sort', newSort)
    next.set('page', '1')
    setSearchParams(next)
  }

  const handlePageChange = (newPage: number) => {
    const next = new URLSearchParams(searchParams)
    next.set('page', String(newPage))
    setSearchParams(next)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-44 w-full rounded-2xl" />
        <Skeleton className="h-10 w-full rounded-xl" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-danger/30 bg-danger/5 p-8 text-center space-y-4 max-w-lg mx-auto my-12">
        <h2 className="font-serif text-lg font-bold text-foreground">
          Failed to load customer reviews
        </h2>
        <p className="text-sm text-muted-foreground">{error?.message || 'Unable to retrieve customer reviews.'}</p>
        <Button onClick={onRefetch} variant="outline" className="gap-2">
          <RefreshCw className="size-4" />
          <span>Retry</span>
        </Button>
      </div>
    )
  }

  // Filter reviews client-side based on URL params
  let filtered = [...data.reviews]

  if (ratingParam) {
    filtered = filtered.filter((r) => r.rating === ratingParam)
  }

  if (replyParam === 'needs') {
    filtered = filtered.filter((r) => !r.vendor_reply)
  }

  if (equipmentParam !== 'all') {
    filtered = filtered.filter((r) => r.equipment_id === equipmentParam)
  }

  // Sort reviews
  if (sortParam === 'highest') {
    filtered.sort((a, b) => b.rating - a.rating)
  } else if (sortParam === 'lowest') {
    filtered.sort((a, b) => a.rating - b.rating)
  } else {
    // newest default
    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }

  // Pagination (5 per page)
  const pageSize = 5
  const totalCount = filtered.length
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const currentPage = Math.min(pageParam, totalPages)
  const paginatedReviews = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  return (
    <div className="space-y-6">
      {/* Review Summary Scoreboard */}
      <ReviewSummary
        averageRating={data.summary.average_rating}
        totalReviews={data.summary.total_reviews}
        distribution={data.summary.distribution}
        repliedCount={data.summary.replied_count}
        activeRating={ratingParam}
        onSelectRating={handleRatingChange}
      />

      {/* Filter and Sort Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-xl border border-border bg-surface">
        <div className="flex flex-wrap items-center gap-2">
          {/* Needs Reply Switch */}
          <button
            onClick={() => handleReplyFilter(replyParam === 'needs' ? 'all' : 'needs')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              replyParam === 'needs'
                ? 'bg-brand text-white shadow-xs'
                : 'bg-surface border border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            <MessageSquare className="size-3.5" />
            <span>Needs reply ({data.summary.needs_reply_count})</span>
          </button>

          {/* Rating Pills */}
          {[5, 4, 3, 2, 1].map((stars) => {
            const isSelected = ratingParam === stars
            return (
              <button
                key={stars}
                onClick={() => handleRatingChange(isSelected ? undefined : stars)}
                className={`px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                  isSelected
                    ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40 font-semibold'
                    : 'bg-surface border border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                <span>{stars}</span>
                <Star className="size-3 fill-amber-500 text-amber-500" />
              </button>
            )
          })}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Equipment Selector */}
          {equipmentOptions.length > 0 && (
            <select
              value={equipmentParam}
              onChange={(e) => handleEquipmentChange(e.target.value)}
              className="h-8 rounded-lg border border-border bg-surface px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-brand max-w-[180px] truncate cursor-pointer"
            >
              <option value="all">All equipment</option>
              {equipmentOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.name}
                </option>
              ))}
            </select>
          )}

          {/* Sort Selector */}
          <select
            value={sortParam}
            onChange={(e) => handleSortChange(e.target.value)}
            className="h-8 rounded-lg border border-border bg-surface px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-brand cursor-pointer"
          >
            <option value="newest">Newest first</option>
            <option value="highest">Highest rated</option>
            <option value="lowest">Lowest rated</option>
          </select>
        </div>
      </div>

      {/* Reviews List */}
      {paginatedReviews.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-12 text-center text-muted-foreground space-y-2">
          <MessageSquare className="size-8 mx-auto opacity-40 mb-1" />
          <h3 className="text-sm font-semibold text-foreground">No reviews match your filters</h3>
          <p className="text-xs text-muted-foreground">Try clearing your rating or reply filter.</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const next = new URLSearchParams(searchParams)
              next.delete('rating')
              next.delete('reply')
              next.delete('equipment')
              next.set('page', '1')
              setSearchParams(next)
            }}
            className="text-xs mt-2"
          >
            Reset filters
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {paginatedReviews.map((review) => (
            <VendorReviewCard
              key={review.review_id}
              review={review}
              onSaveReply={onSaveReply}
            />
          ))}

          {/* Pagination Controls (5 per page) */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-muted-foreground">
                Showing {Math.min((currentPage - 1) * pageSize + 1, totalCount)} to{' '}
                {Math.min(currentPage * pageSize, totalCount)} of {totalCount} reviews
              </span>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="h-8 px-2.5 gap-1 text-xs"
                >
                  <ChevronLeft className="size-3.5" />
                  <span>Previous</span>
                </Button>

                <span className="text-xs font-medium text-foreground px-2">
                  {currentPage} of {totalPages}
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  className="h-8 px-2.5 gap-1 text-xs"
                >
                  <span>Next</span>
                  <ChevronRight className="size-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
