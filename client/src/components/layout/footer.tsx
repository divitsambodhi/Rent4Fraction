import {
  Mail,
  MapPin,
  Package,
  Phone,
  ShieldCheck,
} from 'lucide-react'
import { AppLink } from '@/components/shared/app-link'

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface text-foreground pt-14 pb-10 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 4 Columns Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-border">
          {/* Col 1 & 2: Brand, Editorial Description, Socials */}
          <div className="lg:col-span-2 space-y-4">
            <AppLink
              to="/"
              className="inline-flex items-center gap-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-lg"
              aria-label="Rent4Fraction Home"
            >
              <div className="size-8 rounded-[10px] bg-brand text-white flex items-center justify-center shadow-xs">
                <Package className="size-4.5 stroke-[2.2]" />
              </div>
              <span className="font-serif text-2xl font-bold tracking-tight text-foreground">
                rent<span className="text-brand">4</span>fraction
              </span>
            </AppLink>

            <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
              India&apos;s curated event equipment marketplace. Rent pro audio,
              lighting fixtures, DJ backlines, and wedding structures from verified local
              vendors with unified security deposits.
            </p>

            {/* Social Icons (SVGs for reliability) */}
            <div className="flex items-center gap-3 pt-2 text-muted-foreground">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="size-9 rounded-full border border-border flex items-center justify-center hover:text-brand hover:border-brand/50 transition-colors"
              >
                <svg className="size-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Twitter / X"
                className="size-9 rounded-full border border-border flex items-center justify-center hover:text-brand hover:border-brand/50 transition-colors"
              >
                <svg className="size-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                className="size-9 rounded-full border border-border flex items-center justify-center hover:text-brand hover:border-brand/50 transition-colors"
              >
                <svg className="size-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                </svg>
              </a>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="size-9 rounded-full border border-border flex items-center justify-center hover:text-brand hover:border-brand/50 transition-colors"
              >
                <svg className="size-4 fill-current" viewBox="0 0 24 24">
                  <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Col 3: Explore */}
          <div className="space-y-3">
            <h4 className="font-serif text-base font-semibold text-foreground tracking-tight">
              Explore Equipment
            </h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <AppLink to="/equipment?category=1" className="hover:text-brand transition-colors">
                  Speakers & PA Systems
                </AppLink>
              </li>
              <li>
                <AppLink to="/equipment?category=2" className="hover:text-brand transition-colors">
                  Wireless Microphones
                </AppLink>
              </li>
              <li>
                <AppLink to="/equipment?category=3" className="hover:text-brand transition-colors">
                  DJ Mixers & Decks
                </AppLink>
              </li>
              <li>
                <AppLink to="/equipment?category=4" className="hover:text-brand transition-colors">
                  Stage Lights & Washes
                </AppLink>
              </li>
              <li>
                <AppLink to="/equipment?category=5" className="hover:text-brand transition-colors">
                  Fairy Lights & Ambience
                </AppLink>
              </li>
              <li>
                <AppLink to="/equipment" className="hover:text-brand font-medium transition-colors text-brand">
                  All 8 Categories →
                </AppLink>
              </li>
            </ul>
          </div>

          {/* Col 4: Support */}
          <div className="space-y-3">
            <h4 className="font-serif text-base font-semibold text-foreground tracking-tight">
              Customer Support
            </h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <AppLink to="/help?tab=faq" className="hover:text-brand transition-colors">
                  Frequently Asked Questions
                </AppLink>
              </li>
              <li>
                <AppLink to="/help?tab=how-it-works" className="hover:text-brand transition-colors">
                  How Rentals Work
                </AppLink>
              </li>
              <li>
                <AppLink to="/help?tab=refunds" className="hover:text-brand transition-colors">
                  Refundable Security Deposits
                </AppLink>
              </li>
              <li>
                <AppLink to="/help?tab=contact" className="hover:text-brand transition-colors">
                  Contact Support Desk
                </AppLink>
              </li>
              <li>
                <AppLink to="/help?tab=terms" className="hover:text-brand transition-colors">
                  Rental Terms of Service
                </AppLink>
              </li>
              <li>
                <AppLink to="/help?tab=privacy" className="hover:text-brand transition-colors">
                  Privacy Policy & Escrow
                </AppLink>
              </li>
            </ul>
          </div>

          {/* Col 5: Contact Info */}
          <div className="space-y-3">
            <h4 className="font-serif text-base font-semibold text-foreground tracking-tight">
              Contact & Desk
            </h4>
            <div className="space-y-2.5 text-sm text-muted-foreground">
              <div className="flex items-start gap-2.5">
                <Mail className="size-4 text-brand mt-0.5 shrink-0" />
                <a
                  href="mailto:support@rent4fraction.in"
                  className="hover:text-brand transition-colors"
                >
                  support@rent4fraction.in
                </a>
              </div>
              <div className="flex items-start gap-2.5">
                <Phone className="size-4 text-brand mt-0.5 shrink-0" />
                <a
                  href="tel:+912248902100"
                  className="hover:text-brand transition-colors tabular-nums"
                >
                  +91 (022) 4890-2100
                </a>
              </div>
              <div className="flex items-start gap-2.5">
                <MapPin className="size-4 text-brand mt-0.5 shrink-0" />
                <span className="leading-snug">
                  BKC Financial Centre, Mumbai, Maharashtra 400051
                </span>
              </div>
              <div className="pt-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Desk Hours:</span>
                <br />
                Mon–Sat 9:00 AM – 8:00 PM IST
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>© 2026 Rent4Fraction Technologies Pvt. Ltd. All rights reserved.</p>
          <div className="flex items-center gap-2 text-foreground/80">
            <ShieldCheck className="size-4 text-brand" />
            <span>Secure payments with Escrow Deposit Guarantee</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
