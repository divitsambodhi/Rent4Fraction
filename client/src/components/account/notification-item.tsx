import {
  AlertTriangle,
  CalendarCheck,
  CheckCircle2,
  Clock,
  CreditCard,
  MessageSquare,
  PackageCheck,
  RotateCcw,
  ShieldAlert,
  Star,
  Truck,
  Wallet,
} from 'lucide-react'
import { AppLink } from '@/components/shared/app-link'
import type { AppNotification, NotificationType } from '@/types/account'
import { format, isToday, isYesterday, parseISO } from 'date-fns'
import { cn } from '@/lib/utils'

interface NotificationItemProps {
  notification: AppNotification
  onRead: (id: string) => void
}

const TYPE_CONFIG: Record<
  NotificationType,
  {
    icon: typeof CheckCircle2
    bg: string
    color: string
    border: string
  }
> = {
  booking_confirmed: {
    icon: CalendarCheck,
    bg: 'bg-brand/10',
    color: 'text-brand',
    border: 'border-brand/20',
  },
  order_accepted: {
    icon: CheckCircle2,
    bg: 'bg-success/15',
    color: 'text-success',
    border: 'border-success/30',
  },
  order_rejected: {
    icon: AlertTriangle,
    bg: 'bg-danger/10',
    color: 'text-danger',
    border: 'border-danger/25',
  },
  order_dispatched: {
    icon: Truck,
    bg: 'bg-info/15',
    color: 'text-info',
    border: 'border-info/30',
  },
  delivered: {
    icon: PackageCheck,
    bg: 'bg-success/15',
    color: 'text-success',
    border: 'border-success/30',
  },
  return_scheduled: {
    icon: Clock,
    bg: 'bg-warning/15',
    color: 'text-warning',
    border: 'border-warning/30',
  },
  return_inspected: {
    icon: RotateCcw,
    bg: 'bg-muted',
    color: 'text-muted-foreground',
    border: 'border-border',
  },
  damage_report_filed: {
    icon: ShieldAlert,
    bg: 'bg-danger/15',
    color: 'text-danger',
    border: 'border-danger/30',
  },
  payment_received: {
    icon: CreditCard,
    bg: 'bg-success/15',
    color: 'text-success',
    border: 'border-success/30',
  },
  refund_processed: {
    icon: Wallet,
    bg: 'bg-info/15',
    color: 'text-info',
    border: 'border-info/30',
  },
  review_reminder: {
    icon: Star,
    bg: 'bg-warning/15',
    color: 'text-warning',
    border: 'border-warning/30',
  },
  message_received: {
    icon: MessageSquare,
    bg: 'bg-brand/10',
    color: 'text-brand',
    border: 'border-brand/20',
  },
  dispute_resolved: {
    icon: CheckCircle2,
    bg: 'bg-success/15',
    color: 'text-success',
    border: 'border-success/30',
  },
  payout_processed: {
    icon: Clock,
    bg: 'bg-warning/15',
    color: 'text-warning',
    border: 'border-warning/30',
  },
  payout_paid: {
    icon: Wallet,
    bg: 'bg-success/15',
    color: 'text-success',
    border: 'border-success/30',
  },
  vendor_approved: {
    icon: CheckCircle2,
    bg: 'bg-success/15',
    color: 'text-success',
    border: 'border-success/30',
  },
  new_order: {
    icon: PackageCheck,
    bg: 'bg-brand/10',
    color: 'text-brand',
    border: 'border-brand/20',
  },
}

function formatRelativeTime(dateStr: string): string {
  try {
    const d = parseISO(dateStr)
    if (isToday(d)) return format(d, 'hh:mm a')
    if (isYesterday(d)) return 'Yesterday'
    return format(d, 'dd MMM')
  } catch {
    return dateStr
  }
}

export function NotificationItem({ notification, onRead }: NotificationItemProps) {
  const config = TYPE_CONFIG[notification.type] || TYPE_CONFIG.message_received
  const Icon = config.icon

  // Build target link based on notification target
  let targetUrl = '/account'
  if (notification.target.tab === 'bookings') {
    targetUrl = notification.target.booking_id
      ? `/account?tab=bookings&booking=${notification.target.booking_id}`
      : '/account?tab=bookings'
  } else if (notification.target.tab === 'inbox') {
    targetUrl = notification.target.thread_id
      ? `/account?tab=inbox&thread=${notification.target.thread_id}`
      : '/account?tab=inbox'
  } else if (notification.target.tab === 'reviews') {
    targetUrl = '/account?tab=reviews'
  } else if (notification.target.tab) {
    targetUrl = `/account?tab=${notification.target.tab}`
  }

  const handleClick = () => {
    if (!notification.read) {
      onRead(notification.id)
    }
  }

  return (
    <AppLink
      to={targetUrl}
      onClick={handleClick}
      className={cn(
        'group flex items-start gap-3.5 p-4 min-h-[72px] rounded-[14px] border transition-all cursor-pointer select-none',
        notification.read
          ? 'bg-surface border-border hover:bg-muted/40'
          : 'bg-brand/5 border-brand/20 hover:bg-brand/10 shadow-xs'
      )}
    >
      {/* 40px Icon Circle with Semantic Tint */}
      <div
        className={cn(
          'size-10 rounded-full flex items-center justify-center shrink-0 border mt-0.5',
          config.bg,
          config.color,
          config.border
        )}
      >
        <Icon className="size-5 stroke-[1.75]" />
      </div>

      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              'text-xs truncate',
              notification.read
                ? 'font-medium text-foreground'
                : 'font-bold text-foreground text-brand-dark'
            )}
          >
            {notification.title}
          </span>
          <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
            {formatRelativeTime(notification.created_at)}
          </span>
        </div>

        {/* 2-Line message */}
        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {notification.message}
        </p>
      </div>

      {/* Unread Accent Dot */}
      {!notification.read && (
        <span
          className="size-2 rounded-full bg-brand shrink-0 self-center"
          aria-label="Unread notification"
        />
      )}
    </AppLink>
  )
}
