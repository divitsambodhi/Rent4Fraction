import { useCallback, useEffect, useState } from 'react'
import { NotificationItem } from './notification-item'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/empty-state'
import { CheckCheck, BellRing } from 'lucide-react'
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/lib/api'
import type { AppNotification } from '@/types/account'
import { isToday, isYesterday, parseISO } from 'date-fns'
import { cn } from '@/lib/utils'

interface NotificationsPaneProps {
  filter: 'all' | 'unread'
  onFilterChange: (f: 'all' | 'unread') => void
  onUpdateBadge?: () => void
}

export function NotificationsPane({
  filter,
  onFilterChange,
  onUpdateBadge,
}: NotificationsPaneProps) {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [displayCount, setDisplayCount] = useState(10)

  const loadNotifs = useCallback(() => {
    getNotifications(filter).then((data) => {
      setNotifications(data)
      setLoading(false)
    })
  }, [filter])

  useEffect(() => {
    loadNotifs()
  }, [loadNotifs])

  const handleMarkOne = async (id: string) => {
    await markNotificationRead(id)
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )
    onUpdateBadge?.()
  }

  const handleMarkAll = async () => {
    await markAllNotificationsRead()
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    onUpdateBadge?.()
  }

  const unreadCount = notifications.filter((n) => !n.read).length
  const pagedList = notifications.slice(0, displayCount)
  const hasMore = displayCount < notifications.length

  // Group by Today, Yesterday, Earlier
  const todayList: AppNotification[] = []
  const yesterdayList: AppNotification[] = []
  const earlierList: AppNotification[] = []

  pagedList.forEach((n) => {
    try {
      const d = parseISO(n.created_at)
      if (isToday(d)) {
        todayList.push(n)
      } else if (isYesterday(d)) {
        yesterdayList.push(n)
      } else {
        earlierList.push(n)
      }
    } catch {
      earlierList.push(n)
    }
  })

  const groups = [
    { title: 'Today', items: todayList },
    { title: 'Yesterday', items: yesterdayList },
    { title: 'Earlier', items: earlierList },
  ].filter((g) => g.items.length > 0)

  return (
    <div className="space-y-4">
      {/* Controls: All / Unread pills and Mark All as Read */}
      <div className="flex items-center justify-between gap-3 pb-2 border-b border-border">
        <div className="flex items-center gap-1.5" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={filter === 'all'}
            onClick={() => onFilterChange('all')}
            className={cn(
              'h-8 px-3 rounded-full text-xs font-semibold transition-colors cursor-pointer',
              filter === 'all'
                ? 'bg-brand text-white'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            All
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filter === 'unread'}
            onClick={() => onFilterChange('unread')}
            className={cn(
              'h-8 px-3 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer',
              filter === 'unread'
                ? 'bg-brand text-white'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            <span>Unread</span>
            {unreadCount > 0 && (
              <span
                className={cn(
                  'px-1.5 py-0.2 rounded-full text-[10px] font-bold tabular-nums',
                  filter === 'unread'
                    ? 'bg-white/20 text-white'
                    : 'bg-brand text-white'
                )}
              >
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        {unreadCount > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleMarkAll}
            className="h-8 text-xs text-muted-foreground hover:text-brand gap-1.5"
          >
            <CheckCheck className="size-3.5" />
            <span>Mark all as read</span>
          </Button>
        )}
      </div>

      {/* Grouped Notifications */}
      {loading ? (
        <div className="py-20 text-center text-xs text-muted-foreground">
          Loading updates...
        </div>
      ) : groups.length === 0 ? (
        <EmptyState
          icon={<BellRing className="size-7" />}
          title="You're all caught up"
          description={
            filter === 'unread'
              ? 'No unread notifications at this time.'
              : 'Updates regarding your bookings, deliveries, and vendor messages will appear here.'
          }
        />
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <div key={g.title} className="space-y-2.5">
              <div className="sticky top-28 sm:top-24 z-10 py-1 bg-background/90 backdrop-blur-xs text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                {g.title}
              </div>
              <div className="space-y-2">
                {g.items.map((n) => (
                  <NotificationItem
                    key={n.id}
                    notification={n}
                    onRead={handleMarkOne}
                  />
                ))}
              </div>
            </div>
          ))}

          {/* Load More Button (10 at a time) */}
          {hasMore && (
            <div className="pt-2 text-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDisplayCount((prev) => prev + 10)}
                className="h-9 px-6 text-xs font-semibold"
              >
                Load more notifications
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
