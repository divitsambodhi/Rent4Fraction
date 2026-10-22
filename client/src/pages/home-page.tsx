import { useState } from 'react'
import { HomeHero } from '@/components/home/home-hero'
import { FeaturedSection } from '@/components/home/featured-section'
import { HowItWorks } from '@/components/home/how-it-works'
import { VendorCTA } from '@/components/home/vendor-cta'
import { FAQSection } from '@/components/home/faq-section'
import { PageContainer } from '@/components/shared/page-container'
import { SampleDataNotice } from '@/components/shared/sample-data-notice'
import { usePageTitle } from '@/hooks/use-page-title'

export function HomePage() {
  usePageTitle('Rent4Fraction | Event Equipment Rental Marketplace')
  const [dates, setDates] = useState<{ from?: string; to?: string }>({})

  return (
    <>
      {/* 1. Dismissible sample data notice */}
      <SampleDataNotice dismissible />

      <PageContainer>
        {/* 2. Restrained Hero with display heading, subtext, Browse and Choose dates buttons */}
        <HomeHero dates={dates} onDatesChange={setDates} />

        {/* 3. Popular equipment with working date availability and calculations */}
        <FeaturedSection dates={dates} />

        {/* 4. How It Works (plain numbered steps + sample booking breakdown) */}
        <HowItWorks />

        {/* 5. Vendor CTA (single flat wine block) */}
        <VendorCTA />

        {/* 6. FAQ (4 questions linking to Help) */}
        <FAQSection />
      </PageContainer>
    </>
  )
}
