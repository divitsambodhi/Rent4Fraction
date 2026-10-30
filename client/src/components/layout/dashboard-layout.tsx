import { useEffect, useState } from 'react'
import {
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Inbox as InboxIcon,
  LayoutDashboard,
  Lock,
  LogOut,
  Menu,
  MessageSquare,
  Moon,
  Package,
  Scale,
  ShoppingBag,
  Star,
  Sun,
  User as UserIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { AppLink, useAppPathname, useAppSearchParams } from '@/components/shared/app-link'
import { useAuth } from '@/providers/auth-provider'
import { useTheme } from '@/providers/theme-provider'
import { getVendorOverview, getVendorReviews } from '@/lib/api/vendor'
import { getNotifications, getConversations } from '@/lib/api/account'
import { cn } from '@/lib/utils'

export interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
  tabKey?: string
  requiresApproval?: boolean
}

export interface NavSection {
  title: string
  items: NavItem[]
}

export const vendorNavSections: NavSection[] = [
  {
    title: 'Manage',
    items: [
      { title: 'Overview', href: '/vendor?tab=overview', tabKey: 'overview', icon: LayoutDashboard },
      { title: 'Orders & returns', href: '/vendor/orders', icon: ShoppingBag, requiresApproval: true },
      { title: 'Inventory', href: '/vendor/inventory', icon: Package, requiresApproval: true },
    ],
  },
  {
    title: 'Feedback',
    items: [
      { title: 'Reviews', href: '/vendor?tab=reviews', tabKey: 'reviews', icon: Star, requiresApproval: true },
    ],
  },
  {
    title: 'Account',
    items: [
      { title: 'Inbox', href: '/vendor?tab=inbox', tabKey: 'inbox', icon: InboxIcon, requiresApproval: true },
      { title: 'Business profile', href: '/vendor?tab=profile', tabKey: 'profile', icon: Building2, requiresApproval: false },
    ],
  },
]

export const vendorNav: NavItem[] = vendorNavSections.flatMap((s) => s.items)

export const adminNav: NavItem[] = [
  { title: 'Overview', href: '/admin?section=overview', tabKey: 'overview', icon: LayoutDashboard },
  { title: 'Vendors', href: '/admin?section=vendors', tabKey: 'vendors', icon: Building2, badge: '2' },
  { title: 'Equipment', href: '/admin?section=equipment', tabKey: 'equipment', icon: Package },
  { title: 'Disputes', href: '/admin?section=disputes', tabKey: 'disputes', icon: Scale, badge: '2' },
  { title: 'Categories', href: '/admin?section=categories', tabKey: 'categories', icon: Package },
  { title: 'Coupons', href: '/admin?section=coupons', tabKey: 'coupons', icon: ShoppingBag },
  { title: 'Users', href: '/admin?section=users', tabKey: 'users', icon: UserIcon },
  { title: 'Bookings', href: '/admin?section=bookings', tabKey: 'bookings', icon: CalendarDays },
]

interface DashboardLayoutProps {
  type: 'vendor' | 'admin'
  children: React.ReactNode
  title?: string
  subtitle?: string
}

