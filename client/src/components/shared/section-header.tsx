import { ArrowRight } from 'lucide-react'
import { AppLink } from './app-link'
import { cn } from '@/lib/utils'

interface SectionHeaderProps {
  eyebrow?: string
  title: string
  accentWord?: string
  subtitle?: string
  actionHref?: string
  actionText?: string
  className?: string
  align?: 'left' | 'center'
}

/**
 * SectionHeader: Editorial heading with one italic accent word per headline.
 */
export function SectionHeader({
  eyebrow,
  title,
  accentWord,
  subtitle,
  actionHref,
  actionText,
  className,
  align = 'left',
}: SectionHeaderProps) {
  // If accentWord is supplied and part of title, style it with font-serif italic text-brand
  const renderTitle = () => {
    if (!accentWord || !title.includes(accentWord)) {
      return title
    }
    const parts = title.split(accentWord)
    return (
      <>
        {parts[0]}
        <em className="font-serif italic font-normal text-brand not-italic:font-bold">
          {accentWord}
        </em>
        {parts.slice(1).join(accentWord)}
      </>
    )
  }

  return (
    <div
      className={cn(
        'flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 md:mb-12',
        align === 'center' && 'text-center md:flex-col md:items-center',
        className,
      )}
    >
      <div className={cn('max-w-2xl', align === 'center' && 'mx-auto')}>
        {eyebrow && (
          <p className="text-xs uppercase tracking-[0.18em] font-bold text-brand mb-2 flex items-center gap-1.5">
            {eyebrow}
          </p>
        )}
        <h2 className="font-serif text-3xl sm:text-4xl lg:text-[40px] font-semibold text-foreground tracking-tight leading-[1.12]">
          {renderTitle()}
        </h2>
        {subtitle && (
          <p className="text-sm md:text-base text-muted-foreground mt-2.5 leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>

      {actionHref && actionText && (
        <AppLink
          to={actionHref}
          className="group inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:text-brand-hover transition-colors shrink-0"
        >
          <span>{actionText}</span>
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
        </AppLink>
      )}
    </div>
  )
}
