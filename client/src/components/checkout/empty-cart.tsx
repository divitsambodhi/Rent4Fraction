import { ShoppingBag, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AppLink } from '@/components/shared/app-link'

export function EmptyCart() {
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
        </div>
      </div>
    </div>
  )
}
