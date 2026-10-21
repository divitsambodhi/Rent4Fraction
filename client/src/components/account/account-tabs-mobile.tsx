import { Icon, type IconName } from '@/components/ui/icon'
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
  iconName: IconName
  count?: (b: AccountBadges | null, wCount: number) => number | null
}[] = [
  {
    key: 'bookings',
    label: 'Bookings',
    iconName: 'calendar',
    count: (b) => (b && b.active_bookings_count > 0 ? b.active_bookings_count : null),
  },
  {
    key: 'inbox',
    label: 'Inbox',
    iconName: 'message',
    count: (b) => (b && b.unread_inbox_count > 0 ? b.unread_inbox_count : null),
  },
  {
    key: 'wishlist',
    label: 'Wishlist',
    iconName: 'heart',
    count: (_, w) => (w > 0 ? w : null),
  },
  {
    key: 'addresses',
    label: 'Addresses',
    iconName: 'map-pin',
  },
  {
    key: 'profile',
    label: 'Profile',
    iconName: 'user',
  },
  {
    key: 'payments',
    label: 'Payments',
    iconName: 'credit-card',
  },
  {
    key: 'reviews',
    label: 'Reviews',
    iconName: 'star',
  },
]

export function AccountTabsMobile({ activeTab, badges }: AccountTabsMobileProps) {
  const { wishlist } = useWishlist()
  const [, setSearchParams] = useAppSearchParams()

  const handleTabClick = (tab: AccountTabKey) => {
    setSearchParams({ tab }, { replace: false })
  }

  return (
    <div className="lg:hidden sticky top-14 z-sticky-header -mx-4 px-4 py-2.5 bg-surface border-b border-border shadow-xs">
      <div
        role="tablist"
        aria-label="Account sections"
        className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory"
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key
          const badge = tab.count ? tab.count(badges || null, wishlist.length) : null

          return (
            <button
              key={tab.key}
              role="tab"
              aria-selected={isActive}
              onClick={() => handleTabClick(tab.key)}
              className={cn(
                'snap-start shrink-0 inline-flex items-center gap-1.5 min-h-[44px] h-11 px-4 rounded-full text-xs font-semibold transition-colors cursor-pointer select-none',
                isActive
                  ? 'bg-brand text-white shadow-xs'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon name={tab.iconName} size={15} />
              <span>{tab.label}</span>
              {badge !== null && (
                <span
                  className={cn(
                    'inline-flex items-center justify-center px-1.5 min-w-[18px] h-4.5 rounded-full text-[10px] font-bold tabular-nums',
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
