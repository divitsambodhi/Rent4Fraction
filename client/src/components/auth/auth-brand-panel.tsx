import type { AuthMode } from '@/types/auth'
import { cn } from '@/lib/utils'

interface AuthBrandPanelProps {
  mode: AuthMode
  className?: string
}

/**
 * AuthBrandPanel: Restrained flat wine panel per section 1 & 2.
 * 8px radius, plain copy, no banned buzzwords ("welcome back"), no italic font accents.
 */
export function AuthBrandPanel({ mode, className }: AuthBrandPanelProps) {
  const content = {
    login: {
      eyebrow: 'Account access',
      headline: 'Log in to manage bookings and messages',
      description: 'Access confirmed reservations, vendor communications, delivery schedules, and payment receipts.',
      features: [
        'Track active and upcoming equipment rentals in one dashboard',
        'Direct messaging with fulfilling equipment owners',
        'Saved delivery addresses and wishlist items',
      ],
    },
    signup: {
      eyebrow: 'Customer account',
      headline: 'Rent event equipment from multiple suppliers',
      description: 'Book sound systems, stage lighting, banquet seating, and decor with unified checkout.',
      features: [
        'Combine items from several vendors in a single event booking',
        'Transparent per-day pricing with refundable security deposits',
        'Vendor delivery to your event location',
      ],
    },
    vendor: {
      eyebrow: 'Vendor registration',
      headline: 'List your equipment for event rentals',
      description: 'Receive booking requests from event planners, corporate organizers, and individuals across India.',
      features: [
        'Manage inventory listings and availability schedules',
        'Coordinate delivery, setup, and equipment returns',
        'Structured security deposit and damage inspection workflows',
      ],
    },
  }

  const current = content[mode] || content.login

  return (
    <div
      className={cn(
        'rounded-md bg-brand text-white p-6 sm:p-8 lg:p-10 flex flex-col justify-between select-none',
        className,
      )}
    >
      <div className="space-y-4">
        <span className="text-label-sm font-semibold text-white/80">
          {current.eyebrow}
        </span>

        <h2 className="text-headline-md font-bold text-white">
          {current.headline}
        </h2>

        <p className="text-body-sm text-white/90 leading-relaxed max-w-md">
          {current.description}
        </p>

        <div className="space-y-2.5 pt-2">
          {current.features.map((feat) => (
            <div key={feat} className="flex items-start gap-2.5 text-body-sm text-white/90">
              <span className="text-white font-bold">•</span>
              <span>{feat}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-6 mt-6 border-t border-white/20 text-label-sm text-white/80">
        Rent4Fraction equipment rental platform
      </div>
    </div>
  )
}
