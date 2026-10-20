import { ArrowRight, UserCheck, Wrench } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AppLink } from '@/components/shared/app-link'

export function HowItWorksTab() {
  const customerSteps = [
    {
      title: 'Search & pick dates',
      description: 'Find production audio, lighting, and stage gear. Check real-time availability for your event dates.',
    },
    {
      title: 'Book from one or many vendors',
      description: 'Combine equipment from different specialists in a single booking with transparent pricing and security deposits.',
    },
    {
      title: 'Choose delivery or pickup',
      description: 'Opt for venue delivery with setup support, or collect equipment directly from the vendor warehouse.',
    },
    {
      title: 'Return and inspection',
      description: 'Hand over equipment at the agreed time. Once inspected by the vendor, your security deposit is released.',
    },
    {
      title: 'Leave a verified review',
      description: 'Share feedback on equipment performance and vendor service to help other event organizers.',
    },
  ]

  const vendorSteps = [
    {
      title: 'Apply and get approved',
      description: 'Submit your business registration and warehouse details. Our onboarding team reviews partner credentials.',
    },
    {
      title: 'List your equipment',
      description: 'Set daily rental rates, security deposits, specifications, and upload high-resolution gear photography.',
    },
    {
      title: 'Accept orders & hand over',
      description: 'Receive booking requests, coordinate delivery schedules, and hand over equipment safely with proof of delivery.',
    },
    {
      title: 'Inspect returns & resolve reports',
      description: 'Check returned items. If issues arise, file an inspection report with transparent evidence and resolution.',
    },
    {
      title: 'Receive settled payouts',
      description: 'Earnings net of platform commission are calculated and transferred directly to your registered bank account.',
    },
  ]

  return (
    <div className="space-y-10 max-w-4xl">
      <div className="space-y-2">
        <h2 className="font-serif text-2xl sm:text-3xl font-bold text-foreground">
          How Rent4Fraction Works
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Clear, step-by-step guidance for event organizers renting gear and vendors listing their inventory.
        </p>
      </div>

      {/* Two-Column Process: For Customers & For Vendors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Customer Steps */}
        <div className="p-6 rounded-2xl border border-border bg-surface shadow-xs space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-border">
            <div className="size-8 rounded-lg bg-brand/10 text-brand flex items-center justify-center">
              <UserCheck className="size-4" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-foreground">For Customers</h3>
              <p className="text-xs text-muted-foreground">Renting equipment for your event</p>
            </div>
          </div>

          <div className="space-y-4">
            {customerSteps.map((step, idx) => (
              <div key={step.title} className="flex items-start gap-3">
                <span className="size-6 rounded-full bg-muted text-foreground text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <div className="space-y-0.5">
                  <h4 className="text-xs font-semibold text-foreground">{step.title}</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2">
            <AppLink to="/equipment">
              <Button className="w-full bg-brand hover:bg-brand-hover text-white text-xs gap-1.5">
                <span>Browse equipment</span>
                <ArrowRight className="size-3.5" />
              </Button>
            </AppLink>
          </div>
        </div>

        {/* Vendor Steps */}
        <div className="p-6 rounded-2xl border border-border bg-surface shadow-xs space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-border">
            <div className="size-8 rounded-lg bg-brand/10 text-brand flex items-center justify-center">
              <Wrench className="size-4" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-foreground">For Vendors</h3>
              <p className="text-xs text-muted-foreground">Listing and earning from your inventory</p>
            </div>
          </div>

          <div className="space-y-4">
            {vendorSteps.map((step, idx) => (
              <div key={step.title} className="flex items-start gap-3">
                <span className="size-6 rounded-full bg-muted text-foreground text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <div className="space-y-0.5">
                  <h4 className="text-xs font-semibold text-foreground">{step.title}</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2">
            <AppLink to="/auth?mode=vendor-signup">
              <Button variant="outline" className="w-full text-xs gap-1.5">
                <span>Apply as equipment vendor</span>
                <ArrowRight className="size-3.5" />
              </Button>
            </AppLink>
          </div>
        </div>
      </div>
    </div>
  )
}
