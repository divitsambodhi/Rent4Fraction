import { usePageTitle } from '@/hooks/use-page-title'
import { useAppSearchParams } from '@/components/shared/app-link'
import { HelpLayout } from '@/components/help/help-layout'
import { AboutTab } from '@/components/help/about-tab'
import { HowItWorksTab } from '@/components/help/how-it-works-tab'
import { FaqTab } from '@/components/help/faq-tab'
import { ContactTab } from '@/components/help/contact-tab'
import { LegalTab } from '@/components/help/legal-tab'
import type { HelpTab } from '@/types/help'

export function HelpPage() {
  const [searchParams] = useAppSearchParams()
  const tabParam = (searchParams.get('tab') as HelpTab) || 'faq'

  // Dynamic Document Title
  const getTabTitle = (tab: HelpTab): string => {
    switch (tab) {
      case 'about':
        return 'About Rent4Fraction'
      case 'how-it-works':
        return 'How It Works'
      case 'faq':
        return 'Frequently Asked Questions'
      case 'contact':
        return 'Contact Support'
      case 'terms':
        return 'Terms of Service'
      case 'privacy':
        return 'Privacy Policy'
      case 'refunds':
        return 'Refund Policy'
      default:
        return 'Help & Support'
    }
  }

  usePageTitle(`${getTabTitle(tabParam)} | Rent4Fraction`)

  return (
    <HelpLayout currentTab={tabParam}>
      {tabParam === 'about' && <AboutTab />}
      {tabParam === 'how-it-works' && <HowItWorksTab />}
      {tabParam === 'faq' && <FaqTab />}
      {tabParam === 'contact' && <ContactTab />}
      {tabParam === 'terms' && <LegalTab type="terms" />}
      {tabParam === 'privacy' && <LegalTab type="privacy" />}
      {tabParam === 'refunds' && <LegalTab type="refunds" />}
    </HelpLayout>
  )
}
