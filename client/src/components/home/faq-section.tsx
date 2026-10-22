import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { AppLink } from '@/components/shared/app-link'
import { useAsync } from '@/hooks/use-async'
import { getFaqs } from '@/lib/api'

/**
 * FAQSection: Short list of 4 frequently asked questions linking to Help per section 5.
 * Restrained plain copy, no eyebrow pill, no italic words.
 */
export function FAQSection() {
  const { data: faqs } = useAsync(getFaqs)
  const displayFaqs = faqs?.slice(0, 4)

  return (
    <section className="py-12 md:py-16 border-t border-border">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-5">
          <h2 className="font-serif text-2xl md:text-3xl font-semibold tracking-[-0.02em] text-foreground">
            Frequently asked questions
          </h2>
          <p className="text-body-sm text-text-secondary mt-2">
            Clear details on security deposits, delivery schedules, and booking multiple vendors together.
          </p>
          <div className="mt-4">
            <AppLink
              to="/help?tab=faq"
              className="text-label-lg text-brand hover:underline"
            >
              View all questions in Help
            </AppLink>
          </div>
        </div>

        <div className="lg:col-span-7">
          <Accordion type="single" collapsible defaultValue="faq-1" className="w-full">
            {displayFaqs?.map((faq) => (
              <AccordionItem key={faq.id} value={faq.id}>
                <AccordionTrigger className="text-left text-body-md font-medium text-foreground">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-body-sm text-text-secondary">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  )
}
