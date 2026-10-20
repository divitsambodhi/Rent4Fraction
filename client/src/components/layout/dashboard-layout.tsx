import React, { useState } from 'react'
import {
  Activity,
  BarChart3,
  Building2,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Package,
  Scale,
  Settings,
  ShieldAlert,
  ShoppingBag,
  Sun,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { AppLink, useAppPathname } from '@/components/shared/app-link'
import { useAuth } from '@/providers/auth-provider'
import { useTheme } from '@/providers/theme-provider'
import { DevRoleSwitcher } from '@/components/shared/dev-role-switcher'
import { cn } from '@/lib/utils'

export interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
}

export const vendorNav: NavItem[] = [
  { title: 'Dashboard', href: '/_preview/vendor', icon: LayoutDashboard },
  { title: 'Inventory', href: '/vendor/inventory', icon: Package, badge: '38' },
  { title: 'Orders & returns', href: '/vendor/orders', icon: ShoppingBag, badge: '3' },
  { title: 'Business profile', href: '/vendor?tab=profile', icon: Building2 },
  { title: 'Payouts & analytics', href: '/vendor?tab=payouts', icon: BarChart3 },
]

export const adminNav: NavItem[] = [
  { title: 'Operations Overview', href: '/_preview/admin', icon: Activity },
  { title: 'Vendor Approvals', href: '/admin?tab=approvals', icon: CheckCircle, badge: '5' },
  { title: 'Escrow Deposits', href: '/admin?tab=escrow', icon: ShieldAlert },
  { title: 'Dispute Resolution', href: '/admin?tab=disputes', icon: Scale, badge: '1' },
  { title: 'System Settings', href: '/admin?tab=settings', icon: Settings },
]

interface DashboardLayoutProps {
  type: 'vendor' | 'admin'
  children: React.ReactNode
}

export function DashboardLayout({ type, children }: DashboardLayoutProps) {
  const { user, logout } = useAuth()
  const { resolvedTheme, toggleTheme } = useTheme()
  const pathname = useAppPathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const navItems = type === 'vendor' ? vendorNav : adminNav
  const title = type === 'vendor' ? 'Vendor Portal' : 'Admin Console'

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* Desktop Sidebar (Collapsible 240px / 72px) */}
      <aside
        className={cn(
          'hidden lg:flex flex-col border-r border-border bg-surface transition-all duration-300 relative z-30',
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
        <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = pathname === item.href
            return (
              <AppLink
                key={item.href}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-sm font-medium transition-colors relative group',
                  active
                    ? 'bg-brand/10 text-brand font-semibold'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  collapsed && 'justify-center px-0',
                )}
                title={collapsed ? item.title : undefined}
              >
                {/* Active Brand Bar Indicator */}
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r bg-brand" />
                )}
                <Icon className={cn('size-5 shrink-0', active ? 'text-brand' : '')} />
                {!collapsed && (
                  <span className="truncate flex-1">{item.title}</span>
                )}
                {!collapsed && item.badge && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-brand/15 text-brand">
                    {item.badge}
                  </span>
                )}
              </AppLink>
            )
          })}
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
              'w-full flex items-center gap-2 text-xs text-danger hover:bg-danger/10 px-3 py-2 rounded-lg transition-colors',
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
                <div className="p-3 space-y-1">
                  {navItems.map((item) => {
                    const Icon = item.icon
                    const active = pathname === item.href
                    return (
                      <AppLink
                        key={item.href}
                        to={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-sm font-medium transition-colors',
                          active
                            ? 'bg-brand/10 text-brand font-semibold'
                            : 'text-muted-foreground hover:bg-muted',
                        )}
                      >
                        <Icon className="size-5 shrink-0" />
                        <span>{item.title}</span>
                      </AppLink>
                    )
                  })}
                </div>
              </SheetContent>
            </Sheet>

            <h1 className="font-serif text-lg font-bold text-foreground">
              {title}
            </h1>
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
