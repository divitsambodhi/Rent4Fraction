import { useEffect, useRef, useState } from 'react'
import { Icon } from '@/components/ui/icon'
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
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { AppLink, useAppNavigate, useAppPathname } from '@/components/shared/app-link'
import { NotificationList } from '@/components/shared/notification-list'
import { useAuth } from '@/providers/auth-provider'
import { useTheme } from '@/providers/theme-provider'
import { useWishlist } from '@/providers/wishlist-provider'
import { useCart } from '@/providers/cart-provider'
import { useOverlayHistory } from '@/hooks/use-overlay-history'
import { MOCK_CATEGORIES, MOCK_NOTIFICATIONS } from '@/lib/api/mock-data'
import { getNotifications } from '@/lib/api'

export function Navbar() {
  const { role, user, logout } = useAuth()
  const { resolvedTheme, toggleTheme } = useTheme()
  const { wishlist } = useWishlist()
  const { cartCount } = useCart()
  const navigate = useAppNavigate()
  const pathname = useAppPathname()

  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOverlayOpen, setSearchOverlayOpen] = useState(false)
  const [navSearch, setNavSearch] = useState('')
  const [customerUnreadCount, setCustomerUnreadCount] = useState(0)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Android Back button handling for search overlay
  useOverlayHistory({
    isOpen: searchOverlayOpen,
    onClose: () => setSearchOverlayOpen(false),
    overlayId: 'navbar-search-overlay',
    enabled: searchOverlayOpen,
  })

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
    setSearchOverlayOpen(false)
  }, [pathname])

  // Focus search input when overlay opens
  useEffect(() => {
    if (searchOverlayOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 50)
    }
  }, [searchOverlayOpen])

  const handleNavSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (navSearch.trim()) {
      navigate(`/equipment?q=${encodeURIComponent(navSearch.trim())}`)
      setNavSearch('')
      setSearchOverlayOpen(false)
    }
  }

  const unreadNotifsCount =
    role === 'customer'
      ? customerUnreadCount
      : MOCK_NOTIFICATIONS.filter((n) => !n.read).length

  return (
    <>
      <header className="sticky top-0 z-navbar w-full h-14 sm:h-16 border-b border-border bg-surface transition-colors pt-[env(safe-area-inset-top)]">
        <div className="max-w-7xl mx-auto h-full px-3 sm:px-6 lg:px-8 flex items-center justify-between gap-2 sm:gap-4">
          {/* Left: Brand Logo Mark */}
          <div className="flex items-center gap-4 lg:gap-8 shrink-0">
            <AppLink
              to="/"
              className="flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-sm py-1"
              aria-label="Rent4Fraction Home"
            >
              <span className="text-lg sm:text-headline-sm font-bold tracking-tight text-foreground select-none">
                rent<span className="text-brand">4</span>fraction
              </span>
            </AppLink>

            {/* Desktop Nav Links */}
            <nav className="hidden lg:flex items-center gap-6 text-body-sm font-medium text-text-secondary">
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
                    <Icon name="chevron-down" size={14} className="opacity-70" />
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  className="w-[calc(100vw-32px)] max-w-[440px] sm:w-[440px] p-4 bg-surface border-border shadow-sm rounded-sm z-popover"
                >
                  <div className="text-label-sm font-semibold text-brand mb-3 px-1">
                    Equipment categories
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {MOCK_CATEGORIES.map((cat) => (
                      <AppLink
                        key={cat.id}
                        to={`/equipment?category=${cat.id}`}
                        className="flex flex-col p-2.5 rounded-sm border border-transparent hover:border-border hover:bg-muted transition-colors"
                      >
                        <span className="text-body-sm font-semibold text-foreground truncate">
                          {cat.name}
                        </span>
                        <span className="text-label-sm text-text-secondary tabular-nums">
                          From ₹{cat.starting_price} per day
                        </span>
                      </AppLink>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              <AppLink
                to="/#how-it-works"
                className="hover:text-brand transition-colors"
              >
                How it works
              </AppLink>

              {role === 'visitor' && (
                <AppLink
                  to="/vendor"
                  className="hover:text-brand transition-colors text-brand font-semibold"
                >
                  Become a vendor
                </AppLink>
              )}
            </nav>
          </div>

          {/* Center: Search pill (Desktop) */}
          <form
            onSubmit={handleNavSearchSubmit}
            className="hidden xl:flex items-center flex-1 max-w-xs relative mx-4"
          >
            <Icon name="search" size={16} className="absolute left-3 text-muted-foreground pointer-events-none" />
            <input
              type="search"
              value={navSearch}
              onChange={(e) => setNavSearch(e.target.value)}
              placeholder="Search equipment..."
              className="w-full h-9 pl-9 pr-4 rounded-full border border-border bg-background text-body-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand focus:bg-surface transition-colors"
            />
          </form>

          {/* Right Actions: Role Aware + Mobile Icons */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Mobile Search Button (below xl) */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSearchOverlayOpen(true)}
              aria-label="Search equipment"
              className="xl:hidden text-foreground hover:text-brand min-w-[44px] min-h-[44px]"
            >
              <Icon name="search" size={18} />
            </Button>

            {/* Cart Icon (shown on mobile for visitors and customers) */}
            {(role === 'visitor' || role === 'customer') && (
              <AppLink
                to="/checkout"
                aria-label={`Cart with ${cartCount} items`}
                className="relative"
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-foreground hover:text-brand min-w-[44px] min-h-[44px]"
                >
                  <Icon name="cart" size={18} />
                  {cartCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 size-4 rounded-full bg-brand text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                      {cartCount}
                    </span>
                  )}
                </Button>
              </AppLink>
            )}

            {/* Wishlist Icon (customer only) */}
            {role === 'customer' && (
              <AppLink
                to="/account?tab=wishlist"
                aria-label={`Wishlist with ${wishlist.length} saved items`}
                className="relative hidden sm:inline-flex"
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-foreground hover:text-brand min-w-[44px] min-h-[44px]"
                >
                  <Icon name="heart" size={18} />
                  {wishlist.length > 0 && (
                    <span className="absolute top-1.5 right-1.5 size-4 rounded-full bg-brand text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                      {wishlist.length}
                    </span>
                  )}
                </Button>
              </AppLink>
            )}

            {/* Notifications Popover (Customer only, desktop) */}
            {role === 'customer' && (
              <div className="hidden sm:inline-flex">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="View notifications"
                      className="relative text-foreground hover:text-brand min-w-[44px] min-h-[44px]"
                    >
                      <Icon name="bell" size={18} />
                      {unreadNotifsCount > 0 && (
                        <span className="absolute top-2 right-2 size-2 rounded-full bg-brand" />
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="p-3 bg-surface border-border shadow-sm rounded-sm z-popover">
                    <NotificationList initialNotifications={MOCK_NOTIFICATIONS} />
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {/* Theme Toggle (44px min hit area) */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              aria-label={
                resolvedTheme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'
              }
              className="text-foreground hover:text-brand min-w-[44px] min-h-[44px]"
            >
              <Icon name={resolvedTheme === 'dark' ? 'sun' : 'moon'} size={18} />
            </Button>

            {/* VISITOR DESKTOP BUTTONS */}
            {role === 'visitor' && (
              <div className="hidden sm:flex items-center gap-2">
                <AppLink to="/auth">
                  <Button variant="ghost" size="default" className="h-10">
                    Log in
                  </Button>
                </AppLink>
                <AppLink to="/auth?mode=signup">
                  <Button size="default" className="h-10">
                    Sign up
                  </Button>
                </AppLink>
              </div>
            )}

            {/* CUSTOMER DESKTOP AVATAR */}
            {role === 'customer' && (
              <div className="hidden sm:flex items-center">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="size-9 rounded-full bg-muted text-foreground font-semibold text-xs flex items-center justify-center border border-border hover:border-brand focus:outline-none focus:ring-2 focus:ring-brand cursor-pointer"
                      aria-label="User account menu"
                    >
                      {user?.avatarInitials || 'AM'}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 bg-surface border-border shadow-sm rounded-sm z-popover">
                    <DropdownMenuLabel>
                      <div className="font-semibold text-foreground truncate">{user?.name}</div>
                      <div className="text-xs text-text-secondary font-normal truncate">
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
                        Inbox and messages
                      </AppLink>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <AppLink to="/account?tab=wishlist" className="w-full">
                        Saved equipment ({wishlist.length})
                      </AppLink>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <AppLink to="/account?tab=addresses" className="w-full">
                        Delivery addresses
                      </AppLink>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <AppLink to="/account?tab=profile" className="w-full">
                        Profile details
                      </AppLink>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <AppLink to="/account?tab=payments" className="w-full">
                        Payments and deposits
                      </AppLink>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <AppLink to="/account?tab=reviews" className="w-full">
                        Equipment reviews
                      </AppLink>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="text-danger focus:text-danger focus:bg-muted"
                    >
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}

            {/* VENDOR DESKTOP BUTTON & MENU */}
            {role === 'vendor' && (
              <div className="hidden sm:flex items-center gap-2">
                <AppLink to="/vendor">
                  <Button size="default" className="h-10">
                    Vendor dashboard
                  </Button>
                </AppLink>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="size-9 rounded-full bg-brand text-white font-semibold text-xs flex items-center justify-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand"
                      aria-label="Vendor business menu"
                    >
                      {user?.avatarInitials || 'SS'}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 bg-surface border-border shadow-sm rounded-sm z-popover">
                    <DropdownMenuLabel>
                      <div className="font-semibold text-foreground truncate">{user?.name}</div>
                      <div className="text-xs text-text-secondary font-normal">Vendor Account</div>
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
                        Orders and dispatch
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
                      className="text-danger focus:text-danger focus:bg-muted"
                    >
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}

            {/* ADMIN DESKTOP BUTTON & MENU */}
            {role === 'admin' && (
              <div className="hidden sm:flex items-center gap-2">
                <AppLink to="/admin">
                  <Button size="default" className="h-10">
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
                  <DropdownMenuContent align="end" className="w-52 bg-surface border-border shadow-sm rounded-sm z-popover">
                    <DropdownMenuLabel>
                      <div className="font-semibold text-foreground">Admin Console</div>
                      <div className="text-xs text-text-secondary font-normal">Administrator</div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <AppLink to="/admin" className="w-full">
                        Operations dashboard
                      </AppLink>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="text-danger focus:text-danger focus:bg-muted"
                    >
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
                  <Icon name="menu" size={22} />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-full sm:w-[380px] p-0 flex flex-col h-dvh max-h-dvh">
                {/* Account Header Block */}
                <div className="p-5 border-b border-border bg-muted/20 shrink-0 pt-[max(1.25rem,env(safe-area-inset-top))]">
                  <div className="flex items-center justify-between mb-3">
                    <SheetTitle className="text-lg font-bold text-foreground">
                      rent<span className="text-brand">4</span>fraction
                    </SheetTitle>
                  </div>

                  {user ? (
                    <div className="flex items-center gap-3">
                      <div className="size-11 rounded-full bg-brand text-white font-bold text-sm flex items-center justify-center shrink-0">
                        {user.avatarInitials || (role === 'admin' ? 'AD' : 'SS')}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-foreground truncate">{user.name}</div>
                        <div className="text-xs text-muted-foreground truncate">{user.email || `${role} account`}</div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Multi-vendor event rental marketplace across India
                    </p>
                  )}
                </div>

                {/* Mobile Navigation Rows (Large 52px Touch Rows) */}
                <div className="flex-1 overflow-y-auto overscroll-contain p-3 space-y-4">
                  {/* General Nav */}
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-3 py-1">
                      Explore
                    </div>
                    <div className="space-y-0.5">
                      <AppLink
                        to="/equipment"
                        className="flex items-center h-[52px] px-3 rounded-lg text-sm font-semibold text-foreground hover:bg-muted active:bg-muted/80 transition-colors"
                      >
                        <Icon name="package" size={18} className="mr-3 text-brand" />
                        <span>Browse equipment catalogue</span>
                      </AppLink>
                      <AppLink
                        to="/#how-it-works"
                        className="flex items-center h-[52px] px-3 rounded-lg text-sm font-semibold text-foreground hover:bg-muted active:bg-muted/80 transition-colors"
                      >
                        <Icon name="clock" size={18} className="mr-3 text-muted-foreground" />
                        <span>How it works</span>
                      </AppLink>
                      {role === 'visitor' && (
                        <AppLink
                          to="/vendor"
                          className="flex items-center h-[52px] px-3 rounded-lg text-sm font-semibold text-brand hover:bg-brand/10 transition-colors"
                        >
                          <Icon name="briefcase" size={18} className="mr-3 text-brand" />
                          <span>Become a verified vendor</span>
                        </AppLink>
                      )}
                    </div>
                  </div>

                  {/* Categories Row */}
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-3 py-1">
                      Event Categories
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 pt-1">
                      {MOCK_CATEGORIES.map((cat) => (
                        <AppLink
                          key={cat.id}
                          to={`/equipment?category=${cat.id}`}
                          className="flex items-center h-[46px] px-3 rounded-lg text-xs font-medium text-foreground bg-surface border border-border hover:border-brand/40 truncate"
                        >
                          <span className="truncate">{cat.name}</span>
                        </AppLink>
                      ))}
                    </div>
                  </div>

                  {/* Role Specific Actions */}
                  {role === 'customer' && (
                    <div className="pt-2 border-t border-border">
                      <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-3 py-1">
                        My Account
                      </div>
                      <div className="space-y-0.5">
                        <AppLink
                          to="/account?tab=bookings"
                          className="flex items-center h-[52px] px-3 rounded-lg text-sm font-semibold text-foreground hover:bg-muted active:bg-muted/80"
                        >
                          <Icon name="calendar" size={18} className="mr-3 text-brand" />
                          <span>Bookings & Orders</span>
                        </AppLink>
                        <AppLink
                          to="/account?tab=inbox"
                          className="flex items-center h-[52px] px-3 rounded-lg text-sm font-semibold text-foreground hover:bg-muted active:bg-muted/80"
                        >
                          <Icon name="message" size={18} className="mr-3 text-brand" />
                          <span>Inbox & vendor chats</span>
                        </AppLink>
                        <AppLink
                          to="/account?tab=wishlist"
                          className="flex items-center h-[52px] px-3 rounded-lg text-sm font-semibold text-foreground hover:bg-muted active:bg-muted/80"
                        >
                          <Icon name="heart" size={18} className="mr-3 text-brand" />
                          <span>Saved wishlist ({wishlist.length})</span>
                        </AppLink>
                        <AppLink
                          to="/account?tab=addresses"
                          className="flex items-center h-[52px] px-3 rounded-lg text-sm font-semibold text-foreground hover:bg-muted active:bg-muted/80"
                        >
                          <Icon name="map-pin" size={18} className="mr-3 text-muted-foreground" />
                          <span>Delivery addresses</span>
                        </AppLink>
                      </div>
                    </div>
                  )}

                  {role === 'vendor' && (
                    <div className="pt-2 border-t border-border">
                      <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-3 py-1">
                        Vendor Operations
                      </div>
                      <div className="space-y-0.5">
                        <AppLink
                          to="/vendor"
                          className="flex items-center h-[52px] px-3 rounded-lg text-sm font-semibold text-foreground hover:bg-muted"
                        >
                          <Icon name="layout" size={18} className="mr-3 text-brand" />
                          <span>Vendor dashboard</span>
                        </AppLink>
                        <AppLink
                          to="/vendor/orders"
                          className="flex items-center h-[52px] px-3 rounded-lg text-sm font-semibold text-foreground hover:bg-muted"
                        >
                          <Icon name="truck" size={18} className="mr-3 text-brand" />
                          <span>Order fulfillment & dispatch</span>
                        </AppLink>
                        <AppLink
                          to="/vendor/inventory"
                          className="flex items-center h-[52px] px-3 rounded-lg text-sm font-semibold text-foreground hover:bg-muted"
                        >
                          <Icon name="package" size={18} className="mr-3 text-brand" />
                          <span>Inventory management</span>
                        </AppLink>
                      </div>
                    </div>
                  )}

                  {role === 'admin' && (
                    <div className="pt-2 border-t border-border">
                      <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-3 py-1">
                        Platform Administration
                      </div>
                      <AppLink
                        to="/admin"
                        className="flex items-center h-[52px] px-3 rounded-lg text-sm font-semibold text-foreground hover:bg-muted"
                      >
                        <Icon name="shield" size={18} className="mr-3 text-brand" />
                        <span>Operations console</span>
                      </AppLink>
                    </div>
                  )}
                </div>

                {/* Bottom Auth / Logout Block with Safe Area */}
                <div className="p-4 border-t border-border bg-surface shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
                  {role === 'visitor' ? (
                    <div className="grid grid-cols-2 gap-2">
                      <AppLink to="/auth" className="w-full">
                        <Button variant="outline" className="w-full h-11 text-sm font-semibold">
                          Log in
                        </Button>
                      </AppLink>
                      <AppLink to="/auth?mode=signup" className="w-full">
                        <Button className="w-full h-11 text-sm font-semibold bg-brand hover:bg-brand-hover text-brand-foreground">
                          Sign up
                        </Button>
                      </AppLink>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      onClick={handleLogout}
                      className="w-full h-11 justify-center text-sm font-semibold text-danger hover:bg-danger/10 cursor-pointer"
                    >
                      <Icon name="power" size={16} className="mr-2" />
                      <span>Log out</span>
                    </Button>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Full-Screen Mobile Search Overlay */}
      {searchOverlayOpen && (
        <div className="fixed inset-0 z-sheet bg-surface flex flex-col h-dvh max-h-dvh overflow-hidden overscroll-contain animate-in fade-in-0 duration-150 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <div className="p-4 border-b border-border flex items-center gap-2">
            <form onSubmit={handleNavSearchSubmit} className="flex-1 relative flex items-center">
              <Icon name="search" size={18} className="absolute left-3 text-brand pointer-events-none" />
              <input
                ref={searchInputRef}
                type="search"
                value={navSearch}
                onChange={(e) => setNavSearch(e.target.value)}
                placeholder="Search sound, lights, tents, chairs..."
                className="w-full h-12 pl-10 pr-10 rounded-xl border border-border bg-background text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand"
                enterKeyHint="search"
              />
              {navSearch && (
                <button
                  type="button"
                  onClick={() => setNavSearch('')}
                  className="absolute right-3 min-w-[32px] min-h-[32px] inline-flex items-center justify-center text-muted-foreground hover:text-foreground"
                >
                  <Icon name="close" size={16} />
                </button>
              )}
            </form>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setSearchOverlayOpen(false)}
              className="min-h-[44px] px-3 text-sm font-medium"
            >
              Cancel
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Popular Equipment Categories
            </h3>
            <div className="flex flex-wrap gap-2">
              {MOCK_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    navigate(`/equipment?category=${cat.id}`)
                    setSearchOverlayOpen(false)
                  }}
                  className="min-h-[44px] px-4 py-2 rounded-full border border-border bg-background hover:border-brand text-xs font-medium text-foreground cursor-pointer"
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
