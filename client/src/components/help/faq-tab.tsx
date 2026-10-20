import { useMemo, useState } from 'react'
import { MessageCircle, MessageSquare } from 'lucide-react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { AppLink } from '@/components/shared/app-link'
import { FaqSearch, HighlightText } from './faq-search'
import type { HelpFaqItem } from '@/types/help'

export const FAQ_DATA: HelpFaqItem[] = [
  {
    id: 'faq-1',
    category: 'deposits',
    question: 'How does the refundable security deposit work?',
    answer:
      'Security deposits are securely held when you place a booking. Once the rental duration concludes and the vendor inspects the returned equipment, the deposit is released back to your original payment method. If equipment is damaged, deductions may occur through an itemized damage report.',
  },
  {
    id: 'faq-2',
    category: 'bookings',
    question: 'Can I book equipment from multiple vendors in one order?',
    answer:
      'Yes. Rent4Fraction allows you to assemble items from multiple independent vendors into a single cart and checkout. Each vendor fulfills their respective portion of the booking, with separate handover dates and fulfillment tracking.',
  },
  {
    id: 'faq-3',
    category: 'delivery',
    question: 'What is the difference between venue delivery and pickup?',
    answer:
      'Venue delivery means the vendor arranges transport directly to your event venue at the agreed time window. Pickup means you or your crew collect the equipment directly from the vendor’s registered warehouse. Options offered depend on individual vendor listings.',
  },
  {
    id: 'faq-4',
    category: 'deposits',
    question: 'What happens if equipment is damaged during a rental?',
    answer:
      'If an item is returned damaged, the vendor documents the condition and submits an inspection report detailing repair costs. You can review the report in your account and choose to accept the deduction or dispute it for moderation review by our team.',
  },
  {
    id: 'faq-5',
    category: 'vendors',
    question: 'How are vendor applications reviewed and approved?',
    answer:
      'Before any partner can list equipment on Rent4Fraction, our onboarding team reviews submitted business registration, identity documents, and inventory details to ensure marketplace safety.',
  },
  {
    id: 'faq-6',
    category: 'bookings',
    question: 'Can I cancel a pending or confirmed booking?',
    answer:
      'Yes, bookings can be cancelled through your customer account before the rental period commences. The applicable refund terms are governed by the platform refund policy.',
  },
  {
    id: 'faq-7',
    category: 'payments',
    question: 'Which payment methods are accepted on Rent4Fraction?',
    answer:
      'We support major Indian payment channels including UPI, credit and debit cards, net banking, supported digital wallets, and cash on delivery where explicitly offered by vendors.',
  },
  {
    id: 'faq-8',
    category: 'bookings',
    question: 'When am I eligible to leave a review for equipment and vendors?',
    answer:
      'To maintain review authenticity, reviews are unlocked only after a rental has been returned and marked complete by the fulfilling vendor.',
  },
  {
    id: 'faq-9',
    category: 'bookings',
    question: 'Can I modify rental dates after adding equipment to my cart?',
    answer:
      'Yes, you can adjust rental start and end dates directly in the cart before finalizing checkout. The cart dynamically verifies vendor availability and recalculates rental totals.',
  },
  {
    id: 'faq-10',
    category: 'general',
    question: 'How is account data and authentication secured?',
    answer:
      'Account authentication and password security are managed through verified authentication providers. We recommend using unique passwords and keeping your registered email address secure.',
  },
  {
    id: 'faq-11',
    category: 'general',
    question: 'How do I reach support if I need assistance with a booking?',
    answer:
      'You can reach our team using the Contact Support form on this page or by messaging your fulfilling vendor directly through the built-in account inbox.',
  },
  {
    id: 'faq-12',
    category: 'deposits',
    question: 'What is the process for resolving a disputed damage report?',
    answer:
      'When a renter disputes a damage report, both the vendor inspection evidence and renter statements are reviewed by Rent4Fraction support to arrive at a fair, documented resolution.',
  },
  {
    id: 'faq-13',
    category: 'deposits',
    question: 'Who is liable for equipment damage or operational misuse?',
    answer:
      'Renters are responsible for returning equipment in the same working condition as received. Vendors provide equipment testing upon collection or handover.',
  },
  {
    id: 'faq-14',
    category: 'vendors',
    question: 'How are vendor payouts processed following completed rentals?',
    answer:
      'Following successful return inspection, vendor payouts are calculated based on gross rental rates less the agreed platform commission rate, and transferred directly to registered bank accounts.',
  },
]

export const FAQ_CATEGORIES = [
  { id: 'all', label: 'All questions' },
  { id: 'bookings', label: 'Bookings' },
  { id: 'deposits', label: 'Security deposits' },
  { id: 'delivery', label: 'Delivery & pickup' },
  { id: 'vendors', label: 'Vendors & payouts' },
  { id: 'payments', label: 'Payments' },
  { id: 'general', label: 'General & security' },
]

export function FaqTab() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')

  const filteredFaqs = useMemo(() => {
    return FAQ_DATA.filter((item) => {
      const matchesCategory =
        selectedCategory === 'all' || item.category === selectedCategory

      const matchesQuery =
        !searchQuery.trim() ||
        item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.answer.toLowerCase().includes(searchQuery.toLowerCase())

      return matchesCategory && matchesQuery
    })
  }, [searchQuery, selectedCategory])

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="space-y-2">
        <h2 className="font-serif text-2xl sm:text-3xl font-bold text-foreground">
          Frequently Asked Questions
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Find answers regarding booking terms, deposit return policies, and equipment handover.
        </p>
      </div>

      {/* Search and Category Filter */}
      <FaqSearch
        query={searchQuery}
        onQueryChange={setSearchQuery}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        categories={FAQ_CATEGORIES}
      />

      {/* Accordion List */}
      {filteredFaqs.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground space-y-3 rounded-2xl border border-dashed border-border bg-surface">
          <MessageSquare className="size-8 mx-auto opacity-40 mb-1" />
          <h3 className="font-serif text-lg font-bold text-foreground">
            No matching questions found
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            We couldn’t find any questions matching &ldquo;{searchQuery}&rdquo;. Try another term or contact support.
          </p>
          <div className="pt-2">
            <AppLink to="/help?tab=contact">
              <Button variant="outline" size="sm" className="text-xs">
                Contact our support team
              </Button>
            </AppLink>
          </div>
        </div>
      ) : (
        <Accordion type="single" collapsible className="w-full space-y-2">
          {filteredFaqs.map((item) => (
            <AccordionItem
              key={item.id}
              value={item.id}
              className="rounded-xl border border-border bg-surface px-4 shadow-xs"
            >
              <AccordionTrigger className="text-sm sm:text-base font-semibold py-4 hover:no-underline">
                <HighlightText text={item.question} query={searchQuery} />
              </AccordionTrigger>
              <AccordionContent className="text-xs sm:text-sm text-muted-foreground leading-relaxed pt-1 pb-4">
                <HighlightText text={item.answer} query={searchQuery} />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      {/* "Still Need Help?" Card */}
      <div className="p-6 rounded-2xl border border-border bg-surface shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="size-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center shrink-0">
            <MessageCircle className="size-5" />
          </div>
          <div>
            <h3 className="font-serif text-base font-bold text-foreground">
              Still need assistance?
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Send us a message with your booking details and our team will be glad to assist you.
            </p>
          </div>
        </div>

        <AppLink to="/help?tab=contact">
          <Button className="bg-brand hover:bg-brand-hover text-white text-xs whitespace-nowrap shrink-0">
            Contact us
          </Button>
        </AppLink>
      </div>
    </div>
  )
}
