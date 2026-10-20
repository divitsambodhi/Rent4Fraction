import {
  CalendarDays,
  CreditCard,
  Heart,
  LogOut,
  MapPin,
  MessageSquare,
  Settings,
  Star,
} from 'lucide-react'
import { UserSummaryCard } from './user-summary-card'
import { useAuth } from '@/providers/auth-provider'
import { useWishlist } from '@/providers/wishlist-provider'
import { useAppNavigate, useAppSearchParams } from '@/components/shared/app-link'
import type { AccountTabKey, AccountBadges } from '@/types/account'
import { cn } from '@/lib/utils'

interface AccountSidebarProps {
  activeTab: AccountTabKey
  badges?: AccountBadges | null
}

interface NavItemDef {
  key: AccountTabKey
  label: string
  icon: typeof CalendarDays
  badgeCount?: (badges: AccountBadges | null, wishlistCount: number) => number | null
}

const NAV_ITEMS: NavItemDef[] = [
  {
    key: 'bookings',
    label: 'Bookings',
    icon: CalendarDays,
    badgeCount: (b) => (b && b.active_bookings_count > 0 ? b.active_bookings_count : null),
  },
  {
    key: 'inbox',
    label: 'Inbox',
    icon: MessageSquare,
    badgeCount: (b) => (b && b.unread_inbox_count > 0 ? b.unread_inbox_count : null),
  },
  {
    key: 'wishlist',
    label: 'Wishlist',
    icon: Heart,
    badgeCount: (_, wCount) => (wCount > 0 ? wCount : null),
  },
  {
    key: 'addresses',
    label: 'Addresses',
    icon: MapPin,
  },
  {
    key: 'profile',
    label: 'Profile & security',
    icon: Settings,
  },
  {
    key: 'payments',
    label: 'Payments',
    icon: CreditCard,
  },
  {
    key: 'reviews',
    label: 'My reviews',
    icon: Star,
  },
]

export function AccountSidebar({ activeTab, badges }: AccountSidebarProps) {
  const { logout } = useAuth()
  const { wishlist } = useWishlist()
  const navigate = useAppNavigate()
  const [, setSearchParams] = useAppSearchParams()

  const handleTabClick = (tab: AccountTabKey) => {
    // Tab changes push history per prompt spec
    setSearchParams({ tab }, { replace: false })
  }

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <aside className="w-[228px] shrink-0 sticky top-[80px] self-start space-y-4 rounded-[16px] bg-surface p-4 border border-border shadow-none">
      <UserSummaryCard />

      <nav className="space-y-1" aria-label="Account navigation">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.key
          const count = item.badgeCount
            ? item.badgeCount(badges || null, wishlist.length)
            : null

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => handleTabClick(item.key)}
              className={cn(
                'group relative flex items-center justify-between w-full h-[40px] px-3 rounded-[8px] text-xs font-medium transition-colors cursor-pointer select-none text-left',
                isActive
                  ? 'text-foreground font-semibold bg-surface/80'
                  : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0 relative">
                <Icon
                  className={cn(
                    'size-4 stroke-[1.75] shrink-0 transition-colors',
                    isActive ? 'text-brand' : 'text-muted-foreground group-hover:text-foreground'
                  )}
                />
                <span className="truncate relative">
                  {item.label}
                  {isActive && (
                    <span
                      className="absolute -bottom-1 left-0 right-0 h-[2px] bg-brand rounded-full"
                      aria-hidden="true"
                    />
                  )}
                </span>
              </div>

              {count !== null && (
                <span
                  className={cn(
                    'inline-flex items-center justify-center px-1.5 h-4.5 min-w-[18px] rounded-full text-[10px] font-semibold tabular-nums',
                    isActive
                      ? 'bg-brand/15 text-brand'
                      : 'bg-muted text-muted-foreground group-hover:bg-muted-foreground/20'
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      <div className="h-px bg-border/60 my-2" />

      <button
        type="button"
        onClick={handleLogout}
        className="flex items-center gap-2.5 w-full h-[36px] px-3 rounded-[8px] text-xs font-medium text-danger/90 hover:bg-danger/10 transition-colors cursor-pointer text-left"
      >
        <LogOut className="size-4 stroke-[1.75] shrink-0" />
        <span>Log out</span>
      </button>
    </aside>
  )
}
