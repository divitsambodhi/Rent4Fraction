import { formatINR } from '@/lib/format'

/**
 * HowItWorks: Numbered steps as plain text on the left and a real, labelled
 * "Sample booking" component on the right showing one booking split across two vendors
 * with delivery, deposit, and total lines. No icon circles, no decorative connectors.
 */
export function HowItWorks() {
  const steps = [
    {
      num: '1',
      title: 'Choose equipment and event dates',
      description:
        'Browse sound, stage lights, seating, and decor. Select your event dates to view real-time availability and per-day pricing.',
    },
    {
      num: '2',
      title: 'Combine items from multiple vendors',
      description:
        'Add items from different suppliers into one cart. The platform splits delivery and rental schedules automatically.',
    },
    {
      num: '3',
      title: 'Review clear pricing and confirm',
      description:
        'Check itemized daily rates, vendor delivery charges, and refundable security deposits before completing checkout.',
    },
    {
      num: '4',
      title: 'Receive on-site and return after event',
      description:
        'Vendors deliver equipment to your event location. After post-event return inspection, deposits are released to your original payment method.',
    },
  ]

  return (
    <section id="how-it-works" className="py-12 md:py-16 border-t border-border">
      <div className="mb-8">
        <h2 className="font-serif text-2xl md:text-3xl font-semibold tracking-[-0.02em] text-foreground">
          How booking works
        </h2>
        <p className="text-body-sm text-text-secondary mt-1">
          Rent equipment from several local vendors in a single checkout.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Plain numbered steps */}
        <div className="lg:col-span-7 space-y-6">
          {steps.map((step) => (
            <div key={step.num} className="flex items-start gap-4">
              <span className="flex items-center justify-center size-7 rounded-sm border border-border bg-surface text-label-md font-bold text-brand shrink-0">
                {step.num}
              </span>
              <div>
                <h3 className="text-body-md font-semibold text-foreground">
                  {step.title}
                </h3>
                <p className="text-body-sm text-text-secondary mt-1">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Right: Labelled Sample Booking component */}
        <div className="lg:col-span-5 rounded-md border border-border bg-surface p-5">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <span className="text-label-md font-bold text-foreground">
              Sample booking breakdown
            </span>
            <span className="text-[11px] font-medium text-text-secondary bg-muted px-2 py-0.5 rounded-sm">
              Example order
            </span>
          </div>

          <div className="py-3 border-b border-border space-y-3">
            <div>
              <div className="text-label-sm font-semibold text-foreground">
                Vendor 1: SoundCraft Pro
              </div>
              <div className="flex justify-between text-body-sm text-text-secondary mt-1">
                <span>JBL Dual 15" PA Speaker Set (2 days)</span>
                <span className="tabular-nums text-foreground">{formatINR(7000)}</span>
              </div>
              <div className="flex justify-between text-body-sm text-text-secondary">
                <span>Shure Wireless Mic Kit (2 days)</span>
                <span className="tabular-nums text-foreground">{formatINR(2400)}</span>
              </div>
              <div className="flex justify-between text-label-sm text-text-secondary mt-0.5">
                <span>Delivery and setup</span>
                <span className="tabular-nums text-foreground">{formatINR(1200)}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-border/60">
              <div className="text-label-sm font-semibold text-foreground">
                Vendor 2: Royal Decor & Lighting
              </div>
              <div className="flex justify-between text-body-sm text-text-secondary mt-1">
                <span>Warm White Fairy Light Canopy (2 days)</span>
                <span className="tabular-nums text-foreground">{formatINR(4000)}</span>
              </div>
              <div className="flex justify-between text-label-sm text-text-secondary mt-0.5">
                <span>Delivery and setup</span>
                <span className="tabular-nums text-foreground">{formatINR(800)}</span>
              </div>
            </div>
          </div>

          <div className="pt-3 space-y-1.5 text-body-sm">
            <div className="flex justify-between text-text-secondary">
              <span>Equipment subtotal</span>
              <span className="tabular-nums text-foreground">{formatINR(13400)}</span>
            </div>
            <div className="flex justify-between text-text-secondary">
              <span>Combined vendor delivery</span>
              <span className="tabular-nums text-foreground">{formatINR(2000)}</span>
            </div>
            <div className="flex justify-between text-text-secondary">
              <span>Refundable security deposit</span>
              <span className="tabular-nums text-foreground">{formatINR(6000)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-border font-semibold text-body-md text-foreground">
              <span>Total payable</span>
              <span className="tabular-nums text-brand">{formatINR(21400)}</span>
            </div>
          </div>

          <p className="text-[11px] text-text-secondary mt-4 leading-normal">
            Security deposits are held until equipment return and condition verification.
          </p>
        </div>
      </div>
    </section>
  )
}
