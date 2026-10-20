import { AlertCircle, RefreshCw, ArrowRight, HelpCircle } from 'lucide-react'
import { AppLink } from '@/components/shared/app-link'
import { Button } from '@/components/ui/button'
import type { BookingDetail } from '@/types/account'

interface FailedPanelProps {
  booking?: BookingDetail | null
  bookingId?: string
  onRetryPayment: () => void
}

export function FailedPanel({
  booking,
  bookingId,
  onRetryPayment,
}: FailedPanelProps) {
  const bId = booking?.booking_id || bookingId || 'BK-PENDING'

  return (
    <div className="max-w-xl mx-auto space-y-6 py-6">
      <div className="p-6 sm:p-8 rounded-[20px] bg-surface border border-danger/30 text-center space-y-4 shadow-sm">
        {/* Error Icon */}
        <div className="size-16 rounded-full bg-danger/10 border border-danger/25 text-danger flex items-center justify-center mx-auto shadow-xs">
          <AlertCircle className="size-8 stroke-[2.2]" />
        </div>

        <div className="space-y-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block font-mono">
            BOOKING {bId}
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-foreground">
            Payment didn’t go through
          </h1>
          <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
            Your booking <strong className="font-semibold text-foreground font-mono">{bId}</strong> is saved
            and waiting for payment. You have not been charged.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            type="button"
            onClick={onRetryPayment}
            className="w-full sm:w-auto h-11 px-6 rounded-[12px] font-semibold gap-2 shadow-sm"
          >
            <RefreshCw className="size-4" />
            <span>Try payment again</span>
          </Button>

          <AppLink to={`/account?tab=bookings&booking=${bId}`} className="w-full sm:w-auto">
            <Button variant="outline" className="w-full sm:w-auto h-11 px-5 rounded-[12px] text-xs font-semibold gap-1.5">
              <span>View saved booking</span>
              <ArrowRight className="size-4" />
            </Button>
          </AppLink>

          <AppLink to="/help" className="w-full sm:w-auto">
            <Button variant="ghost" className="w-full sm:w-auto h-11 px-4 rounded-[12px] text-xs font-semibold gap-1.5 text-muted-foreground hover:text-foreground">
              <HelpCircle className="size-4" />
              <span>Contact support</span>
            </Button>
          </AppLink>
        </div>
      </div>
    </div>
  )
}
