import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AppLink, useAppPathname } from '@/components/shared/app-link'
import { Icon, type IconName } from '@/components/ui/icon'
import { cn } from '@/lib/utils'

export interface CategoryStripItem {
  id: string
  name: string
  icon: IconName
}

export const STRIP_CATEGORIES: CategoryStripItem[] = [
  { id: '1', name: 'Furniture & Seating', icon: 'armchair' },
  { id: '2', name: 'Tents & Canopies', icon: 'tent' },
  { id: '3', name: 'Decor & Backdrops', icon: 'sparkles' },
  { id: '4', name: 'Sound & DJ Equipment', icon: 'speaker' },
  { id: '5', name: 'Lighting & Effects', icon: 'bulb' },
  { id: '6', name: 'Screens & Visuals', icon: 'layout' },
  { id: '7', name: 'Catering & Dining', icon: 'table' },
  { id: '8', name: 'Photography & Video', icon: 'camera' },
  { id: '9', name: 'Power & Climate', icon: 'power' },
  { id: '10', name: 'Flooring & Carpets', icon: 'box' },
  { id: '11', name: 'Event Accessories', icon: 'shield' },
  { id: '12', name: 'Tableware & Serving', icon: 'table' },
  { id: '13', name: 'Games & Fun', icon: 'disc' },
  { id: '14', name: 'Safety & Security', icon: 'shield-check' },
  { id: '15', name: 'Transport & Logistics', icon: 'truck' },
  { id: '16', name: 'Others', icon: 'box' },
]

interface CategoryStripProps {
  className?: string
}

/**
 * CategoryStrip: slim horizontal strip directly below navbar
 * 16 real categories, horizontally scrollable with snap on phones and desktop arrows.
 */
export function CategoryStrip({ className }: CategoryStripProps) {
  const pathname = useAppPathname()
  const [searchParams] = useSearchParams()
  const navRef = useRef<HTMLElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const currentCategory = pathname === '/equipment' ? searchParams.get('category') : null

  const checkScroll = useCallback(() => {
    const el = navRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 4)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }, [])

  useEffect(() => {
    const el = navRef.current
    if (!el) return
    checkScroll()
    el.addEventListener('scroll', checkScroll, { passive: true })
    window.addEventListener('resize', checkScroll)
    return () => {
      el.removeEventListener('scroll', checkScroll)
      window.removeEventListener('resize', checkScroll)
    }
  }, [checkScroll])

  const maskStyle = useMemo(() => {
    if (!canScrollLeft && !canScrollRight) return undefined
    if (canScrollLeft && canScrollRight) {
      return {
        WebkitMaskImage: 'linear-gradient(to right, transparent, black 24px, black calc(100% - 24px), transparent)',
        maskImage: 'linear-gradient(to right, transparent, black 24px, black calc(100% - 24px), transparent)',
      }
    }
    if (canScrollLeft) {
      return {
        WebkitMaskImage: 'linear-gradient(to right, transparent, black 24px, black 100%)',
        maskImage: 'linear-gradient(to right, transparent, black 24px, black 100%)',
      }
    }
    return {
      WebkitMaskImage: 'linear-gradient(to right, black calc(100% - 24px), transparent)',
      maskImage: 'linear-gradient(to right, black calc(100% - 24px), transparent)',
    }
  }, [canScrollLeft, canScrollRight])

  const scrollBy = (offset: number) => {
    navRef.current?.scrollBy({ left: offset, behavior: 'smooth' })
  }

  return (
    <div className={cn('relative w-full border-b border-border bg-surface', className)}>
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => scrollBy(-200)}
          aria-label="Scroll categories left"
          className="absolute left-1 top-1/2 -translate-y-1/2 z-10 hidden sm:flex h-7 w-7 items-center justify-center rounded-full bg-surface/90 shadow border border-border text-foreground hover:bg-surface-subtle"
        >
          <Icon name="chevron-left" size={16} />
        </button>
      )}

      <nav
        ref={navRef}
        style={maskStyle}
        aria-label="Categories"
        className="flex items-center gap-2 overflow-x-auto px-4 py-2 text-label-sm no-scrollbar scroll-smooth"
      >
        <AppLink
          to="/equipment"
          className={cn(
            'flex flex-col items-center gap-1 shrink-0 rounded-lg px-3 py-1.5 transition-colors',
            !currentCategory
              ? 'text-brand font-semibold'
              : 'text-text-secondary hover:text-foreground hover:bg-surface-subtle',
          )}
        >
          <Icon name="box" size={18} />
          <span>All</span>
        </AppLink>

        {STRIP_CATEGORIES.map((cat) => {
          const isActive = currentCategory === cat.id || currentCategory === cat.name
          return (
            <AppLink
              key={cat.id}
              to={`/equipment?category=${cat.id}`}
              className={cn(
                'flex flex-col items-center gap-1 shrink-0 rounded-lg px-3 py-1.5 transition-colors whitespace-nowrap',
                isActive
                  ? 'text-brand font-semibold'
                  : 'text-text-secondary hover:text-foreground hover:bg-surface-subtle',
              )}
            >
              <Icon name={cat.icon} size={18} />
              <span>{cat.name}</span>
            </AppLink>
          )
        })}
      </nav>

      {canScrollRight && (
        <button
          type="button"
          onClick={() => scrollBy(200)}
          aria-label="Scroll categories right"
          className="absolute right-1 top-1/2 -translate-y-1/2 z-10 hidden sm:flex h-7 w-7 items-center justify-center rounded-full bg-surface/90 shadow border border-border text-foreground hover:bg-surface-subtle"
        >
          <Icon name="chevron-right" size={16} />
        </button>
      )}
    </div>
  )
}
