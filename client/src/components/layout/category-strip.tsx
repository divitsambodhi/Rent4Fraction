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
  { id: '1', name: 'Speakers', icon: 'speaker' },
  { id: '2', name: 'Microphones', icon: 'microphone' },
  { id: '3', name: 'DJ equipment', icon: 'disc' },
  { id: '4', name: 'Stage lights', icon: 'sparkles' },
  { id: '5', name: 'Fairy lights', icon: 'bulb' },
  { id: '6', name: 'Chairs', icon: 'armchair' },
  { id: '7', name: 'Tables', icon: 'table' },
  { id: '8', name: 'Tents and decor', icon: 'tent' },
]

interface CategoryStripProps {
  className?: string
}

/**
 * CategoryStrip: Flipkart-inspired slim horizontal strip directly below navbar
 * (also shown at top of Catalog page, not sticky).
 * 8 real categories, 24px icon above 13px label, ~64px total height.
 * Evenly spaced on desktop, horizontally scrollable with snap on phones.
 * Active category has a 2px wine underline.
 * P-021: Scroll-fade gradient mask when content overflows horizontally.
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

  return (
    <div
      className={cn(
        'w-full bg-surface border-b border-border/80 select-none overflow-hidden',
        className,
      )}
    >
      <div className="max-w-7xl mx-auto px-2 sm:px-6">
        <nav
          ref={navRef}
          aria-label="Categories"
          style={maskStyle}
          className="flex items-center justify-between overflow-x-auto scrollbar-none snap-x snap-mandatory py-1 sm:py-0 min-h-[64px]"
        >
          {STRIP_CATEGORIES.map((cat) => {
            const isActive = currentCategory === cat.id

            return (
              <AppLink
                key={cat.id}
                to={`/equipment?category=${cat.id}`}
                className={cn(
                  'relative flex flex-col items-center justify-center shrink-0 min-w-[76px] sm:min-w-0 sm:flex-1 h-16 px-2 group snap-start transition-colors',
                  isActive
                    ? 'text-brand font-semibold'
                    : 'text-foreground hover:text-brand font-medium',
                )}
              >
                <div className="size-6 flex items-center justify-center mb-1">
                  <Icon
                    name={cat.icon}
                    size={24}
                    stroke={1.6}
                    className={cn(
                      'transition-colors',
                      isActive ? 'text-brand' : 'text-foreground group-hover:text-brand',
                    )}
                  />
                </div>
                <span className="text-[13px] leading-tight text-center truncate max-w-full">
                  {cat.name}
                </span>

                {/* 2px wine underline for active state on Catalog */}
                {isActive && (
                  <span
                    className="absolute bottom-0 left-2 right-2 h-[2px] bg-brand rounded-full"
                    aria-hidden="true"
                  />
                )}
              </AppLink>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