export function DashboardLayout({
  type,
  children,
  title: customTitle,
  subtitle,
}: DashboardLayoutProps) {
  const { user, logout } = useAuth()
  const { resolvedTheme, toggleTheme } = useTheme()
  const pathname = useAppPathname()
  const [searchParams] = useAppSearchParams()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [vendorBadges, setVendorBadges] = useState<{ orders?: number; reviews?: number; inbox?: number }>({})

  useEffect(() => {
    if (type !== 'vendor' || !user) return

    let isMounted = true
    const loadBadges = async () => {
      try {
        const [ov, revs, notifs, convs] = await Promise.all([
          getVendorOverview().catch(() => null),
          getVendorReviews().catch(() => null),
          getNotifications('unread').catch(() => []),
          getConversations().catch(() => []),
        ])

        if (!isMounted) return

        const pendingOrders = ov?.attention?.new_orders_waiting ?? 0
        const reviewsNeedingReply = (revs as any)?.summary?.needs_reply_count ?? 0
        const unreadInbox = (Array.isArray(notifs) ? notifs.length : 0) +
          (Array.isArray(convs) ? convs.reduce((acc: number, c: any) => acc + (c.unread_count || 0), 0) : 0)

        setVendorBadges({
          orders: pendingOrders > 0 ? pendingOrders : undefined,
          reviews: reviewsNeedingReply > 0 ? reviewsNeedingReply : undefined,
          inbox: unreadInbox > 0 ? unreadInbox : undefined,
        })
      } catch {
        // Silently preserve empty badges on error
      }
    }

    loadBadges()
    return () => {
      isMounted = false
    }
  }, [type, user, pathname, searchParams])

  const tab = searchParams.get('tab') || 'overview'
  const section = searchParams.get('section') || 'overview'
  const simulate = searchParams.get('simulate')
  const approvalStatus = (simulate === 'rejected' || simulate === 'suspended')
    ? simulate
    : (user?.vendor?.approval_status || 'approved')
  const isApproved = approvalStatus === 'approved'
  const isPending = approvalStatus === 'pending'

  const title = customTitle || (type === 'vendor' ? 'Vendor Portal' : 'Admin Console')

  const isItemActive = (item: NavItem) => {
    if (type === 'vendor') {
      if (item.href.startsWith('/vendor?tab=')) {
        const itemTab = item.href.split('tab=')[1]
        return pathname === '/vendor' && tab === itemTab
      }
      return pathname === item.href
    }
    if (type === 'admin') {
      if (item.href.includes('section=')) {
        const itemSection = item.href.split('section=')[1]
        return pathname === '/admin' && section === itemSection
      }
      return pathname === item.href
    }
    return pathname === item.href
  }

  const isItemLocked = (item: NavItem) => {
    if (type !== 'vendor' || isApproved) return false
    if (isPending) {
      // Pending vendor: Overview and Profile are available, others locked
      return Boolean(item.requiresApproval)
    }
    // Rejected / Suspended: only Overview showing gate is available
    return item.tabKey !== 'overview' && item.href !== '/vendor?tab=overview'
  }

  const renderNavList = (onNavigate?: () => void) => {
    if (type === 'admin') {
      return (
        <div className="space-y-1">
          {adminNav.map((item) => {
            const Icon = item.icon
            const active = isItemActive(item)
            return (
              <AppLink
                key={item.href}
                to={item.href}
                onClick={onNavigate}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-[8px] text-xs font-medium transition-colors relative group select-none',
                  active
                    ? 'text-foreground font-semibold bg-surface/70'
                    : 'text-muted-foreground hover:bg-surface/40 hover:text-foreground',
                  collapsed && 'justify-center px-0',
                )}
                title={collapsed ? item.title : undefined}
              >
                <Icon className={cn('size-4 shrink-0', active ? 'text-brand' : 'text-muted-foreground')} />
                {!collapsed && (
                  <span className="truncate flex-1 relative">
                    {item.title}
                    {active && (
                      <span
                        className="absolute -bottom-1 left-0 right-0 h-[2px] bg-brand rounded-full"
                        aria-hidden="true"
                      />
                    )}
                  </span>
                )}
                {!collapsed && item.badge && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-brand/10 text-brand tabular-nums">
                    {item.badge}
                  </span>
                )}
              </AppLink>
            )
          })}
        </div>
      )
    }

    return (
      <div className="space-y-4">
        {vendorNavSections.map((section) => (
          <div key={section.title} className="space-y-1">
            {!collapsed && (
              <div className="px-3 text-[11px] font-semibold text-muted-foreground/80 mb-1">
                {section.title}
              </div>
            )}
            {section.items.map((item) => {
              const Icon = item.icon
              const active = isItemActive(item)
              const locked = isItemLocked(item)

              if (locked) {
                return (
                  <div
                    key={item.href}
                    title="Available after approval"
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-[8px] text-xs font-medium text-muted-foreground/40 cursor-not-allowed select-none',
                      collapsed && 'justify-center px-0',
                    )}
                  >
                    <Icon className="size-4 shrink-0" />
                    {!collapsed && <span className="truncate flex-1">{item.title}</span>}
                    <Lock className="size-3 text-muted-foreground/50 shrink-0" />
                  </div>
                )
              }

              let dynamicBadge = item.badge
              if (item.href === '/vendor/orders' && vendorBadges.orders) {
                dynamicBadge = String(vendorBadges.orders)
              } else if (item.href.includes('tab=reviews') && vendorBadges.reviews) {
                dynamicBadge = String(vendorBadges.reviews)
              } else if (item.href.includes('tab=inbox') && vendorBadges.inbox) {
                dynamicBadge = String(vendorBadges.inbox)
              }

              return (
                <AppLink
                  key={item.href}
                  to={item.href}
                  onClick={onNavigate}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-[8px] text-xs font-medium transition-colors relative group select-none',
                    active
                      ? 'text-foreground font-semibold bg-surface/70'
                      : 'text-muted-foreground hover:bg-surface/40 hover:text-foreground',
                    collapsed && 'justify-center px-0',
                  )}
                  title={collapsed ? item.title : undefined}
                >
                  <Icon className={cn('size-4 shrink-0', active ? 'text-brand' : 'text-muted-foreground')} />
                  {!collapsed && (
                    <span className="truncate flex-1 relative">
                      {item.title}
                      {active && (
                        <span
                          className="absolute -bottom-1 left-0 right-0 h-[2px] bg-brand rounded-full"
                          aria-hidden="true"
                        />
                      )}
                    </span>
                  )}
                  {!collapsed && dynamicBadge && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-brand/10 text-brand tabular-nums">
                      {dynamicBadge}
                    </span>
                  )}
                </AppLink>
              )
            })}
          </div>
        ))}

        {/* Contact Support link for vendors */}
        <div className="pt-2 border-t border-border/40">
          <AppLink
            to="/help?tab=contact"
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-[8px] text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-surface/40 transition-colors',
              collapsed && 'justify-center px-0',
            )}
            title={collapsed ? 'Contact support' : undefined}
          >
            <MessageSquare className="size-4 shrink-0" />
            {!collapsed && <span>Contact support</span>}
          </AppLink>
        </div>
      </div>
    )
  }

  return (
    <div className="h-dvh flex flex-col bg-background text-foreground overflow-hidden font-sans">
      {/* 48px Top Navigation Bar - Chrome ground with no divider to sidebar */}
      <header className="h-12 shrink-0 px-3 sm:px-4 flex items-center justify-between z-20 bg-background border-b-0">
        <div className="flex items-center gap-2.5">
          {/* Mobile Sheet Trigger */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="lg:hidden text-foreground">
                <Menu className="size-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[228px] p-0 bg-background border-r border-border">
              <SheetHeader className="p-4 border-b border-border">
                <SheetTitle className="font-serif text-base">{title}</SheetTitle>
              </SheetHeader>
              <div className="p-3 overflow-y-auto">
                {renderNavList(() => setMobileOpen(false))}
              </div>
            </SheetContent>
          </Sheet>

          {/* Desktop Typographic Wordmark & Title */}
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="font-bold text-sm tracking-tight text-foreground select-none">
              Rent4Fraction
            </span>
            <span className="text-xs text-muted-foreground border-l border-border/60 pl-2 ml-1">
              {title}
            </span>
          </div>

          {subtitle && (
            <span className="hidden md:inline-block text-xs text-muted-foreground border-l border-border/60 pl-2.5 ml-1">
              {subtitle}
            </span>
          )}
        </div>

        {/* Right actions in 48px bar */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="text-muted-foreground hover:text-foreground size-7"
          >
            {resolvedTheme === 'dark' ? (
              <Sun className="size-3.5" />
            ) : (
              <Moon className="size-3.5" />
            )}
          </Button>

          <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-border/60">
            <div className="size-6 rounded-full bg-brand/10 text-brand flex items-center justify-center text-[11px] font-bold">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <span className="text-xs font-medium text-muted-foreground truncate max-w-[120px]">
              {user?.name || 'Account'}
            </span>
          </div>
        </div>
      </header>

      {/* Frame Body: Sidebar + Inset Sheet */}
      <div className="flex-1 flex min-h-0 bg-background">
        {/* Desktop Sidebar: 228px on chrome ground, no divider */}
        <aside
          className={cn(
            'hidden lg:flex flex-col shrink-0 transition-all duration-200 z-10 bg-background select-none pb-2 pl-2 pr-1',
            collapsed ? 'w-16' : 'w-[228px]',
          )}
        >
          {/* Nav Links */}
          <nav className="flex-1 overflow-y-auto py-1 pr-1 space-y-1">
            {renderNavList()}
          </nav>

          {/* Sidebar Footer */}
          <div className="pt-2 border-t border-border/40 space-y-1 pr-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCollapsed(!collapsed)}
              className="w-full flex items-center justify-between text-xs text-muted-foreground hover:text-foreground h-8 px-2"
            >
              {!collapsed && <span>Collapse sidebar</span>}
              {collapsed ? <ChevronRight className="size-3.5 mx-auto" /> : <ChevronLeft className="size-3.5" />}
            </Button>

            <button
              type="button"
              onClick={logout}
              className={cn(
                'w-full flex items-center gap-2 text-xs text-danger/90 hover:bg-danger/10 px-2 py-1.5 rounded-[8px] transition-colors cursor-pointer',
                collapsed && 'justify-center px-0',
              )}
            >
              <LogOut className="size-3.5" />
              {!collapsed && <span className="truncate">Log out</span>}
            </button>
          </div>
        </aside>

        {/* Main Sheet: 8px inset right and bottom, 16px radius, 1px border, 0 shadow, 24px padding */}
        <main className="flex-1 min-w-0 bg-surface shadow-none overflow-y-auto lg:mr-2 lg:mb-2 lg:rounded-[16px] lg:border border-border p-4 sm:p-6">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
