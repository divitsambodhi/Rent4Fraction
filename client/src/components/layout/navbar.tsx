import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { AppLink, useAppNavigate, useAppPathname } from '@/components/shared/app-link'
import { useAuth } from '@/providers/auth-provider'
import { useTheme } from '@/providers/theme-provider'
import { useCart } from '@/providers/cart-provider'
import { getNotifications } from '@/lib/api'
import { STRIP_CATEGORIES } from './category-strip'

export function Navbar() {
  const { role, user, logout } = useAuth()
  const { resolvedTheme, toggleTheme } = useTheme()
  const { cartCount } = useCart()
  const navigate = useAppNavigate()
  const pathname = useAppPathname()
  const [searchParams] = useSearchParams()

  const [mobileOpen, setMobileOpen] = useState(false)
  const [categoriesOpen, setCategoriesOpen] = useState(false)
  const [navSearch, setNavSearch] = useState('')
  const [customerUnreadCount, setCustomerUnreadCount] = useState(0)

  // Keep search input in sync if URL has ?q=
  useEffect(() => {
    const q = searchParams.get('q')
    if (q) {
      setNavSearch(q)
    } else {
      setNavSearch('')
    }
  }, [searchParams])

  useEffect(() => {
    if (role !== 'customer') {
      setCustomerUnreadCount(0)
      return
    }

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

  const handleNavSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const q = navSearch.trim()
    const nextParams = new URLSearchParams()
    if (q) nextParams.set('q', q)

    // Preserve chosen category and dates
    const category = searchParams.get('category')
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    if (category) nextParams.set('category', category)
    if (from) nextParams.set('from', from)
    if (to) nextParams.set('to', to)

    navigate(`/equipment${nextParams.toString() ? `?${nextParams.toString()}` : ''}`)
  }

  return (
    <header className="sticky top-0 z-navbar z-50 w-full bg-surface border-b border-border select-none">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        {/* DESKTOP NAVBAR (>= 1024px) */}
        <div className="hidden lg:flex items-center justify-between gap-6 h-16">
          {/* 1. Wordmark logo */}
          <AppLink
            to="/"
            className="flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-sm py-1 shrink-0"
            aria-label="Rent4Fraction home"
          >
            <span className="text-xl font-bold tracking-tight text-foreground">
              Rent4Fraction
            </span>
          </AppLink>

          {/* 2. Wide Search Bar (flexible, max ~600px, pill shape) */}
          <form
            onSubmit={handleNavSearchSubmit}
            role="search"
            aria-label="Site search"
            className="flex-1 max-w-[600px] relative"
          >
            <div className="flex items-center h-10 w-full rounded-full border border-border bg-background focus-within:ring-2 focus-within:ring-brand focus-within:border-brand transition-colors overflow-hidden px-3.5">
              <input
                type="search"
                value={navSearch}
                onChange={(e) => setNavSearch(e.target.value)}
                placeholder="Search for sound, lights, furniture and more"
                aria-label="Search equipment"
                style={{ outline: 'none', boxShadow: 'none' }}
                className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground border-none outline-none ring-0 shadow-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
              />
              <button
                type="submit"
                aria-label="Submit search"
                className="text-muted-foreground hover:text-brand transition-colors p-1 -mr-1 cursor-pointer outline-none focus:outline-none"
              >
                <Icon name="search" size={18} />
              </button>
            </div>
          </form>

          {/* 3. Actions */}
          <div className="flex items-center gap-5 shrink-0 text-sm font-medium">
            {/* VISITOR ACTIONS */}
            {role !== 'customer' && (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="font-semibold text-foreground hover:text-brand text-sm px-3 h-9"
                    >
                      Login
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 bg-surface border-border shadow-md rounded-sm z-popover">
                    <DropdownMenuItem asChild>
                      <AppLink to="/auth?mode=login" className="w-full cursor-pointer font-medium">
                        Log in
                      </AppLink>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <AppLink to="/auth?mode=signup" className="w-full cursor-pointer text-brand font-semibold">
                        New customer? Sign up
                      </AppLink>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <AppLink
                  to="/vendor"
                  className="text-foreground hover:text-brand font-medium transition-colors"
                >
                  Become a vendor
                </AppLink>
              </>
            )}

            {/* CUSTOMER ACCOUNT MENU */}
            {role === 'customer' && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label="Account menu"
                    className="flex items-center gap-2 text-foreground hover:text-brand font-semibold py-1.5 px-2 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-brand cursor-pointer relative"
                  >
                    <span>{user?.name || 'Account'}</span>
                    <Icon name="chevron-down" size={14} className="opacity-70" />
                    {customerUnreadCount > 0 && (
                      <span
                        className="size-2 rounded-full bg-brand absolute top-1 right-1"
                        aria-label={`${customerUnreadCount} unread notifications`}
                      />
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-surface border-border shadow-md rounded-sm z-popover">
                  <DropdownMenuLabel className="font-semibold text-foreground">
                    {user?.name || 'My Account'}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <AppLink to="/account?tab=bookings" className="w-full cursor-pointer">
                      My bookings
                    </AppLink>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <AppLink to="/account?tab=messages" className="w-full cursor-pointer">
                      Messages
                    </AppLink>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <AppLink to="/account?tab=notifications" className="w-full cursor-pointer flex items-center justify-between">
                      <span>Notifications</span>
                      {customerUnreadCount > 0 && (
                        <span className="text-[11px] font-bold px-1.5 py-0.2 rounded-full bg-brand text-white">
                          {customerUnreadCount}
                        </span>
                      )}
                    </AppLink>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <AppLink to="/account?tab=wishlist" className="w-full cursor-pointer">
                      Wishlist
                    </AppLink>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <AppLink to="/account?tab=addresses" className="w-full cursor-pointer">
                      Addresses
                    </AppLink>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <AppLink to="/account?tab=profile" className="w-full cursor-pointer">
                      Profile and security
                    </AppLink>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="text-danger focus:text-danger focus:bg-muted cursor-pointer"
                  >
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* CART (with label "Cart" and count badge) */}
            <AppLink
              to="/checkout"
              aria-label={`Cart with ${cartCount} items`}
              className="flex items-center gap-1.5 text-foreground hover:text-brand font-medium transition-colors relative py-1 px-1.5"
            >
              <div className="relative">
                <Icon name="cart" size={19} />
                {cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-4 h-4 px-1 rounded-full bg-brand text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                    {cartCount}
                  </span>
                )}
              </div>
              <span>Cart</span>
            </AppLink>

            {/* THEME TOGGLE BUTTON */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
              title={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
              className="flex items-center justify-center size-9 rounded-full text-foreground hover:text-brand hover:bg-muted/50 transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <Icon name={resolvedTheme === 'dark' ? 'sun' : 'moon'} size={18} />
            </button>
          </div>
        </div>

        {/* MOBILE NAVBAR (< 1024px, 2 rows, <= 104px total height) */}
        <div className="lg:hidden flex flex-col justify-center py-2 gap-1.5 min-h-[96px] max-h-[104px]">
          {/* Row 1: Menu button, Wordmark, Cart, Account button */}
          <div className="flex items-center justify-between gap-2 h-11">
            <div className="flex items-center gap-2">
              {/* Mobile Menu Sheet */}
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <button
                    type="button"
                    aria-label="Open navigation menu"
                    className="size-10 flex items-center justify-center text-foreground hover:text-brand rounded-sm cursor-pointer"
                  >
                    <Icon name="menu" size={22} />
                  </button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[280px] p-0 bg-surface border-r border-border">
                  <SheetHeader className="p-4 border-b border-border">
                    <SheetTitle className="font-bold text-lg text-foreground text-left">
                      Rent4Fraction
                    </SheetTitle>
                  </SheetHeader>
                  <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(100dvh-70px)]">
                    <nav className="space-y-1">
                      <AppLink
                        to="/equipment"
                        className="flex items-center px-3 py-2.5 rounded-sm text-sm font-medium text-foreground hover:bg-muted"
                      >
                        Browse equipment
                      </AppLink>

                      {/* Collapsed Categories list */}
                      <div>
                        <button
                          type="button"
                          onClick={() => setCategoriesOpen(!categoriesOpen)}
                          className="w-full flex items-center justify-between px-3 py-2.5 rounded-sm text-sm font-medium text-foreground hover:bg-muted"
                        >
                          <span>Categories</span>
                          <Icon
                            name={categoriesOpen ? 'chevron-up' : 'chevron-down'}
                            size={16}
                            className="text-muted-foreground"
                          />
                        </button>
                        {categoriesOpen && (
                          <div className="pl-4 pr-2 py-1 space-y-1 border-l-2 border-brand/30 ml-3">
                            {STRIP_CATEGORIES.map((c) => (
                              <AppLink
                                key={c.id}
                                to={`/equipment?category=${c.id}`}
                                className="block px-2.5 py-1.5 text-xs text-text-secondary hover:text-brand"
                              >
                                {c.name}
                              </AppLink>
                            ))}
                          </div>
                        )}
                      </div>

                      <AppLink
                        to="/help"
                        className="flex items-center px-3 py-2.5 rounded-sm text-sm font-medium text-foreground hover:bg-muted"
                      >
                        Help and support
                      </AppLink>

                      {role !== 'customer' && (
                        <AppLink
                          to="/vendor"
                          className="flex items-center px-3 py-2.5 rounded-sm text-sm font-semibold text-brand hover:bg-brand/10"
                        >
                          Become a vendor
                        </AppLink>
                      )}
                    </nav>

                    <div className="pt-3 border-t border-border space-y-2">
                      <button
                        type="button"
                        onClick={toggleTheme}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-sm text-xs font-medium text-text-secondary hover:bg-muted cursor-pointer"
                      >
                        <span>Appearance</span>
                        <div className="flex items-center gap-1.5">
                          <span className="capitalize">{resolvedTheme}</span>
                          <Icon name={resolvedTheme === 'dark' ? 'sun' : 'moon'} size={14} />
                        </div>
                      </button>

                      {role === 'customer' ? (
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="w-full text-left px-3 py-2 text-xs font-medium text-danger hover:bg-danger/10 rounded-sm cursor-pointer"
                        >
                          Log out
                        </button>
                      ) : (
                        <div className="pt-2 flex flex-col gap-2">
                          <AppLink to="/auth?mode=login">
                            <Button variant="outline" className="w-full h-9 text-xs font-medium">
                              Log in
                            </Button>
                          </AppLink>
                          <AppLink to="/auth?mode=signup">
                            <Button className="w-full h-9 text-xs font-bold bg-brand text-brand-foreground hover:bg-brand-hover">
                              Sign up
                            </Button>
                          </AppLink>
                        </div>
                      )}
                    </div>
                  </div>
                </SheetContent>
              </Sheet>

              {/* Wordmark logo */}
              <AppLink to="/" aria-label="Rent4Fraction home">
                <span className="text-lg font-bold tracking-tight text-foreground select-none">
                  Rent4Fraction
                </span>
              </AppLink>
            </div>

            {/* Right: Cart and Account */}
            <div className="flex items-center gap-1">
              <AppLink
                to="/checkout"
                aria-label={`Cart with ${cartCount} items`}
                className="size-10 flex items-center justify-center text-foreground hover:text-brand relative rounded-sm"
              >
                <Icon name="cart" size={20} />
                {cartCount > 0 && (
                  <span className="absolute top-1 right-1 size-4 rounded-full bg-brand text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                    {cartCount}
                  </span>
                )}
              </AppLink>

              {role === 'customer' ? (
                <AppLink
                  to="/account"
                  aria-label="My account"
                  className="size-10 flex items-center justify-center text-foreground hover:text-brand relative rounded-sm"
                >
                  <Icon name="user" size={20} />
                  {customerUnreadCount > 0 && (
                    <span className="size-2 rounded-full bg-brand absolute top-2 right-2" />
                  )}
                </AppLink>
              ) : (
                <AppLink to="/auth?mode=login">
                  <Button variant="ghost" size="sm" className="h-9 px-2 text-xs font-semibold">
                    Log in
                  </Button>
                </AppLink>
              )}
            </div>
          </div>

          {/* Row 2: Full-width search bar */}
          <form
            onSubmit={handleNavSearchSubmit}
            role="search"
            aria-label="Mobile site search"
            className="w-full"
          >
            <div className="flex items-center h-9 w-full rounded-full border border-border bg-background focus-within:ring-2 focus-within:ring-brand focus-within:border-brand px-3 transition-colors overflow-hidden">
              <input
                type="search"
                value={navSearch}
                onChange={(e) => setNavSearch(e.target.value)}
                placeholder="Search equipment..."
                aria-label="Search equipment"
                style={{ outline: 'none', boxShadow: 'none' }}
                className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground border-none outline-none ring-0 shadow-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
              />
              <button
                type="submit"
                aria-label="Submit search"
                className="text-muted-foreground hover:text-brand transition-colors p-1 cursor-pointer outline-none focus:outline-none"
              >
                <Icon name="search" size={16} />
              </button>
            </div>
          </form>
        </div>
      </div>
    </header>
  )
}
