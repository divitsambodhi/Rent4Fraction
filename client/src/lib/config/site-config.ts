/**
 * Authoritative Site Configuration Module (`src/lib/config/site-config.ts`)
 * Centralizes all brand identity, support contact details, physical address,
 * cancellation policy tiers, and legal intermediary disclaimers.
 * No hardcoded email/phone/address fragments anywhere else in the client.
 */

export interface SiteConfig {
  name: string
  legalName: string
  tagline: string
  description: string
  supportEmail: string
  supportPhone: string
  supportAddress: {
    line1: string
    line2: string
    city: string
    state: string
    pincode: string
    country: string
  }
  currency: {
    code: string
    symbol: string
    label: string
  }
  acceptanceTimeoutHours: number
  cancellationPolicy: {
    tier1: { hoursBefore: number; refundPercent: number; label: string }
    tier2: { hoursBefore: number; refundPercent: number; label: string }
    tier3: { hoursBefore: number; refundPercent: number; label: string }
  }
  disclaimers: {
    codNote: string
    intermediary: string
    depositSecurity: string
  }
  links: {
    terms: string
    privacy: string
    faq: string
    contact: string
  }
}

export const siteConfig: SiteConfig = {
  name: 'Rent4Fraction',
  legalName: 'Rent4Fraction Event Tech Pvt. Ltd.',
  tagline: 'Professional Event Equipment Rental Marketplace',
  description:
    'Connect directly with verified local event equipment vendors. Audio, lighting, staging, cameras, and DJ gear with transparent cash on delivery.',
  supportEmail: (import.meta.env.VITE_SUPPORT_EMAIL as string) || 'support@rent4fraction.in',
  supportPhone: (import.meta.env.VITE_SUPPORT_PHONE as string) || '+91 80 4567 8900',
  supportAddress: {
    line1: 'Level 4, Prestige Meridian',
    line2: '29 M.G. Road',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560001',
    country: 'India',
  },
  currency: {
    code: 'INR',
    symbol: '₹',
    label: 'Indian Rupee',
  },
  acceptanceTimeoutHours: 24,
  cancellationPolicy: {
    tier1: {
      hoursBefore: 48,
      refundPercent: 100,
      label: 'Free cancellation up to 48 hours before rental start.',
    },
    tier2: {
      hoursBefore: 24,
      refundPercent: 50,
      label: '50% cash settlement agreed between 24 and 48 hours before rental start.',
    },
    tier3: {
      hoursBefore: 0,
      refundPercent: 0,
      label: 'Cancellation under 24 hours requires direct mutual settlement with the vendor.',
    },
  },
  disclaimers: {
    codNote:
      'Cash on Delivery: Payment of the rental fee and security deposit is made directly to the vendor at the time of delivery.',
    intermediary:
      'Rent4Fraction is a technology marketplace connecting independent equipment owners and renters. The platform does not handle payments, hold funds, or guarantee fulfillment. All transactions are settled directly between customer and vendor.',
    depositSecurity:
      'The security deposit is handed directly to the vendor at delivery and returned in cash upon completion of the return inspection, less any mutually verified damage costs.',
  },
  links: {
    terms: '/terms',
    privacy: '/privacy',
    faq: '/help',
    contact: '/contact',
  },
}

