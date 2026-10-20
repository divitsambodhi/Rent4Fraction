import { ArrowRight, Package, Star } from 'lucide-react'
import { AppLink } from '@/components/shared/app-link'
import { ProductImage } from '@/components/shared/product-image'
import type { TopEquipmentItem } from '@/types/vendor'
import { cn } from '@/lib/utils'

interface TopEquipmentCardProps {
  items: TopEquipmentItem[]
  title?: string
  subtitle?: string
  className?: string
}

export function TopEquipmentCard({
  items,
  title = 'Top equipment',
  subtitle = 'Highest earning listings in this period',
  className,
}: TopEquipmentCardProps) {
  return (
    <div className={cn('rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-xs flex flex-col', className)}>
      <div className="flex items-center justify-between pb-4 border-b border-border/60">
        <div>
          <h2 className="font-serif text-lg font-bold text-foreground">{title}</h2>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>

        <AppLink
          to="/vendor/inventory"
          className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:text-brand-hover transition-colors"
        >
          <span>Manage</span>
          <ArrowRight className="size-3.5" />
        </AppLink>
      </div>

      <div className="mt-4 flex-1">
        {items.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground text-sm">
            <Package className="size-8 mx-auto mb-2 opacity-40" />
            <p>No equipment performance data yet</p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {items.slice(0, 5).map((item) => (
              <div
                key={item.id}
                className="py-3 flex items-center justify-between gap-3 group hover:bg-muted/30 px-2 rounded-xl transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-12 rounded-lg overflow-hidden border border-border shrink-0">
                    <ProductImage
                      src={item.image}
                      alt={item.name}
                      category={item.category}
                      aspectRatio="1/1"
                    />
                  </div>

                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-foreground truncate group-hover:text-brand transition-colors">
                      {item.name}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <span>{item.rentals_count} rentals</span>
                      <span>·</span>
                      <span className="inline-flex items-center gap-0.5 text-foreground font-medium">
                        <Star className="size-3 text-amber-500 fill-amber-500" />
                        {item.rating.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-sm font-bold text-foreground tabular-nums">
                    ₹{item.earnings.toLocaleString('en-IN')}
                  </div>
                  <AppLink
                    to={`/vendor/inventory?equipment=${item.id}`}
                    className="text-[11px] font-medium text-brand hover:underline"
                  >
                    Manage
                  </AppLink>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
