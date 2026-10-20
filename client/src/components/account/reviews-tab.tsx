import { useEffect, useState } from 'react'
import { ReviewToWriteItem } from './review-to-write-item'
import { MyReviewCard } from './my-review-card'
import { BookingDetailSheet } from './booking-detail-sheet'
import { EmptyState } from '@/components/shared/empty-state'
import { useAppSearchParams } from '@/components/shared/app-link'
import { getMyReviews, getReviewsToWrite } from '@/lib/api'
import type { MyReview, ReviewToWrite } from '@/types/account'
import { CheckCircle2, Star } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ReviewsTab() {
  const [searchParams, setSearchParams] = useAppSearchParams()

  const rawView = searchParams.get('view')
  const view = rawView === 'mine' ? 'mine' : 'to-review'
  const bookingParam = searchParams.get('booking')

  const [toReviewList, setToReviewList] = useState<ReviewToWrite[]>([])
  const [myReviewsList, setMyReviewsList] = useState<MyReview[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = () => {
    setLoading(true)
    Promise.all([getReviewsToWrite(), getMyReviews()])
      .then(([toReviewRes, myReviewsRes]) => {
        setToReviewList(toReviewRes)
        setMyReviewsList(myReviewsRes)
      })
      .finally(() => {
        setLoading(false)
      })
  }

  useEffect(() => {
    loadData()
  }, [])

  // Listen for storage changes
  useEffect(() => {
    const handler = () => {
      loadData()
    }
    window.addEventListener('r4f-account-store-updated', handler)
    return () => window.removeEventListener('r4f-account-store-updated', handler)
  }, [])

  const updateQuery = (updates: Record<string, string | null>, pushHistory = false) => {
    const next = new URLSearchParams(searchParams)
    Object.entries(updates).forEach(([key, val]) => {
      if (val === null || val === '') {
        next.delete(key)
      } else {
        next.set(key, val)
      }
    })
    setSearchParams(next, { replace: !pushHistory })
  }

  const handleSelectView = (v: 'to-review' | 'mine') => {
    updateQuery({ view: v === 'to-review' ? null : v }, true)
  }

  const handleOpenBooking = (bookingId: string) => {
    updateQuery({ booking: bookingId }, true)
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-xl font-serif font-bold text-foreground">
          Equipment & Rental Reviews
        </h2>
        <p className="text-xs text-muted-foreground">
          Help community event planners by sharing truthful feedback on gear condition and performance.
        </p>
      </div>

      {/* Segmented Switcher: To review (N) | My reviews (N) */}
      <div className="flex items-center justify-between gap-4 border-b border-border pb-3">
        <div
          role="tablist"
          aria-label="Review views"
          className="inline-flex p-1 rounded-[12px] bg-muted/60 border border-border"
        >
          <button
            type="button"
            role="tab"
            aria-selected={view === 'to-review'}
            onClick={() => handleSelectView('to-review')}
            className={cn(
              'h-8 px-4 rounded-[8px] text-xs font-semibold inline-flex items-center gap-2 transition-all cursor-pointer',
              view === 'to-review'
                ? 'bg-surface text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <span>To review</span>
            {toReviewList.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-brand text-white tabular-nums">
                {toReviewList.length}
              </span>
            )}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={view === 'mine'}
            onClick={() => handleSelectView('mine')}
            className={cn(
              'h-8 px-4 rounded-[8px] text-xs font-semibold inline-flex items-center gap-2 transition-all cursor-pointer',
              view === 'mine'
                ? 'bg-surface text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <span>My reviews</span>
            {myReviewsList.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-muted-foreground/20 text-foreground tabular-nums">
                {myReviewsList.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-20 text-center text-xs text-muted-foreground">
          Loading reviews…
        </div>
      ) : view === 'to-review' ? (
        toReviewList.length === 0 ? (
          <EmptyState
            icon={<CheckCircle2 className="size-7" />}
            title="All caught up on reviews"
            description="You have no returned equipment pending review. Completed rentals with returned gear will appear here."
            actionLabel="Browse equipment"
            actionHref="/equipment"
          />
        ) : (
          <div className="space-y-4">
            {toReviewList.map((item) => (
              <ReviewToWriteItem
                key={`${item.booking_id}-${item.equipment_id}`}
                item={item}
                onReviewSubmitted={loadData}
                onOpenBooking={handleOpenBooking}
              />
            ))}
          </div>
        )
      ) : myReviewsList.length === 0 ? (
        <EmptyState
          icon={<Star className="size-7" />}
          title="No reviews published yet"
          description="Reviews you write for returned rental gear will be saved and displayed here."
          actionLabel="Check items to review"
          onAction={() => handleSelectView('to-review')}
        />
      ) : (
        <div className="space-y-4">
          {myReviewsList.map((review) => (
            <MyReviewCard
              key={review.review_id}
              review={review}
              onOpenBooking={handleOpenBooking}
            />
          ))}
        </div>
      )}

      {/* Booking Detail Sheet if booking param set */}
      <BookingDetailSheet
        bookingId={bookingParam}
        onClose={() => updateQuery({ booking: null })}
        onBookingUpdated={loadData}
      />
    </div>
  )
}
