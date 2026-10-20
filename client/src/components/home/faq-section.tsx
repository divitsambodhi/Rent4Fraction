import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { SectionHeader } from '@/components/shared/section-header'
import { AppLink } from '@/components/shared/app-link'
import { useAsync } from '@/hooks/use-async'
import { getFaqs } from '@/lib/api'

export function FAQSection() {
  const { data: faqs } = useAsync(getFaqs)

  return (
    <section className="py-16 sm:py-20 border-t border-border">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-start">
        {/* Left Column: Heading and Teaser */}
        <div className="lg:col-span-5">
          <SectionHeader
            eyebrow="Got Questions?"
            title="Everything you need to "
            accentWord="know"
            subtitle="Transparent policies on security deposits, multi-vendor bookings, logistics, and vendor safety standards."
          />
          <div className="mt-4">
            <AppLink
              to="/help?tab=faq"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:text-brand-hover transition-colors"
            >
              <span>View all frequently asked questions</span>
              <span>→</span>
            </AppLink>
          </div>
        </div>

        {/* Right Column: Accessible Radix Accordion with 5 questions */}
        <div className="lg:col-span-7">
          <Accordion type="single" collapsible defaultValue="faq-1" className="w-full">
            {faqs?.map((faq) => (
              <AccordionItem key={faq.id} value={faq.id}>
                <AccordionTrigger>{faq.question}</AccordionTrigger>
                <AccordionContent>{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  )
}
