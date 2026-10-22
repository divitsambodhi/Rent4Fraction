import { Button } from '@/components/ui/button'
import { AppLink } from '@/components/shared/app-link'
import { useAuth } from '@/providers/auth-provider'

/**
 * VendorCTA: One flat wine block with plain copy per section 5.
 * Hidden for vendor and admin roles.
 */
export function VendorCTA() {
  const { role } = useAuth()

  if (role === 'vendor' || role === 'admin') {
    return null
  }

  return (
    <section className="py-10 md:py-14">
      <div className="rounded-md bg-brand text-white p-8 md:p-12">
        <div className="max-w-2xl space-y-3">
          <h2 className="font-serif text-2xl md:text-3xl font-semibold tracking-[-0.02em] text-white">
            List your equipment on Rent4Fraction
          </h2>

          <p className="text-body-md text-white/90">
            Equipment owners receive verified rental requests, track bookings, and manage payouts directly through the vendor portal.
          </p>

          <div className="pt-3">
            <AppLink to="/vendor">
              <Button
                variant="secondary"
                size="default"
                className="bg-white text-brand hover:bg-white/90 font-bold border-transparent"
              >
                Apply as a vendor
              </Button>
            </AppLink>
          </div>
        </div>
      </div>
    </section>
  )
}
