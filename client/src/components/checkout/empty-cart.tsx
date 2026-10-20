import { ShoppingBag, Sparkles, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AppLink } from '@/components/shared/app-link'
import { ProductImage } from '@/components/shared/product-image'
import { formatINR } from '@/lib/format'
import { MOCK_EQUIPMENT } from '@/lib/api/mock-data'
import { loadAccountState } from '@/lib/api/account-store'

interface EmptyCartProps {
  onLoadDemoItems?: () => void
}

export function EmptyCart({ onLoadDemoItems }: EmptyCartProps) {
  const wishlistIds: string[] = typeof window !== 'undefined' ? loadAccountState().wishlistIds : []
  const wishlistItems = MOCK_EQUIPMENT.filter((eq) => wishlistIds.includes(eq.equipment_id)).slice(0, 4)
  const itemsToShow = wishlistItems.length > 0 ? wishlistItems : MOCK_EQUIPMENT.slice(0, 4)
  const isWishlist = wishlistItems.length > 0

  return (
    <div className="space-y-10 py-6">
      {/* Central Empty State Card */}
      <div className="flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-[20px] border border-dashed border-border bg-surface/60 max-w-xl mx-auto space-y-4">
        <div className="size-16 rounded-full bg-brand/10 border border-brand/20 text-brand flex items-center justify-center shadow-2xs">
          <ShoppingBag className="size-8 stroke-[1.75]" />
        </div>

        <div className="space-y-1.5">
          <h2 className="font-serif text-2xl font-bold text-foreground">Your cart is empty</h2>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
            You haven't reserved any equipment yet. Browse sound, stage lights, and seating to
            build your event package.
          </p>
        </div>

        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          <AppLink to="/equipment">
            <Button className="h-11 px-6 rounded-[12px] font-semibold gap-2">
              <span>Browse equipment</span>
              <ArrowRight className="size-4" />
            </Button>
          </AppLink>

          {onLoadDemoItems && (
            <Button
              type="button"
              variant="outline"
              onClick={onLoadDemoItems}
              className="h-11 px-5 rounded-[12px] text-xs font-semibold gap-1.5 border-dashed"
            >
              <Sparkles className="size-4 text-brand" />
              <span>Load demo cart (Dev)</span>
            </Button>
          )}
        </div>
      </div>

      {/* Suggested / Saved for Later Items */}
      <div className="space-y-4 max-w-3xl mx-auto">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-base font-bold text-foreground">
            {isWishlist ? 'From your wishlist' : 'Popular event equipment to consider'}
          </h3>
          <AppLink
            to={isWishlist ? '/account?tab=wishlist' : '/equipment'}
            className="text-xs font-semibold text-brand hover:underline"
          >
            {isWishlist ? 'View full wishlist' : 'View all equipment'}
          </AppLink>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {itemsToShow.map((item) => (
            <AppLink
              key={item.equipment_id}
              to={`/equipment/${item.equipment_id}`}
              className="p-3 rounded-[14px] bg-surface border border-border hover:border-brand/40 transition-all group flex flex-col justify-between shadow-2xs"
            >
              <div className="space-y-2.5">
                <div className="aspect-4/3 rounded-[10px] overflow-hidden border border-border/70">
                  <ProductImage
                    src={item.primary_image_url}
                    alt={item.name}
                    category={item.category_name}
                    aspectRatio="4/3"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                    {item.category_name}
                  </span>
                  <h4 className="font-serif font-bold text-xs text-foreground group-hover:text-brand transition-colors line-clamp-1">
                    {item.name}
                  </h4>
                </div>
              </div>

              <div className="pt-2 mt-2 border-t border-border/70 flex items-center justify-between text-xs">
                <span className="font-bold text-foreground tabular-nums">
                  {formatINR(item.price_per_day)}
                  <span className="text-[10px] text-muted-foreground font-normal">/day</span>
                </span>
                <span className="text-[11px] font-semibold text-brand group-hover:translate-x-0.5 transition-transform">
                  View →
                </span>
              </div>
            </AppLink>
          ))}
        </div>
      </div>
    </div>
  )
}
