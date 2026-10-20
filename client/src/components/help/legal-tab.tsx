import { PlaceholderNotice } from './placeholder-notice'
import { TableOfContents } from './table-of-contents'

interface LegalTabProps {
  type: 'terms' | 'privacy' | 'refunds'
}

interface LegalDocConfig {
  title: string
  lastUpdated: string
  sections: { id: string; title: string; content: string[] }[]
}

const LEGAL_DOCS: Record<'terms' | 'privacy' | 'refunds', LegalDocConfig> = {
  terms: {
    title: 'Terms of Service',
    lastUpdated: '20 October 2026',
    sections: [
      {
        id: 'sec-1',
        title: '1. Definitions & Scope',
        content: [
          'These terms govern the use of the Rent4Fraction platform, connecting equipment renters with independent third-party equipment vendors.',
          'By creating an account or completing a booking, users agree to adhere to these service conditions and platform rules.',
        ],
      },
      {
        id: 'sec-2',
        title: '2. Platform Eligibility & Accounts',
        content: [
          'Users must provide verified contact and identity information when creating accounts or applying as vendor partners.',
          'Account credentials must remain confidential. Users are responsible for activity conducted through their authorized accounts.',
        ],
      },
      {
        id: 'sec-3',
        title: '3. Rental Bookings & Equipment Use',
        content: [
          'Renters agree to utilize equipment strictly in accordance with manufacturer guidelines and vendor instructions.',
          'Equipment must not be subleased, altered, or transported beyond agreed event venues without prior vendor consent.',
        ],
      },
      {
        id: 'sec-4',
        title: '4. Vendor Responsibilities & Handover',
        content: [
          'Vendors agree to maintain listed equipment in safe, functional operating condition and provide accurate catalogue specifications.',
          'Handover testing should be conducted upon delivery or collection to verify operational readiness before event commencement.',
        ],
      },
      {
        id: 'sec-5',
        title: '5. Limitation of Liability',
        content: [
          'Rent4Fraction operates as an intermediary marketplace and is not liable for direct, indirect, or incidental event damages arising from equipment operation.',
          'Parties agree to handle operational claims directly through platform resolution and inspection procedures.',
        ],
      },
      {
        id: 'sec-6',
        title: '6. Governing Law & Dispute Resolution',
        content: [
          'These terms are interpreted in accordance with applicable laws in India. Any legal proceedings shall be subject to competent jurisdiction.',
        ],
      },
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    lastUpdated: '20 October 2026',
    sections: [
      {
        id: 'sec-1',
        title: '1. Information Collected',
        content: [
          'We collect information required to facilitate equipment rental bookings, including names, contact numbers, email addresses, and venue delivery addresses.',
          'For vendor partners, business registration records, tax identifiers, and payment bank account details are collected for verification and payout disbursements.',
        ],
      },
      {
        id: 'sec-2',
        title: '2. How We Use Information',
        content: [
          'Collected data is utilized solely to coordinate equipment handover, process rental payments, communicate booking updates, and enforce trust and safety standards.',
        ],
      },
      {
        id: 'sec-3',
        title: '3. Information Sharing & Third Parties',
        content: [
          'Renter contact details and delivery coordinates are shared with fulfilling vendors solely for booking coordination.',
          'We do not sell personal information to advertising brokers or external marketing networks.',
        ],
      },
      {
        id: 'sec-4',
        title: '4. Data Security & Storage',
        content: [
          'We implement industry-standard encryption protocols and secure storage mechanisms to protect user and operational data against unauthorized access.',
        ],
      },
      {
        id: 'sec-5',
        title: '5. Your Rights & Preferences',
        content: [
          'Users may access, review, and update their account information through the Customer Hub or Vendor Portal settings, or request account closure.',
        ],
      },
      {
        id: 'sec-6',
        title: '6. Contact & Data Inquiries',
        content: [
          'For questions or privacy requests regarding your personal data, please contact our support desk through the Contact Support tab.',
        ],
      },
    ],
  },
  refunds: {
    title: 'Refund & Deposit Policy',
    lastUpdated: '20 October 2026',
    sections: [
      {
        id: 'sec-1',
        title: '1. Cancellation by Renter',
        content: [
          'Renters may initiate booking cancellations directly from the account portal prior to scheduled handover times.',
          'Refund eligibility and applicable rental amounts returned are calculated according to the timing of the cancellation request relative to the booking start date.',
        ],
      },
      {
        id: 'sec-2',
        title: '2. Cancellation by Vendor',
        content: [
          'If a vendor is unable to fulfill confirmed equipment due to unforeseen operational breakdown, the affected order is cancelled and refunded in full, including rental and security deposit amounts.',
        ],
      },
      {
        id: 'sec-3',
        title: '3. Security Deposit Processing & Deductions',
        content: [
          'Security deposits are held in escrow for the duration of the rental. Once equipment is returned in full and verified by the vendor, deposit funds are released.',
          'If equipment damage or missing accessories are reported during post-rental inspection, deductions may be applied in accordance with the inspection damage report.',
        ],
      },
      {
        id: 'sec-4',
        title: '4. Inspection Damage Claims',
        content: [
          'Vendors must submit photographic evidence and itemized repair estimates when claiming damage deductions.',
          'Renters have the option to accept the deduction or file a dispute for administrative review by Rent4Fraction.',
        ],
      },
      {
        id: 'sec-5',
        title: '5. Processing Method',
        content: [
          'Approved refunds and released deposits are credited back to the original payment instrument used during checkout.',
        ],
      },
      {
        id: 'sec-6',
        title: '6. Dispute Inquiries',
        content: [
          'For inquiries regarding refund calculations or deposit disbursements, contact our support team using your booking reference number.',
        ],
      },
    ],
  },
}

export function LegalTab({ type }: LegalTabProps) {
  const doc = LEGAL_DOCS[type]

  const tocSections = doc.sections.map((s) => ({
    id: s.id,
    title: s.title,
  }))

  return (
    <div className="flex flex-col lg:flex-row gap-8 items-start">
      {/* Long-text Column (Max width 720px, 17px/28px typography) */}
      <article className="flex-1 max-w-[720px] space-y-6">
        <div>
          <p className="text-xs font-semibold text-muted-foreground">
            Platform Policies
          </p>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-foreground mt-1">
            {doc.title}
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Last updated: {doc.lastUpdated}
          </p>
        </div>

        {/* Visible Placeholder Warning Notice */}
        <PlaceholderNotice />

        {/* Numbered Sections */}
        <div className="space-y-8 pt-2">
          {doc.sections.map((section) => (
            <section key={section.id} id={section.id} className="space-y-3 scroll-mt-28">
              <h3 className="font-serif text-lg font-bold text-foreground">
                {section.title}
              </h3>
              {section.content.map((p, idx) => (
                <p
                  key={idx}
                  className="text-[17px] leading-[28px] text-foreground/85 font-normal"
                >
                  {p}
                </p>
              ))}
            </section>
          ))}
        </div>
      </article>

      {/* Sticky Table of Contents (Right) */}
      <div className="hidden lg:block w-56 shrink-0">
        <TableOfContents sections={tocSections} />
      </div>
    </div>
  )
}
