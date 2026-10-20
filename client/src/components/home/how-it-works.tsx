import { CalendarCheck, RotateCcw, Search, Truck } from 'lucide-react'
import { SectionHeader } from '@/components/shared/section-header'

const STEPS = [
  {
    step: '01',
    title: 'Discover & Select Gear',
    description:
      'Search pro equipment across 8 event categories. Check transparent per-day rates, verified specs, and availability.',
    icon: Search,
  },
  {
    step: '02',
    title: 'Lock Dates & Escrow',
    description:
      'Choose your event dates and bundle items across vendors. Security deposits are held securely in escrow.',
    icon: CalendarCheck,
  },
  {
    step: '03',
    title: 'Venue Delivery & Setup',
    description:
      'Verified local vendor teams deliver, soundcheck, and stage equipment directly at your event venue on time.',
    icon: Truck,
  },
  {
    step: '04',
    title: 'Return & Deposit Release',
    description:
      'Post-event pickup and quick condition check. Your security deposit is automatically refunded within 24–48 hours.',
    icon: RotateCcw,
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-16 sm:py-20 border-t border-border">
      <SectionHeader
        eyebrow="Simple & Transparent"
        title="From reservation to venue "
        accentWord="success"
        subtitle="How Rent4Fraction makes renting concert-quality sound, lighting, and decor seamless across India."
        align="center"
      />

      <div className="relative mt-8 sm:mt-12">
        {/* Desktop Dashed Connector Line */}
        <div
          className="hidden lg:block absolute top-10 left-[12%] right-[12%] h-[2px] border-t-2 border-dashed border-border -z-0"
          aria-hidden="true"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-6 relative z-10">
          {STEPS.map((item) => {
            const Icon = item.icon
            return (
              <div
                key={item.step}
                className="flex flex-col items-center text-center p-6 rounded-[16px] border border-border bg-surface transition-all duration-200 hover:border-brand/40 hover:shadow-xs group"
              >
                {/* Numbered Brand Circle */}
                <div className="relative mb-5">
                  <div className="size-16 rounded-full bg-brand text-white flex items-center justify-center font-serif text-lg font-bold shadow-xs group-hover:scale-105 transition-transform">
                    {item.step}
                  </div>
                  <div className="absolute -bottom-2 -right-1 size-7 rounded-full bg-surface border border-border flex items-center justify-center text-brand shadow-xs">
                    <Icon className="size-3.5" />
                  </div>
                </div>

                <h3 className="font-serif text-lg font-semibold text-foreground mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
