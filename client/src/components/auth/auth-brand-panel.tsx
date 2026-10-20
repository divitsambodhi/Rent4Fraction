import { CheckCircle2, Lock, Package } from 'lucide-react'
import type { AuthMode } from '@/types/auth'
import { cn } from '@/lib/utils'

interface AuthBrandPanelProps {
  mode: AuthMode
  className?: string
}

export function AuthBrandPanel({ mode, className }: AuthBrandPanelProps) {
  const content = {
    login: {
      eyebrow: 'WELCOME BACK',
      headline: (
        <>
          Pick up where you <em className="italic font-normal text-amber-200">left off</em>.
        </>
      ),
      description: 'Sign in to access your upcoming reservations, vendor messages, and active orders.',
      features: [
        'All your event bookings organized in one dashboard',
        'Direct messaging with verified regional gear suppliers',
        'Saved venues, delivery addresses, and wishlist items',
      ],
    },
    signup: {
      eyebrow: 'EVENT EQUIPMENT MARKETPLACE',
      headline: (
        <>
          Rent for a <em className="italic font-normal text-amber-200">fraction</em> of the cost.
        </>
      ),
      description: 'Access concert-grade sound, intelligent lighting, and premium decor from trusted local vendors.',
      features: [
        'Consolidate multiple suppliers into a single event checkout',
        'Transparent refundable deposits with fair post-event inspections',
        'Direct venue delivery and collection options where available',
      ],
    },
    vendor: {
      eyebrow: 'BECOME A VERIFIED SUPPLIER',
      headline: (
        <>
          Put your equipment to <em className="italic font-normal text-amber-200">work</em>.
        </>
      ),
      description: 'Connect with event planners, corporate organizers, and individuals looking for professional event inventory.',
      features: [
        'List your equipment once and manage recurring rental bookings',
        'Coordinate dispatch, logistics, and returns in one platform',
        'Guaranteed rental payments and structured deposit protections',
      ],
    },
  }

  const current = content[mode] || content.login

  return (
    <div
      className={cn(
        'relative rounded-[24px] bg-gradient-to-br from-brand via-brand/95 to-brand-hover text-white p-6 sm:p-8 lg:p-10 flex flex-col justify-between overflow-hidden shadow-xl select-none',
        className,
      )}
    >
      {/* Background Watermark Package Icon */}
      <div
        className="absolute -right-12 -bottom-12 opacity-10 pointer-events-none text-white"
        aria-hidden="true"
      >
        <Package className="size-96" />
      </div>

      {/* Top Header & Copy with 200ms transition */}
      <div className="relative z-10 space-y-5 transition-opacity duration-200">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white/90 text-[11px] font-bold tracking-wider uppercase backdrop-blur-xs">
          <span>{current.eyebrow}</span>
        </div>

        <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight leading-tight">
          {current.headline}
        </h2>

        <p className="text-white/80 text-xs sm:text-sm leading-relaxed max-w-md">
          {current.description}
        </p>

        {/* 3 Value Rows */}
        <div className="space-y-3 pt-2">
          {current.features.map((feat) => (
            <div key={feat} className="flex items-start gap-3 text-xs sm:text-sm text-white/90">
              <CheckCircle2 className="size-4.5 text-amber-200 shrink-0 mt-0.5 fill-amber-200/20" />
              <span>{feat}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Lock Protection Line */}
      <div className="relative z-10 pt-6 mt-6 border-t border-white/15 flex items-center gap-2 text-xs text-white/70">
        <Lock className="size-3.5" />
        <span>Secure account protection & encrypted session guarantee</span>
      </div>
    </div>
  )
}
