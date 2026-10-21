import { AppLink } from '@/components/shared/app-link'
import { SampleDataNotice } from '@/components/shared/sample-data-notice'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface text-foreground pt-8 sm:pt-12 pb-12 sm:pb-10 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Brand Header & Notice (both mobile & desktop) */}
        <div className="space-y-3 pb-6 md:pb-0">
          <AppLink
            to="/"
            className="inline-block text-headline-sm font-bold tracking-tight text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-sm"
            aria-label="Rent4Fraction Home"
          >
            rent<span className="text-brand">4</span>fraction
          </AppLink>

          <p className="text-body-sm text-text-secondary leading-normal max-w-sm">
            Event equipment rental marketplace in India. Rent sound systems, stage lighting, furniture, and canopies directly from verified equipment owners.
          </p>

          <SampleDataNotice />
        </div>

        {/* Mobile Accordion Groups (<md) */}
        <div className="md:hidden pt-4 pb-6 border-b border-border">
          <Accordion type="multiple" className="w-full">
            <AccordionItem value="equipment" className="border-border">
              <AccordionTrigger className="text-sm font-semibold py-3.5 hover:no-underline">
                Equipment Categories
              </AccordionTrigger>
              <AccordionContent>
                <ul className="space-y-2.5 text-body-sm text-text-secondary pl-1">
                  <li>
                    <AppLink to="/equipment?category=1" className="block py-1 hover:text-brand">
                      Speakers and PA systems
                    </AppLink>
                  </li>
                  <li>
                    <AppLink to="/equipment?category=2" className="block py-1 hover:text-brand">
                      Microphones
                    </AppLink>
                  </li>
                  <li>
                    <AppLink to="/equipment?category=4" className="block py-1 hover:text-brand">
                      Stage lights
                    </AppLink>
                  </li>
                  <li>
                    <AppLink to="/equipment?category=6" className="block py-1 hover:text-brand">
                      Chairs and seating
                    </AppLink>
                  </li>
                  <li>
                    <AppLink to="/equipment?category=8" className="block py-1 hover:text-brand">
                      Tents and decor
                    </AppLink>
                  </li>
                  <li>
                    <AppLink to="/equipment" className="block py-1 text-brand font-medium">
                      All equipment
                    </AppLink>
                  </li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="help" className="border-border">
              <AccordionTrigger className="text-sm font-semibold py-3.5 hover:no-underline">
                Help & Policies
              </AccordionTrigger>
              <AccordionContent>
                <ul className="space-y-2.5 text-body-sm text-text-secondary pl-1">
                  <li>
                    <AppLink to="/help?tab=faq" className="block py-1 hover:text-brand">
                      Frequently asked questions
                    </AppLink>
                  </li>
                  <li>
                    <AppLink to="/help?tab=how-it-works" className="block py-1 hover:text-brand">
                      How booking works
                    </AppLink>
                  </li>
                  <li>
                    <AppLink to="/help?tab=refunds" className="block py-1 hover:text-brand">
                      Refunds and security deposits
                    </AppLink>
                  </li>
                  <li>
                    <AppLink to="/help?tab=terms" className="block py-1 hover:text-brand">
                      Terms of service
                    </AppLink>
                  </li>
                  <li>
                    <AppLink to="/help?tab=privacy" className="block py-1 hover:text-brand">
                      Privacy policy
                    </AppLink>
                  </li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="portals" className="border-border">
              <AccordionTrigger className="text-sm font-semibold py-3.5 hover:no-underline">
                Account & Portals
              </AccordionTrigger>
              <AccordionContent>
                <ul className="space-y-2.5 text-body-sm text-text-secondary pl-1">
                  <li>
                    <AppLink to="/account" className="block py-1 hover:text-brand">
                      Customer account
                    </AppLink>
                  </li>
                  <li>
                    <AppLink to="/vendor" className="block py-1 hover:text-brand">
                      Vendor portal
                    </AppLink>
                  </li>
                  <li>
                    <AppLink to="/admin" className="block py-1 hover:text-brand">
                      Admin console
                    </AppLink>
                  </li>
                  <li>
                    <AppLink to="/help?tab=contact" className="block py-1 hover:text-brand">
                      Contact support
                    </AppLink>
                  </li>
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        {/* Desktop Multi-column Grid (md and up) */}
        <div className="hidden md:grid md:grid-cols-3 lg:grid-cols-3 gap-8 pt-6 pb-10 border-b border-border">
          {/* Col 1: Categories */}
          <div className="space-y-2.5">
            <h3 className="text-body-md font-semibold text-foreground">
              Equipment
            </h3>
            <ul className="space-y-1.5 text-body-sm text-text-secondary">
              <li>
                <AppLink to="/equipment?category=1" className="hover:text-brand transition-colors">
                  Speakers and PA systems
                </AppLink>
              </li>
              <li>
                <AppLink to="/equipment?category=2" className="hover:text-brand transition-colors">
                  Microphones
                </AppLink>
              </li>
              <li>
                <AppLink to="/equipment?category=4" className="hover:text-brand transition-colors">
                  Stage lights
                </AppLink>
              </li>
              <li>
                <AppLink to="/equipment?category=6" className="hover:text-brand transition-colors">
                  Chairs and seating
                </AppLink>
              </li>
              <li>
                <AppLink to="/equipment?category=8" className="hover:text-brand transition-colors">
                  Tents and decor
                </AppLink>
              </li>
              <li>
                <AppLink to="/equipment" className="hover:text-brand font-medium transition-colors text-brand">
                  All equipment
                </AppLink>
              </li>
            </ul>
          </div>

          {/* Col 2: Support & Information */}
          <div className="space-y-2.5">
            <h3 className="text-body-md font-semibold text-foreground">
              Help and policies
            </h3>
            <ul className="space-y-1.5 text-body-sm text-text-secondary">
              <li>
                <AppLink to="/help?tab=faq" className="hover:text-brand transition-colors">
                  Frequently asked questions
                </AppLink>
              </li>
              <li>
                <AppLink to="/help?tab=how-it-works" className="hover:text-brand transition-colors">
                  How booking works
                </AppLink>
              </li>
              <li>
                <AppLink to="/help?tab=refunds" className="hover:text-brand transition-colors">
                  Refunds and security deposits
                </AppLink>
              </li>
              <li>
                <AppLink to="/help?tab=terms" className="hover:text-brand transition-colors">
                  Terms of service
                </AppLink>
              </li>
              <li>
                <AppLink to="/help?tab=privacy" className="hover:text-brand transition-colors">
                  Privacy policy
                </AppLink>
              </li>
            </ul>
          </div>

          {/* Col 3: Portals */}
          <div className="space-y-2.5">
            <h3 className="text-body-md font-semibold text-foreground">
              Account and partners
            </h3>
            <ul className="space-y-1.5 text-body-sm text-text-secondary">
              <li>
                <AppLink to="/account" className="hover:text-brand transition-colors">
                  Customer account
                </AppLink>
              </li>
              <li>
                <AppLink to="/vendor" className="hover:text-brand transition-colors">
                  Vendor portal
                </AppLink>
              </li>
              <li>
                <AppLink to="/admin" className="hover:text-brand transition-colors">
                  Admin console
                </AppLink>
              </li>
              <li>
                <AppLink to="/help?tab=contact" className="hover:text-brand transition-colors">
                  Contact support
                </AppLink>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-label-sm text-text-secondary">
          <p>© 2026 Rent4Fraction. Sample demonstration platform.</p>
          <div className="flex items-center gap-4">
            <AppLink to="/help?tab=privacy" className="hover:underline py-1">
              Privacy
            </AppLink>
            <AppLink to="/help?tab=terms" className="hover:underline py-1">
              Terms
            </AppLink>
            <AppLink to="/help?tab=refunds" className="hover:underline py-1">
              Refunds
            </AppLink>
          </div>
        </div>
      </div>
    </footer>
  )
}
