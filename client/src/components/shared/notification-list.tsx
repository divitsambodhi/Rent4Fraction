import { useEffect, useState } from 'react'
import { Bell, CheckCheck, Clock } from 'lucide-react'
import { AppLink, useAppNavigate } from './app-link'
import type { NotificationItem, AppNotification } from '@/types'
import { cn } from '@/lib/utils'
import { useAuth } from '@/providers/auth-provider'
import { getNotifications, markAllNotificationsRead, markNotificationRead } from '@/lib/api'

interface NotificationListProps {
  initialNotifications?: NotificationItem[]
  onClose?: () => void
}

export function NotificationList({
  initialNotifications = [],
  onClose,
}: NotificationListProps) {
  const { role } = useAuth()
  const navigate = useAppNavigate()
  const [customerNotifs, setCustomerNotifs] = useState<AppNotification[]>([])
  const [fallbackNotifs, setFallbackNotifs] = useState<NotificationItem[]>(initialNotifications)

  useEffect(() => {
    if (role !== 'customer') return

    let active = true
    const load = async () => {
      try {
        const data = await getNotifications()
        if (active) setCustomerNotifs(data)
      } catch {
        // ignore
      }
    }

    load()
    window.addEventListener('r4f-account-store-updated', load)
    return () => {
      active = false
      window.removeEventListener('r4f-account-store-updated', load)
    }
  }, [role])

  if (role === 'customer') {
    const unreadCount = customerNotifs.filter((n) => !n.read).length

    const handleMarkAll = async () => {
      await markAllNotificationsRead()
      setCustomerNotifs((prev) => prev.map((n) => ({ ...n, read: true })))
    }

    const handleClickItem = async (item: AppNotification) => {
      if (!item.read) {
        await markNotificationRead(item.id)
      }
      onClose?.()
      let url = '/account'
      if (item.target?.tab === 'bookings') {
        url = item.target.booking_id
          ? `/account?tab=bookings&booking=${item.target.booking_id}`
          : '/account?tab=bookings'
      } else if (item.target?.tab === 'inbox') {
        url = item.target.thread_id
          ? `/account?tab=inbox&thread=${item.target.thread_id}`
          : '/account?tab=inbox'
      } else if (item.target?.tab) {
        url = `/account?tab=${item.target.tab}`
      }
      navigate(url)
    }

    return (
      <div className="w-80 sm:w-96 flex flex-col max-h-[460px]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Bell className="size-4 text-brand" />
            <span className="font-semibold text-sm text-foreground">Notifications</span>
            {unreadCount > 0 && (
              <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-brand text-white tabular-nums">
                {unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAll}
              className="text-xs text-muted-foreground hover:text-brand flex items-center gap-1 transition-colors cursor-pointer"
            >
              <CheckCheck className="size-3.5" />
              <span>Mark all read</span>
            </button>
          )}
        </div>

        {/* List */}
        <div className="divide-y divide-border overflow-y-auto py-1">
          {customerNotifs.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              You&apos;re all caught up! No notifications.
            </div>
          ) : (
            customerNotifs.slice(0, 8).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleClickItem(item)}
                className={cn(
                  'w-full text-left p-3 hover:bg-muted/50 transition-colors flex gap-2.5 items-start cursor-pointer focus:outline-none focus:bg-muted/60',
                  !item.read && 'bg-brand/4 dark:bg-brand/10',
                )}
              >
                <span
                  className={cn(
                    'size-2 rounded-full mt-1.5 shrink-0',
                    item.read ? 'bg-transparent' : 'bg-brand',
                  )}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <p
                      className={cn(
                        'text-xs truncate',
                        item.read ? 'font-medium text-foreground' : 'font-bold text-foreground',
                      )}
                    >
                      {item.title}
                    </p>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1 shrink-0">
                      <Clock className="size-3" />
                      {new Date(item.created_at).toLocaleDateString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                    {item.message}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="pt-2.5 border-t border-border text-center">
          <AppLink
            to="/account?tab=inbox&view=notifications"
            onClick={onClose}
            className="text-xs font-semibold text-brand hover:text-brand-hover transition-colors"
          >
            View all notifications →
          </AppLink>
        </div>
      </div>
    )
  }

  // Fallback for non-customer roles
  const markAllFallbackRead = () => {
    setFallbackNotifs((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  const unreadFallbackCount = fallbackNotifs.filter((n) => !n.read).length

  return (
    <div className="w-80 sm:w-96 flex flex-col max-h-[460px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Bell className="size-4 text-brand" />
          <span className="font-semibold text-sm text-foreground">Notifications</span>
          {unreadFallbackCount > 0 && (
            <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-brand text-white">
              {unreadFallbackCount}
            </span>
          )}
        </div>
        {unreadFallbackCount > 0 && (
          <button
            type="button"
            onClick={markAllFallbackRead}
            className="text-xs text-muted-foreground hover:text-brand flex items-center gap-1 transition-colors"
          >
            <CheckCheck className="size-3.5" />
            <span>Mark all read</span>
          </button>
        )}
      </div>

      {/* List */}
      <div className="divide-y divide-border overflow-y-auto py-1">
        {fallbackNotifs.length === 0 ? (
          <div className="p-6 text-center text-xs text-muted-foreground">
            No notifications at this time
          </div>
        ) : (
          fallbackNotifs.map((item) => (
            <div
              key={item.id}
              className={cn(
                'p-3 hover:bg-muted/50 transition-colors flex gap-2.5 items-start',
                !item.read && 'bg-brand/4 dark:bg-brand/10',
              )}
            >
              <span
                className={cn(
                  'size-2 rounded-full mt-1.5 shrink-0',
                  item.read ? 'bg-transparent' : 'bg-brand',
                )}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-xs font-semibold text-foreground truncate">
                    {item.title}
                  </p>
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1 shrink-0">
                    <Clock className="size-3" />
                    {item.time}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                  {item.message}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="pt-2.5 border-t border-border text-center">
        <AppLink
          to="/vendor"
          onClick={onClose}
          className="text-xs font-semibold text-brand hover:text-brand-hover transition-colors"
        >
          View all notifications →
        </AppLink>
      </div>
    </div>
  )
}
