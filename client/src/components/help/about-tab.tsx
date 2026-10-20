import { ArrowRight, Layers, ShieldCheck, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AppLink } from '@/components/shared/app-link'

export function AboutTab() {
  const valueCards = [
    {
      title: 'Verified vendors',
      icon: ShieldCheck,
      description:
        'Vendor applications and equipment catalogues are vetted to ensure high standards of maintenance, reliability, and service.',
    },
    {
      title: 'One booking, multiple vendors',
      icon: Layers,
      description:
        'Select sound, lighting, and stage equipment across different specialists in one flow, with clear per-vendor fulfillment tracking.',
    },
    {
      title: 'Refundable security deposits',
      icon: Wallet,
      description:
        'Security deposits are securely held and refunded after equipment returns are completed and inspected.',
    },
  ]

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="space-y-3">
        <h2 className="font-serif text-2xl sm:text-3xl font-bold text-foreground">
          Equipment rental, made more accessible.
        </h2>
        <p className="text-base text-muted-foreground leading-relaxed">
          Rent4Fraction connects event organizers, musicians, and creators with verified local vendors who keep professional production equipment maintained and ready to perform.
        </p>
      </div>

      {/* 3 Value Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {valueCards.map((card) => {
          const Icon = card.icon
          return (
            <div
              key={card.title}
              className="p-5 rounded-2xl border border-border bg-surface shadow-xs space-y-3"
            >
              <div className="size-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center">
                <Icon className="size-5" />
              </div>
              <h3 className="font-serif text-base font-bold text-foreground">
                {card.title}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {card.description}
              </p>
            </div>
          )
        })}
      </div>

      <div className="pt-2">
        <AppLink to="/equipment">
          <Button className="bg-brand hover:bg-brand-hover text-white text-xs gap-2">
            <span>Browse equipment catalogue</span>
            <ArrowRight className="size-3.5" />
          </Button>
        </AppLink>
      </div>
    </div>
  )
}
