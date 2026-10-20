import { AnnouncementBar } from '@/components/home/announcement-bar'
import { HeroCarousel } from '@/components/home/hero-carousel'
import { SearchCard } from '@/components/home/search-card'
import { CategoryStrip } from '@/components/home/category-strip'
import { FeaturedSection } from '@/components/home/featured-section'
import { HowItWorks } from '@/components/home/how-it-works'
import { WhyRent4Fraction } from '@/components/home/why-us'
import { TopVendors } from '@/components/home/top-vendors'
import { VendorCTA } from '@/components/home/vendor-cta'
import { FAQSection } from '@/components/home/faq-section'
import { PageContainer } from '@/components/shared/page-container'
import { usePageTitle } from '@/hooks/use-page-title'

export function HomePage() {
  usePageTitle('Rent4Fraction — Event Equipment Rental Marketplace')

  return (
    <>
      {/* 1. Optional Slim Announcement Bar */}
      <AnnouncementBar />

      <PageContainer>
        {/* 2. Hero Carousel + Search Card */}
        <HeroCarousel />
        <SearchCard />

        {/* 3. Category Strip (8 categories) */}
        <CategoryStrip />

        {/* 4. Popular for your next event (8 EquipmentCards) */}
        <FeaturedSection />

        {/* 5. How It Works (id="how-it-works") */}
        <HowItWorks />

        {/* 6. Why Rent4Fraction (4 feature cards) */}
        <WhyRent4Fraction />

        {/* 7. Top-rated Vendors (4 VendorCards) */}
        <TopVendors />

        {/* 8. Vendor CTA Banner (hidden for vendor & admin) */}
        <VendorCTA />

        {/* 9. FAQ Teaser Accordion (5 questions) */}
        <FAQSection />
      </PageContainer>
    </>
  )
}
