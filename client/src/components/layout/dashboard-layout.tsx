import React, { useState } from 'react'
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
  Wallet,
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
import { DevRoleSwitcher } from '@/components/shared/dev-role-switcher'
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
      { title: 'Orders & returns', href: '/vendor/orders', icon: ShoppingBag, badge: '3', requiresApproval: true },
      { title: 'Inventory', href: '/vendor/inventory', icon: Package, requiresApproval: true },
    ],
  },
  {
    title: 'Money & feedback',
    items: [
      { title: 'Payouts', href: '/vendor?tab=payouts', tabKey: 'payouts', icon: Wallet, requiresApproval: true },
      { title: 'Reviews', href: '/vendor?tab=reviews', tabKey: 'reviews', icon: Star, badge: '4', requiresApproval: true },
    ],
  },
  {
    title: 'Account',
    items: [
      { title: 'Inbox', href: '/vendor?tab=inbox', tabKey: 'inbox', icon: InboxIcon, badge: '2', requiresApproval: true },
      { title: 'Business profile', href: '/vendor?tab=profile', tabKey: 'profile', icon: Building2, requiresApproval: false },
    ],
  },
]

export const vendorNav: NavItem[] = vendorNavSections.flatMap((s) => s.items)

export const adminNav: NavItem[] = [
  { title: 'Overview', href: '/admin?section=overview', tabKey: 'overview', icon: LayoutDashboard },
  { title: 'Vendors', href: '/admin?section=vendors', tabKey: 'vendors', icon: Building2, badge: '2' },
  { title: 'Disputes', href: '/admin?section=disputes', tabKey: 'disputes', icon: Scale, badge: '2' },
  { title: 'Payouts', href: '/admin?section=payouts', tabKey: 'payouts', icon: Wallet, badge: '3' },
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
                  'flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-sm font-medium transition-colors relative group',
                  active
                    ? 'bg-brand/10 text-brand font-semibold'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  collapsed && 'justify-center px-0',
                )}
                title={collapsed ? item.title : undefined}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r bg-brand" />
                )}
                <Icon className={cn('size-5 shrink-0', active ? 'text-brand' : '')} />
                {!collapsed && <span className="truncate flex-1">{item.title}</span>}
                {!collapsed && item.badge && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-brand/15 text-brand">
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
              <div className="px-3 text-[11px] font-bold tracking-wider uppercase text-muted-foreground/70 mb-1">
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
                      'flex items-center gap-3 px-3 py-2 rounded-[10px] text-sm font-medium text-muted-foreground/50 cursor-not-allowed select-none transition-colors relative',
                      collapsed && 'justify-center px-0',
                    )}
                  >
                    <Icon className="size-4 shrink-0" />
                    {!collapsed && <span className="truncate flex-1">{item.title}</span>}
                    <Lock className="size-3.5 text-muted-foreground/60 shrink-0" />
                  </div>
                )
              }

              return (
                <AppLink
                  key={item.href}
                  to={item.href}
                  onClick={onNavigate}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-[10px] text-sm font-medium transition-colors relative group',
                    active
                      ? 'bg-brand/10 text-brand font-semibold'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    collapsed && 'justify-center px-0',
                  )}
                  title={collapsed ? item.title : undefined}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r bg-brand" />
                  )}
                  <Icon className={cn('size-4 shrink-0', active ? 'text-brand' : '')} />
                  {!collapsed && <span className="truncate flex-1">{item.title}</span>}
                  {!collapsed && item.badge && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-brand/15 text-brand">
                      {item.badge}
                    </span>
                  )}
                </AppLink>
              )
            })}
          </div>
        ))}

        {/* Contact Support link for vendors */}
        <div className="pt-2 border-t border-border">
          <AppLink
            to="/help?tab=contact"
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-[10px] text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors',
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
    <div className="min-h-screen flex bg-background text-foreground">
      {/* Desktop Sidebar (Collapsible 240px / 72px) */}
      <aside
        className={cn(
          'hidden lg:flex flex-col border-r border-border bg-surface transition-all duration-300 relative z-30 shrink-0',
          collapsed ? 'w-[72px]' : 'w-60',
        )}
      >
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-border">
          <AppLink to="/" className="flex items-center gap-2.5 overflow-hidden">
            <div className="size-8 rounded-[8px] bg-brand text-white flex items-center justify-center shrink-0">
              <Package className="size-4" />
            </div>
            {!collapsed && (
              <span className="font-serif font-bold text-lg tracking-tight truncate">
                {title}
              </span>
            )}
          </AppLink>

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="text-muted-foreground hover:text-foreground hidden lg:flex"
          >
            {collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
          </Button>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 p-3 overflow-y-auto">
          {renderNavList()}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-border space-y-2">
          <AppLink
            to="/"
            className={cn(
              'flex items-center gap-2 text-xs text-muted-foreground hover:text-brand px-3 py-2 rounded-lg hover:bg-muted transition-colors',
              collapsed && 'justify-center px-0',
            )}
          >
            <ChevronLeft className="size-4" />
            {!collapsed && <span>Back to Home</span>}
          </AppLink>

          <button
            type="button"
            onClick={logout}
            className={cn(
              'w-full flex items-center gap-2 text-xs text-danger hover:bg-danger/10 px-3 py-2 rounded-lg transition-colors cursor-pointer',
              collapsed && 'justify-center px-0',
            )}
          >
            <LogOut className="size-4" />
            {!collapsed && <span>Log out ({user?.name || 'User'})</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="h-16 border-b border-border bg-surface/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            {/* Mobile Sheet Trigger */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden text-foreground">
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                <SheetHeader className="p-4 border-b border-border">
                  <SheetTitle className="font-serif">{title}</SheetTitle>
                </SheetHeader>
                <div className="p-3 overflow-y-auto">
                  {renderNavList(() => setMobileOpen(false))}
                </div>
              </SheetContent>
            </Sheet>

            <div>
              <h1 className="font-serif text-lg font-bold text-foreground">
                {title}
              </h1>
              {subtitle && (
                <p className="text-xs text-muted-foreground hidden sm:block">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
              {resolvedTheme === 'dark' ? (
                <Sun className="size-5" />
              ) : (
                <Moon className="size-5" />
              )}
            </Button>

            <AppLink to="/">
              <Button variant="outline" size="sm">
                Live Storefront
              </Button>
            </AppLink>
          </div>
        </header>

        {/* Dashboard Content Container */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      <DevRoleSwitcher />
    </div>
  )
}
