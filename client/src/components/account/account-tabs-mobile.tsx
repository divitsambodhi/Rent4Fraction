import {
  CalendarDays,
  CreditCard,
  Heart,
  MapPin,
  MessageSquare,
  Settings,
  Star,
} from 'lucide-react'
import { useWishlist } from '@/providers/wishlist-provider'
import { useAppSearchParams } from '@/components/shared/app-link'
import type { AccountTabKey, AccountBadges } from '@/types/account'
import { cn } from '@/lib/utils'

interface AccountTabsMobileProps {
  activeTab: AccountTabKey
  badges?: AccountBadges | null
}

const TABS: {
  key: AccountTabKey
  label: string
  icon: typeof CalendarDays
  count?: (b: AccountBadges | null, wCount: number) => number | null
}[] = [
  {
    key: 'bookings',
    label: 'Bookings',
    icon: CalendarDays,
    count: (b) => (b && b.active_bookings_count > 0 ? b.active_bookings_count : null),
  },
  {
    key: 'inbox',
    label: 'Inbox',
    icon: MessageSquare,
    count: (b) => (b && b.unread_inbox_count > 0 ? b.unread_inbox_count : null),
  },
  {
    key: 'wishlist',
    label: 'Wishlist',
    icon: Heart,
    count: (_, w) => (w > 0 ? w : null),
  },
  {
    key: 'addresses',
    label: 'Addresses',
    icon: MapPin,
  },
  {
    key: 'profile',
    label: 'Profile',
    icon: Settings,
  },
  {
    key: 'payments',
    label: 'Payments',
    icon: CreditCard,
  },
  {
    key: 'reviews',
    label: 'Reviews',
    icon: Star,
  },
]

export function AccountTabsMobile({ activeTab, badges }: AccountTabsMobileProps) {
  const { wishlist } = useWishlist()
  const [, setSearchParams] = useAppSearchParams()

  const handleTabClick = (tab: AccountTabKey) => {
    setSearchParams({ tab }, { replace: false })
  }

  return (
    <div className="lg:hidden sticky top-16 z-30 -mx-4 px-4 py-2.5 bg-surface/95 backdrop-blur-md border-b border-border shadow-xs">
      <div
        role="tablist"
        aria-label="Account sections"
        className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory"
      >
        {TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.key
          const badge = tab.count ? tab.count(badges || null, wishlist.length) : null

          return (
            <button
              key={tab.key}
              role="tab"
              aria-selected={isActive}
              onClick={() => handleTabClick(tab.key)}
              className={cn(
                'snap-start shrink-0 inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-xs font-semibold transition-all cursor-pointer select-none',
                isActive
                  ? 'bg-brand text-white shadow-xs'
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="size-3.5 stroke-[1.75]" />
              <span>{tab.label}</span>
              {badge !== null && (
                <span
                  className={cn(
                    'inline-flex items-center justify-center px-1.5 min-w-[16px] h-4 rounded-full text-[10px] font-bold tabular-nums',
                    isActive ? 'bg-white/20 text-white' : 'bg-muted-foreground/15 text-foreground'
                  )}
                >
                  {badge}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
