import { AlertTriangle, ArrowRight, CheckCircle2, LucideIcon } from 'lucide-react'
import { AppLink } from '@/components/shared/app-link'
import { cn } from '@/lib/utils'

export interface AttentionItem {
  id: string
  label: string
  href: string
  count: number
  icon: LucideIcon
  tone?: 'warning' | 'danger' | 'info' | 'neutral'
}

interface AttentionListProps {
  items: AttentionItem[]
  title?: string
  subtitle?: string
  emptyMessage?: string
  className?: string
}

export function AttentionList({
  items,
  title = 'Needs your attention',
  subtitle = 'Prioritized actions requiring response',
  emptyMessage = "You're all caught up! No urgent tasks waiting.",
  className,
}: AttentionListProps) {
  // Only display items that have count > 0
  const activeItems = items.filter((item) => item.count > 0)

  return (
    <div className={cn('rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-xs flex flex-col', className)}>
      <div className="flex items-center justify-between pb-4 border-b border-border/60">
        <div>
          <h2 className="font-serif text-lg font-bold text-foreground">{title}</h2>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <div className="size-8 rounded-lg bg-warning/15 text-warning flex items-center justify-center shrink-0">
          <AlertTriangle className="size-4" />
        </div>
      </div>

      <div className="pt-3 flex-1 flex flex-col justify-center">
        {activeItems.length === 0 ? (
          <div className="py-8 flex flex-col items-center justify-center text-center text-muted-foreground space-y-2">
            <CheckCircle2 className="size-8 text-success/80" />
            <p className="text-sm font-medium text-foreground">{emptyMessage}</p>
            <p className="text-xs text-muted-foreground">All orders, returns, and reviews are handled.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {activeItems.map((item) => {
              const Icon = item.icon
              const toneClasses =
                item.tone === 'danger'
                  ? 'bg-danger/10 text-danger border-danger/20'
                  : item.tone === 'warning'
                  ? 'bg-warning/10 text-warning border-warning/20'
                  : 'bg-muted text-muted-foreground border-border'

              return (
                <AppLink
                  key={item.id}
                  to={item.href}
                  className="flex items-center justify-between py-3.5 px-2 hover:bg-muted/40 rounded-xl transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn('size-8 rounded-lg flex items-center justify-center shrink-0 border', toneClasses)}>
                      <Icon className="size-4" />
                    </div>
                    <div className="truncate">
                      <span className="text-sm font-medium text-foreground group-hover:text-brand transition-colors">
                        {item.label}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-brand/10 text-brand tabular-nums">
                      {item.count}
                    </span>
                    <ArrowRight className="size-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                  </div>
                </AppLink>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
