import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface SectionNavProps {
  className?: string
}

const SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'specifications', label: 'Specifications' },
  { id: 'availability', label: 'Availability' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'vendor', label: 'Vendor' },
]

export function SectionNav({ className }: SectionNavProps) {
  const [activeSection, setActiveSection] = useState('overview')

  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY + 140

      for (let i = SECTIONS.length - 1; i >= 0; i--) {
        const el = document.getElementById(SECTIONS[i].id)
        if (el) {
          const top = el.offsetTop
          if (scrollPos >= top) {
            setActiveSection(SECTIONS[i].id)
            break
          }
        }
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault()
    const target = document.getElementById(id)
    if (target) {
      const targetPos = target.getBoundingClientRect().top + window.scrollY - 120
      window.scrollTo({
        top: targetPos,
        behavior: 'smooth',
      })
      setActiveSection(id)
    }
  }

  return (
    <nav
      className={cn(
        'sticky top-16 z-30 h-12 bg-surface/95 backdrop-blur-md border-b border-border flex items-center px-2 overflow-x-auto scrollbar-none',
        className,
      )}
      aria-label="Section navigation"
    >
      <div className="flex items-center gap-1 sm:gap-2 min-w-max">
        {SECTIONS.map((sec) => {
          const isActive = activeSection === sec.id
          return (
            <a
              key={sec.id}
              href={`#${sec.id}`}
              onClick={(e) => handleNavClick(e, sec.id)}
              className={cn(
                'px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all cursor-pointer whitespace-nowrap',
                isActive
                  ? 'bg-brand text-white shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
              )}
              aria-current={isActive ? 'location' : undefined}
            >
              {sec.label}
            </a>
          )
        })}
      </div>
    </nav>
  )
}
