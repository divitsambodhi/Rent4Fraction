import { Building2, Inbox as InboxIcon, LayoutDashboard, Star, Wallet } from 'lucide-react'
import { AppLink } from '@/components/shared/app-link'
import type { VendorDashboardTab } from '@/types/vendor'
import { cn } from '@/lib/utils'

interface VendorTabsProps {
  currentTab: VendorDashboardTab
  reviewsBadge?: number
  inboxBadge?: number
}

interface TabConfig {
  id: VendorDashboardTab
  label: string
  icon: React.ComponentType<{ className?: string }>
  badge?: number
}

export function VendorTabs({
  currentTab,
  reviewsBadge,
  inboxBadge,
}: VendorTabsProps) {
  const tabs: TabConfig[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'payouts', label: 'Payouts', icon: Wallet },
    { id: 'reviews', label: 'Reviews', icon: Star, badge: reviewsBadge },
    { id: 'inbox', label: 'Inbox', icon: InboxIcon, badge: inboxBadge },
    { id: 'profile', label: 'Business profile', icon: Building2 },
  ]

  return (
    <div className="border-b border-border mb-6">
      <nav aria-label="Vendor portal tabs" className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = currentTab === tab.id

          return (
            <AppLink
              key={tab.id}
              to={`/vendor?tab=${tab.id}`}
              className={cn(
                'flex items-center gap-2 px-3 sm:px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                isActive
                  ? 'border-brand text-brand font-semibold'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className="size-4 shrink-0" />
              <span>{tab.label}</span>
              {typeof tab.badge === 'number' && tab.badge > 0 && (
                <span className="text-[11px] font-bold px-1.5 py-0.2 rounded-full bg-brand/10 text-brand tabular-nums">
                  {tab.badge}
                </span>
              )}
            </AppLink>
          )
        })}
      </nav>
    </div>
  )
}
