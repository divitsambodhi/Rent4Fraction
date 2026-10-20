import { useEffect, useState } from 'react'
import { SuccessPanel } from './success-panel'
import { FailedPanel } from './failed-panel'
import { EmptyState } from '@/components/shared/empty-state'
import { getBookingById } from '@/lib/api/account'
import { AlertCircle } from 'lucide-react'
import type { BookingDetail } from '@/types/account'

interface ResultStepProps {
  bookingId?: string
  resultStatus?: 'success' | 'failed'
  onRetryPayment: () => void
}

export function ResultStep({
  bookingId,
  resultStatus = 'success',
  onRetryPayment,
}: ResultStepProps) {
  const [booking, setBooking] = useState<BookingDetail | null>(null)
  const [loading, setLoading] = useState(Boolean(bookingId))

  useEffect(() => {
    if (!bookingId) {
      setLoading(false)
      return
    }

    async function fetchBooking() {
      try {
        const found = await getBookingById(bookingId!)
        setBooking(found)
      } catch (err) {
        console.error('Failed to load booking result', err)
      } finally {
        setLoading(false)
      }
    }

    fetchBooking()
  }, [bookingId])

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center space-y-3">
        <div className="size-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
        <span className="text-xs text-muted-foreground font-medium">Retrieving booking confirmation...</span>
      </div>
    )
  }

  // If no booking ID or invalid
  if (!bookingId && !booking) {
    return (
      <EmptyState
        icon={<AlertCircle className="size-7 text-brand" />}
        title="No booking found"
        description="We couldn't locate this booking reference in your account. You can view all your active reservations in your customer dashboard."
        actionLabel="Go to My bookings"
        actionHref="/account?tab=bookings"
        className="max-w-md mx-auto my-12"
      />
    )
  }

  if (resultStatus === 'failed') {
    return (
      <FailedPanel
        booking={booking}
        bookingId={bookingId}
        onRetryPayment={onRetryPayment}
      />
    )
  }

  // Success path
  if (booking) {
    return <SuccessPanel booking={booking} />
  }

  // Fallback if booking object not found yet but bookingId exists
  return (
    <EmptyState
      icon={<AlertCircle className="size-7 text-brand" />}
      title="Booking confirmed"
      description={`Booking ${bookingId} has been submitted. Check your account dashboard to view status updates.`}
      actionLabel="View My bookings"
      actionHref="/account?tab=bookings"
      className="max-w-md mx-auto my-12"
    />
  )
}
