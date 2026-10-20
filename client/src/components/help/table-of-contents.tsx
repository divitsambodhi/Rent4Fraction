import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface TocSection {
  id: string
  title: string
}

interface TableOfContentsProps {
  sections: TocSection[]
  className?: string
}

export function TableOfContents({ sections, className }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>(sections[0]?.id || '')

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 120

      for (let i = sections.length - 1; i >= 0; i--) {
        const sec = sections[i]
        const el = document.getElementById(sec.id)
        if (el && el.offsetTop <= scrollPosition) {
          setActiveId(sec.id)
          break
        }
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [sections])

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id)
    if (el) {
      const offset = el.getBoundingClientRect().top + window.scrollY - 90
      window.scrollTo({ top: offset, behavior: 'smooth' })
    }
  }

  if (sections.length === 0) return null

  return (
    <nav
      aria-label="Table of contents"
      className={cn('sticky top-24 space-y-2 text-xs', className)}
    >
      <span className="font-bold uppercase tracking-wider text-muted-foreground text-[10px] block mb-2">
        Contents
      </span>
      <ul className="space-y-1 border-l-2 border-border pl-2 list-none m-0 p-0">
        {sections.map((sec) => {
          const isActive = activeId === sec.id

          return (
            <li key={sec.id}>
              <button
                type="button"
                onClick={() => scrollToSection(sec.id)}
                className={cn(
                  'block w-full text-left py-1 text-xs transition-colors cursor-pointer truncate',
                  isActive
                    ? 'text-brand font-semibold -ml-[10px] pl-[8px] border-l-2 border-brand'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {sec.title}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
