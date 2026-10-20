import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface IncludedListProps {
  items: string[]
  className?: string
}

export function IncludedList({ items, className }: IncludedListProps) {
  if (!items || items.length === 0) return null

  return (
    <div className={cn('space-y-3', className)}>
      <h3 className="font-serif text-base sm:text-lg font-semibold text-foreground">
        What&apos;s included in this rental
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {items.map((item) => (
          <div
            key={item}
            className="flex items-start gap-2.5 p-2.5 rounded-[10px] bg-muted/40 border border-border/60 text-xs sm:text-sm text-foreground/90 leading-snug"
          >
            <div className="size-5 rounded-full bg-brand/10 text-brand flex items-center justify-center shrink-0 mt-0.5">
              <Check className="size-3.5 stroke-[2.5]" />
            </div>
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
