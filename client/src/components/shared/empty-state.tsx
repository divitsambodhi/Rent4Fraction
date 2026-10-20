import React from 'react'
import { PackageOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AppLink } from './app-link'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description: string
  actionLabel?: string
  actionHref?: string
  onAction?: () => void
  className?: string
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-[16px] border border-dashed border-border bg-surface/50',
        className,
      )}
    >
      <div className="size-14 rounded-full bg-brand/10 text-brand flex items-center justify-center mb-4">
        {icon || <PackageOpen className="size-7" />}
      </div>
      <h3 className="font-serif text-xl sm:text-2xl font-semibold text-foreground mb-2">
        {title}
      </h3>
      <p className="text-sm md:text-base text-muted-foreground max-w-md mb-6 leading-relaxed">
        {description}
      </p>

      {actionLabel && (
        actionHref ? (
          <AppLink to={actionHref}>
            <Button>{actionLabel}</Button>
          </AppLink>
        ) : (
          <Button onClick={onAction}>{actionLabel}</Button>
        )
      )}
    </div>
  )
}
