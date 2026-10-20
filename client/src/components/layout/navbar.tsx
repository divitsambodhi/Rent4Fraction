import { useEffect, useState } from 'react'
import {
  Armchair,
  Bell,
  ChevronDown,
  Disc3,
  Flame,
  Heart,
  LogOut,
  Menu,
  Mic,
  Moon,
  Package,
  Search,
  ShoppingBag,
  Sparkles,
  SquareMenu,
  Sun,
  Tent,
  Volume2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { AppLink, useAppNavigate, useAppPathname } from '@/components/shared/app-link'
import { NotificationList } from '@/components/shared/notification-list'
import { useAuth } from '@/providers/auth-provider'
import { useTheme } from '@/providers/theme-provider'
import { useWishlist } from '@/providers/wishlist-provider'
import { useCart } from '@/providers/cart-provider'
import { MOCK_CATEGORIES, MOCK_NOTIFICATIONS } from '@/lib/api/mock-data'
import { getNotifications } from '@/lib/api'
import { cn } from '@/lib/utils'

const CATEGORY_ICONS: Record<string, typeof Volume2> = {
  Volume2,
  Mic,
  Disc3,
  Sparkles,
  Flame,
  Armchair,
  SquareMenu,
  Tent,
}

export function Navbar() {
  const { role, user, logout } = useAuth()
  const { resolvedTheme, toggleTheme } = useTheme()
  const { wishlist } = useWishlist()
  const { cartCount } = useCart()
  const navigate = useAppNavigate()
  const pathname = useAppPathname()

  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [navSearch, setNavSearch] = useState('')
  const [customerUnreadCount, setCustomerUnreadCount] = useState(0)

  useEffect(() => {
    if (role !== 'customer') return

    let active = true
    const updateCount = async () => {
      try {
        const notifs = await getNotifications()
        if (active) {
          setCustomerUnreadCount(notifs.filter((n) => !n.read).length)
        }
      } catch {
        // ignore
      }
    }

    updateCount()
    window.addEventListener('r4f-account-store-updated', updateCount)
    return () => {
      active = false
      window.removeEventListener('r4f-account-store-updated', updateCount)
    }
  }, [role])

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  // Close mobile sheet on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  // Track window scroll for elevated shadow
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleNavSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (navSearch.trim()) {
      navigate(`/equipment?q=${encodeURIComponent(navSearch.trim())}`)
      setNavSearch('')
    }
  }

  const unreadNotifsCount =
    role === 'customer'
      ? customerUnreadCount
      : MOCK_NOTIFICATIONS.filter((n) => !n.read).length

  return (
    <header
      className={cn(
        'sticky top-0 z-40 w-full h-16 border-b transition-all duration-200',
        scrolled
          ? 'bg-surface/95 backdrop-blur-md border-border shadow-xs'
          : 'bg-surface/85 backdrop-blur-sm border-border/70',
      )}
    >
      <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
        {/* Left: Brand Logo Mark */}
        <div className="flex items-center gap-6 lg:gap-8 shrink-0">
          <AppLink
            to="/"
            className="flex items-center gap-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-lg"
            aria-label="Rent4Fraction Home"
          >
            {/* 32px Logo Mark */}
            <div className="size-8 rounded-[10px] bg-brand text-white flex items-center justify-center shadow-xs shrink-0">
              <Package className="size-4.5 stroke-[2.2]" />
            </div>
            {/* Fraunces Wordmark with '4' in brand */}
            <span className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-foreground select-none">
              rent<span className="text-brand">4</span>fraction
            </span>
          </AppLink>

          {/* Desktop Nav Links */}
          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <AppLink
              to="/equipment"
              className="hover:text-brand transition-colors"
            >
              Browse equipment
            </AppLink>

            {/* Categories Mega-Menu */}
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-1 hover:text-brand transition-colors outline-none cursor-pointer"
                >
                  <span>Categories</span>
                  <ChevronDown className="size-3.5 opacity-70" />
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                className="w-[480px] p-4 bg-surface border-border shadow-xl rounded-[16px]"
              >
                <div className="text-xs font-semibold text-brand mb-3 px-2">
                  Event Equipment Categories
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {MOCK_CATEGORIES.map((cat) => {
                    const Icon = CATEGORY_ICONS[cat.icon] || Package
                    return (
                      <AppLink
                        key={cat.id}
                        to={`/equipment?category=${cat.id}`}
                        className="flex items-start gap-3 p-2.5 rounded-[10px] hover:bg-muted/60 transition-colors group"
                      >
                        <div className="size-8 rounded-[8px] bg-brand/10 text-brand flex items-center justify-center shrink-0 group-hover:bg-brand group-hover:text-white transition-colors">
                          <Icon className="size-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-foreground group-hover:text-brand truncate">
                            {cat.name}
                          </div>
                          <div className="text-xs text-muted-foreground tabular-nums">
                            From ₹{cat.starting_price}/day
                          </div>
                        </div>
                      </AppLink>
                    )
                  })}
                </div>
              </PopoverContent>
            </Popover>

            <AppLink
              to="/#how-it-works"
              className="hover:text-brand transition-colors"
            >
              How it works
            </AppLink>

            {/* Become a vendor: only for visitors */}
            {role === 'visitor' && (
              <AppLink
                to="/vendor"
                className="hover:text-brand transition-colors text-brand/90 font-semibold"
              >
                Become a vendor
              </AppLink>
            )}
          </nav>
        </div>

        {/* Center: Compact Search (Visible on large desktop >=1280px) */}
        <form
          onSubmit={handleNavSearchSubmit}
          className="hidden xl:flex items-center flex-1 max-w-xs relative mx-4"
        >
          <Search className="absolute left-3 size-4 text-muted-foreground pointer-events-none" />
          <input
            type="search"
            value={navSearch}
            onChange={(e) => setNavSearch(e.target.value)}
            placeholder="Quick search equipment..."
            className="w-full h-9 pl-9 pr-4 rounded-full border border-border bg-muted/40 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand focus:bg-surface transition-all"
          />
        </form>

        {/* Right Actions: Role Aware */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Theme Toggle (40px icon button) */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label={
              resolvedTheme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'
            }
            className="text-muted-foreground hover:text-foreground"
          >
            {resolvedTheme === 'dark' ? (
              <Sun className="size-5" />
            ) : (
              <Moon className="size-5" />
            )}
          </Button>

          {/* VISITOR ROLE ACTIONS */}
          {role === 'visitor' && (
            <div className="hidden sm:flex items-center gap-2">
              <AppLink to="/auth">
                <Button variant="ghost" size="default">
                  Log in
                </Button>
              </AppLink>
              <AppLink to="/auth?mode=signup">
                <Button size="default">
                  Sign up
                </Button>
              </AppLink>
            </div>
          )}

          {/* CUSTOMER ROLE ACTIONS */}
          {role === 'customer' && (
            <div className="flex items-center gap-1 sm:gap-2">
              {/* Wishlist Heart with count */}
              <AppLink
                to="/account?tab=wishlist"
                aria-label={`Wishlist with ${wishlist.length} saved items`}
                className="relative"
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-brand"
                >
                  <Heart className="size-5" />
                  {wishlist.length > 0 && (
                    <span className="absolute top-1.5 right-1.5 size-4 rounded-full bg-brand text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                      {wishlist.length}
                    </span>
                  )}
                </Button>
              </AppLink>

              {/* Cart Bag with count */}
              <AppLink
                to="/checkout"
                aria-label={`Cart with ${cartCount} items`}
                className="relative"
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-brand"
                >
                  <ShoppingBag className="size-5" />
                  {cartCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 size-4 rounded-full bg-brand text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                      {cartCount}
                    </span>
                  )}
                </Button>
              </AppLink>

              {/* Notifications Popover */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="View notifications"
                    className="relative text-muted-foreground hover:text-brand"
                  >
                    <Bell className="size-5" />
                    {unreadNotifsCount > 0 && (
                      <span className="absolute top-2 right-2 size-2 rounded-full bg-brand animate-ping" />
                    )}
                    {unreadNotifsCount > 0 && (
                      <span className="absolute top-2 right-2 size-2 rounded-full bg-brand" />
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="p-3 bg-surface border-border">
                  <NotificationList initialNotifications={MOCK_NOTIFICATIONS} />
                </PopoverContent>
              </Popover>

              {/* Customer Avatar Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="size-9 rounded-full bg-brand/10 text-brand font-semibold text-xs flex items-center justify-center border border-brand/20 hover:border-brand focus:outline-none focus:ring-2 focus:ring-brand cursor-pointer"
                    aria-label="User account menu"
                  >
                    {user?.avatarInitials || 'AM'}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-surface border-border">
                  <DropdownMenuLabel>
                    <div className="font-semibold text-foreground truncate">{user?.name}</div>
                    <div className="text-xs text-muted-foreground font-normal truncate">
                      {user?.email}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <AppLink to="/account?tab=bookings" className="w-full">
                      My bookings
                    </AppLink>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <AppLink to="/account?tab=inbox" className="w-full">
                      Inbox & messages
                    </AppLink>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <AppLink to="/account?tab=wishlist" className="w-full">
                      Wishlist ({wishlist.length})
                    </AppLink>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <AppLink to="/account?tab=addresses" className="w-full">
                      Addresses & venues
                    </AppLink>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <AppLink to="/account?tab=profile" className="w-full">
                      Profile & security
                    </AppLink>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <AppLink to="/account?tab=payments" className="w-full">
                      Payments & refunds
                    </AppLink>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <AppLink to="/account?tab=reviews" className="w-full">
                      My reviews
                    </AppLink>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="text-danger focus:text-danger focus:bg-danger/10"
                  >
                    <LogOut className="size-4 mr-2" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          {/* VENDOR ROLE ACTIONS */}
          {role === 'vendor' && (
            <div className="flex items-center gap-2">
              {/* Notification Bell */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Vendor notifications"
                    className="relative text-muted-foreground hover:text-brand"
                  >
                    <Bell className="size-5" />
                    {unreadNotifsCount > 0 && (
                      <span className="absolute top-2 right-2 size-2 rounded-full bg-brand" />
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="p-3 bg-surface border-border">
                  <NotificationList initialNotifications={MOCK_NOTIFICATIONS} />
                </PopoverContent>
              </Popover>

              {/* Primary Vendor Dashboard CTA */}
              <AppLink to="/vendor" className="hidden sm:inline-flex">
                <Button size="default">
                  Vendor dashboard
                </Button>
              </AppLink>

              {/* Vendor Avatar Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="size-9 rounded-full bg-brand text-white font-semibold text-xs flex items-center justify-center shadow-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand"
                    aria-label="Vendor business menu"
                  >
                    {user?.avatarInitials || 'SS'}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-surface border-border">
                  <DropdownMenuLabel>
                    <div className="font-semibold text-foreground truncate">{user?.name}</div>
                    <div className="text-xs text-muted-foreground font-normal">Verified Vendor</div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <AppLink to="/vendor" className="w-full">
                      Dashboard overview
                    </AppLink>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <AppLink to="/vendor/inventory" className="w-full">
                      Inventory management
                    </AppLink>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <AppLink to="/vendor/orders" className="w-full">
                      Orders & dispatch
                    </AppLink>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <AppLink to="/vendor?tab=profile" className="w-full">
                      Business profile
                    </AppLink>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="text-danger focus:text-danger focus:bg-danger/10"
                  >
                    <LogOut className="size-4 mr-2" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          {/* ADMIN ROLE ACTIONS */}
          {role === 'admin' && (
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Admin notifications"
                    className="relative text-muted-foreground hover:text-brand"
                  >
                    <Bell className="size-5" />
                    {unreadNotifsCount > 0 && (
                      <span className="absolute top-2 right-2 size-2 rounded-full bg-brand" />
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="p-3 bg-surface border-border">
                  <NotificationList initialNotifications={MOCK_NOTIFICATIONS} />
                </PopoverContent>
              </Popover>

              <AppLink to="/admin" className="hidden sm:inline-flex">
                <Button size="default">
                  Admin console
                </Button>
              </AppLink>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="size-9 rounded-full bg-brand text-white font-semibold text-xs flex items-center justify-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand"
                    aria-label="Admin menu"
                  >
                    AD
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 bg-surface border-border">
                  <DropdownMenuLabel>
                    <div className="font-semibold text-foreground">Admin Console</div>
                    <div className="text-xs text-muted-foreground font-normal">Superadmin</div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <AppLink to="/admin" className="w-full">
                      Operations Dashboard
                    </AppLink>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="text-danger focus:text-danger focus:bg-danger/10"
                  >
                    <LogOut className="size-4 mr-2" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          {/* Mobile Hamburger Trigger (<1024px) */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden text-foreground min-w-[44px] min-h-[44px]"
                aria-label="Open mobile navigation menu"
              >
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] sm:w-[360px] p-0 flex flex-col">
              <SheetHeader className="p-5 border-b border-border">
                <SheetTitle className="flex items-center gap-2">
                  <div className="size-8 rounded-[8px] bg-brand text-white flex items-center justify-center">
                    <Package className="size-4" />
                  </div>
                  <span className="font-serif text-xl font-bold">
                    rent<span className="text-brand">4</span>fraction
                  </span>
                </SheetTitle>
              </SheetHeader>

              {/* Mobile Links with 44px tap targets */}
              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Primary Nav */}
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-brand px-3 mb-1">
                    Navigation
                  </div>
                  <AppLink
                    to="/equipment"
                    className="flex items-center h-11 px-3 rounded-[8px] text-sm font-medium hover:bg-muted text-foreground transition-colors"
                  >
                    Browse equipment
                  </AppLink>
                  <AppLink
                    to="/#how-it-works"
                    className="flex items-center h-11 px-3 rounded-[8px] text-sm font-medium hover:bg-muted text-foreground transition-colors"
                  >
                    How it works
                  </AppLink>
                  {role === 'visitor' && (
                    <AppLink
                      to="/vendor"
                      className="flex items-center h-11 px-3 rounded-[8px] text-sm font-semibold text-brand hover:bg-brand/10 transition-colors"
                    >
                      Become a vendor
                    </AppLink>
                  )}
                </div>

                {/* Categories */}
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-brand px-3 mb-1">
                    Categories
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {MOCK_CATEGORIES.map((cat) => (
                      <AppLink
                        key={cat.id}
                        to={`/equipment?category=${cat.id}`}
                        className="flex items-center h-11 px-3 rounded-[8px] text-xs font-medium text-foreground hover:bg-muted truncate"
                      >
                        {cat.name}
                      </AppLink>
                    ))}
                  </div>
                </div>

                {/* Role-Specific Actions */}
                <div className="space-y-1 pt-2 border-t border-border">
                  <div className="text-xs font-semibold text-muted-foreground px-3 mb-1">
                    Account ({role})
                  </div>
                  {role === 'visitor' ? (
                    <div className="grid grid-cols-2 gap-2 p-2">
                      <AppLink to="/auth" className="w-full">
                        <Button variant="outline" className="w-full h-11">
                          Log in
                        </Button>
                      </AppLink>
                      <AppLink to="/auth?mode=signup" className="w-full">
                        <Button className="w-full h-11">
                          Sign up
                        </Button>
                      </AppLink>
                    </div>
                  ) : role === 'customer' ? (
                    <>
                      <AppLink
                        to="/account?tab=bookings"
                        className="flex items-center h-11 px-3 rounded-[8px] text-sm font-medium hover:bg-muted"
                      >
                        My bookings
                      </AppLink>
                      <AppLink
                        to="/account?tab=inbox"
                        className="flex items-center h-11 px-3 rounded-[8px] text-sm font-medium hover:bg-muted"
                      >
                        Inbox & messages
                      </AppLink>
                      <AppLink
                        to="/account?tab=wishlist"
                        className="flex items-center h-11 px-3 rounded-[8px] text-sm font-medium hover:bg-muted"
                      >
                        Wishlist ({wishlist.length})
                      </AppLink>
                      <AppLink
                        to="/account?tab=addresses"
                        className="flex items-center h-11 px-3 rounded-[8px] text-sm font-medium hover:bg-muted"
                      >
                        Addresses & venues
                      </AppLink>
                      <AppLink
                        to="/account?tab=profile"
                        className="flex items-center h-11 px-3 rounded-[8px] text-sm font-medium hover:bg-muted"
                      >
                        Profile & security
                      </AppLink>
                      <AppLink
                        to="/account?tab=payments"
                        className="flex items-center h-11 px-3 rounded-[8px] text-sm font-medium hover:bg-muted"
                      >
                        Payments & refunds
                      </AppLink>
                      <AppLink
                        to="/account?tab=reviews"
                        className="flex items-center h-11 px-3 rounded-[8px] text-sm font-medium hover:bg-muted"
                      >
                        My reviews
                      </AppLink>
                      <AppLink
                        to="/checkout"
                        className="flex items-center h-11 px-3 rounded-[8px] text-sm font-medium hover:bg-muted"
                      >
                        Cart ({cartCount})
                      </AppLink>
                    </>
                  ) : role === 'vendor' ? (
                    <>
                      <AppLink
                        to="/vendor"
                        className="flex items-center h-11 px-3 rounded-[8px] text-sm font-medium hover:bg-muted"
                      >
                        Vendor dashboard
                      </AppLink>
                      <AppLink
                        to="/vendor/inventory"
                        className="flex items-center h-11 px-3 rounded-[8px] text-sm font-medium hover:bg-muted"
                      >
                        Inventory
                      </AppLink>
                      <AppLink
                        to="/vendor/orders"
                        className="flex items-center h-11 px-3 rounded-[8px] text-sm font-medium hover:bg-muted"
                      >
                        Orders & returns
                      </AppLink>
                    </>
                  ) : (
                    <AppLink
                      to="/admin"
                      className="flex items-center h-11 px-3 rounded-[8px] text-sm font-medium hover:bg-muted"
                    >
                      Admin console
                    </AppLink>
                  )}
                </div>
              </div>

              {/* Bottom Drawer Bar */}
              {role !== 'visitor' && (
                <div className="p-4 border-t border-border">
                  <Button
                    variant="ghost"
                    onClick={handleLogout}
                    className="w-full h-11 justify-start text-danger hover:bg-danger/10"
                  >
                    <LogOut className="size-4 mr-2" />
                    Log out ({user?.name})
                  </Button>
                </div>
              )}
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
