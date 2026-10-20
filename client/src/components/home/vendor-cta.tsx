import { ArrowRight, Building, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AppLink } from '@/components/shared/app-link'
import { useAuth } from '@/providers/auth-provider'

export function VendorCTA() {
  const { role } = useAuth()

  // Hidden for vendor and admin roles per specification
  if (role === 'vendor' || role === 'admin') {
    return null
  }

  return (
    <section className="py-12 sm:py-16">
      <div className="relative overflow-hidden rounded-[24px] sm:rounded-[32px] bg-brand text-white p-8 sm:p-12 lg:p-16 border border-brand/20">
        {/* Subtle decorative vector watermark */}
        <div
          className="absolute -right-8 -bottom-12 font-serif text-[180px] font-bold text-white/5 select-none pointer-events-none leading-none"
          aria-hidden="true"
        >
          R4
        </div>

        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-white text-xs font-medium">
            <Building className="size-3.5" />
            <span>For Event Rental Businesses & Suppliers</span>
          </div>

          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-white leading-[1.1]">
            Turn idle event inventory into steady{' '}
            <em className="font-serif italic font-normal text-white/90">
              revenue.
            </em>
          </h2>

          <p className="text-white/80 text-sm sm:text-base leading-relaxed max-w-xl">
            List sound systems, stage lighting rigs, luxury banquet chairs, and canopies.
            Enjoy prompt payouts, automated escrow protection, and direct access to event
            producers.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-4">
            <AppLink to="/vendor">
              <Button
                size="lg"
                className="bg-white text-brand hover:bg-white/90 font-semibold shadow-md h-12 px-6"
              >
                <span>Partner with Rent4Fraction</span>
                <ArrowRight className="size-4 ml-1" />
              </Button>
            </AppLink>

            <div className="flex items-center gap-2 text-xs text-white/90">
              <ShieldCheck className="size-4" />
              <span>Zero upfront listing fees • Verified business payout</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
