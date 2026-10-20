import { CheckCircle2, DollarSign, Layers, ShieldCheck } from 'lucide-react'
import { SectionHeader } from '@/components/shared/section-header'

const FEATURES = [
  {
    title: 'Verified Vendors',
    description:
      'Every equipment partner is audited for GST registration, physical equipment warehouse readiness, and test compliance before listing.',
    icon: CheckCircle2,
  },
  {
    title: 'Transparent Pricing',
    description:
      'Clear daily rental rates and refundable security deposits specified on every card. No surge markups or unadvertised fees.',
    icon: DollarSign,
  },
  {
    title: 'One Booking, Many Vendors',
    description:
      'Consolidate line-array speakers from one supplier, LED pars from another, and banquet chairs into a single synchronized order.',
    icon: Layers,
  },
  {
    title: 'Deposit Protection Guarantee',
    description:
      'Security deposits remain safely secured in escrow during the rental. Funds are released directly upon verified equipment return.',
    icon: ShieldCheck,
  },
]

export function WhyRent4Fraction() {
  return (
    <section className="py-16 sm:py-20 border-t border-border">
      <SectionHeader
        eyebrow="The Rent4Fraction Standard"
        title="Why event planners "
        accentWord="trust"
        subtitle="Engineered for event professionals, production managers, and wedding organizers across India."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {FEATURES.map((feat) => {
          const Icon = feat.icon
          return (
            <div
              key={feat.title}
              className="p-6 rounded-[16px] border border-border bg-surface flex flex-col justify-between transition-all duration-200 hover:border-brand/40 hover:shadow-xs group"
            >
              <div>
                <div className="size-12 rounded-[12px] bg-brand/10 text-brand flex items-center justify-center mb-4 group-hover:bg-brand group-hover:text-white transition-colors">
                  <Icon className="size-6" />
                </div>
                <h3 className="font-serif text-lg font-semibold text-foreground mb-2">
                  {feat.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feat.description}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
