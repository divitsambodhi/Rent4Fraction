import { ChevronRight } from 'lucide-react'
import { AppLink } from './app-link'
import { cn } from '@/lib/utils'

export interface BreadcrumbItem {
  label: string
  href?: string
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[]
  className?: string
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  if (!items.length) return null

  return (
    <nav
      aria-label="Breadcrumbs"
      className={cn(
        'flex items-center gap-1.5 text-xs text-muted-foreground overflow-x-auto whitespace-nowrap scrollbar-none py-1',
        className,
      )}
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1

        return (
          <span key={`${item.label}-${index}`} className="flex items-center gap-1.5">
            {index > 0 && (
              <ChevronRight className="size-3.5 text-muted-foreground/60 shrink-0 select-none" />
            )}
            {item.href && !isLast ? (
              <AppLink
                to={item.href}
                className="hover:text-brand transition-colors text-muted-foreground"
              >
                {item.label}
              </AppLink>
            ) : (
              <span
                aria-current={isLast ? 'page' : undefined}
                className={cn('font-semibold text-foreground truncate max-w-[200px] sm:max-w-xs')}
              >
                {item.label}
              </span>
            )}
          </span>
        )
      })}
    </nav>
  )
}
