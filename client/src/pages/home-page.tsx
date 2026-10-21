import { useState } from 'react'
import { HomeHero } from '@/components/home/home-hero'
import { CategoryStrip } from '@/components/home/category-strip'
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
      {/* 1. Dismissible honest sample data notice */}
      <SampleDataNotice dismissible />

      <PageContainer>
        {/* 2. Restrained centered Hero with pill search bar and filter chips */}
        <HomeHero dates={dates} onDatesChange={setDates} />

        {/* 3. 8 Category compact bordered tiles (From ₹X per day, no icons) */}
        <CategoryStrip />

        {/* 4. Popular equipment with working date availability and calculations */}
        <FeaturedSection dates={dates} />

        {/* 5. How It Works (plain numbered steps + sample booking breakdown) */}
        <HowItWorks />

        {/* 6. Vendor CTA (single flat wine block) */}
        <VendorCTA />

        {/* 7. FAQ (4 questions linking to Help) */}
        <FAQSection />
      </PageContainer>
    </>
  )
}
