import { PlaceholderNotice } from './placeholder-notice'
import { TableOfContents } from './table-of-contents'

interface LegalTabProps {
  type: 'terms' | 'privacy' | 'refunds'
}

interface LegalDocConfig {
  title: string
  lastUpdated: string
  sections: { id: string; title: string; content: string[] }[]
  hasDataInventory?: boolean
}

const LEGAL_DOCS: Record<'terms' | 'privacy' | 'refunds', LegalDocConfig> = {
  terms: {
    title: 'Terms of Service',
    lastUpdated: '21 October 2026',
    sections: [
      {
        id: 'sec-1',
        title: '1. Definitions and Scope',
        content: [
          'These terms govern the use of the Rent4Fraction marketplace, which connects equipment renters with independent third-party equipment vendors.',
          'By creating an account or completing an order, users agree to adhere to these service conditions and platform rules.',
        ],
      },
      {
        id: 'sec-2',
        title: '2. Accounts and Roles',
        content: [
          'The platform supports three distinct roles: Customers, Vendors, and Administrators. Customers rent equipment, Vendors list inventory and fulfill bookings, and Administrators review vendor applications and arbitrate disputes.',
          'Users must provide verified contact and identity information. Account credentials must remain confidential.',
        ],
      },
      {
        id: 'sec-3',
        title: '3. Rental Bookings and Equipment Use',
        content: [
          'Renters agree to utilize equipment in accordance with vendor operating guidelines and standard safety instructions.',
          'Equipment must not be subleased or transported beyond agreed event venues without prior vendor consent.',
        ],
      },
      {
        id: 'sec-4',
        title: '4. Vendor Responsibilities',
        content: [
          'Vendors agree to maintain listed equipment in functional operating condition and provide accurate inventory specifications.',
          'Vendors conduct handover testing upon delivery or collection to verify operational readiness before event commencement.',
        ],
      },
      {
        id: 'sec-5',
        title: '5. Limitation of Liability',
        content: [
          'Rent4Fraction operates as an intermediary marketplace and is not liable for direct, indirect, or incidental event damages arising from equipment operation.',
          'DRAFT FOR REVIEW: Specific dispute arbitrations and damage fee limitations are subject to final platform legal review.',
        ],
      },
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    lastUpdated: '21 October 2026',
    hasDataInventory: true,
    sections: [
      {
        id: 'sec-1',
        title: '1. Introduction and Scope',
        content: [
          'This Privacy Policy describes the actual data practices of Rent4Fraction across authentication, checkout, customer account management, vendor operations, and administration.',
          'DRAFT FOR REVIEW: All data handling details below reflect current codebase implementations and are marked for final legal confirmation.',
        ],
      },
      {
        id: 'sec-2',
        title: '2. Data Inventory',
        content: [
          'The table below summarizes each category of data processed by the platform, the operational purpose, the storage location, and who can access it.',
        ],
      },
      {
        id: 'sec-3',
        title: '3. Third-Party Service Providers',
        content: [
          'Firebase Authentication (to be confirmed): Manages user identity verification, secure token exchange, and password hashing.',
          'Payment Provider (to be confirmed): Handles payment card entry and processing. Card details are never handled, processed, or stored on Rent4Fraction servers.',
          'Database Hosting (to be confirmed): Stores platform relational data, orders, messages, and inventory listings.',
          'Application Hosting (to be confirmed): Serves the frontend web application bundles and static assets.',
        ],
      },
      {
        id: 'sec-4',
        title: '4. Browser Local Storage',
        content: [
          'The web application utilizes the following browser localStorage keys: "r4f_theme" (persists light or dark interface preference), "r4f_active_role" (session role state for mock environment: visitor, customer, vendor, admin), "r4f_auth_user" (active user session details), "r4f_wishlist_items" (saved equipment identifiers), and "r4f_cart_data" (active booking items and rental dates).',
        ],
      },
      {
        id: 'sec-5',
        title: '5. Data Retention and User Rights',
        content: [
          'DRAFT FOR REVIEW: Precise data retention periods, legal contact details, and statutory regulatory jurisdictions are to be confirmed before commercial deployment.',
        ],
      },
    ],
  },
  refunds: {
    title: 'Refund and Security Deposit Policy',
    lastUpdated: '21 October 2026',
    sections: [
      {
        id: 'sec-1',
        title: '1. Cancellation and Rental Refunds',
        content: [
          'Renters may initiate booking cancellations directly from their account dashboard prior to scheduled handover times.',
          'Refund eligibility and rental amounts returned are calculated based on the timing of cancellation relative to the event start date.',
        ],
      },
      {
        id: 'sec-2',
        title: '2. Security Deposit Protection',
        content: [
          'Security deposits are held securely for the duration of the rental. Once equipment is returned in full and verified by the vendor, deposit funds are released.',
          'If damage or missing equipment is reported during post-rental inspection, deductions may be applied in accordance with the inspection report.',
        ],
      },
      {
        id: 'sec-3',
        title: '3. Inspection Claims and Arbitration',
        content: [
          'Vendors must submit inspection details and itemized repair costs when claiming deductions. Renters may review the claim and submit a dispute for administrative arbitration.',
          'DRAFT FOR REVIEW: Arbitration timelines and maximum claim caps are subject to platform policy confirmation.',
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
      <article className="flex-1 max-w-[720px] space-y-6">
        <div>
          <p className="text-label-sm font-semibold text-text-secondary">
            Platform Documentation
          </p>
          <h2 className="text-headline-md font-bold text-foreground mt-1">
            {doc.title}
          </h2>
          <p className="text-label-sm text-text-secondary mt-1">
            Last updated: {doc.lastUpdated}
          </p>
        </div>

        <PlaceholderNotice />

        <div className="space-y-8 pt-2">
          {doc.sections.map((section) => (
            <section key={section.id} id={section.id} className="space-y-3 scroll-mt-24">
              <h3 className="text-body-md font-bold text-foreground">
                {section.title}
              </h3>
              {section.content.map((p, idx) => (
                <p
                  key={idx}
                  className="text-body-md leading-relaxed text-text-secondary font-normal"
                >
                  {p}
                </p>
              ))}

              {/* Data Inventory Table for Privacy Tab */}
              {doc.hasDataInventory && section.id === 'sec-2' && (
                <div className="mt-4 overflow-x-auto rounded-sm border border-border">
                  <table className="w-full text-left text-body-sm border-collapse">
                    <thead>
                      <tr className="border-b border-border bg-muted/60 text-text-secondary font-semibold">
                        <th className="p-3">Data category</th>
                        <th className="p-3">Purpose</th>
                        <th className="p-3">Storage location</th>
                        <th className="p-3">Access scope</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      <tr>
                        <td className="p-3 font-medium text-foreground">Account profile</td>
                        <td className="p-3 text-text-secondary">Name, email, phone, authentication ID</td>
                        <td className="p-3 text-text-secondary">Firebase Auth and Database</td>
                        <td className="p-3 text-text-secondary">User, Admin</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-medium text-foreground">Saved addresses</td>
                        <td className="p-3 text-text-secondary">Event venues and delivery destinations</td>
                        <td className="p-3 text-text-secondary">Database</td>
                        <td className="p-3 text-text-secondary">User, Fulfilling Vendors</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-medium text-foreground">Booking details</td>
                        <td className="p-3 text-text-secondary">Equipment, dates, delivery addresses, status</td>
                        <td className="p-3 text-text-secondary">Database</td>
                        <td className="p-3 text-text-secondary">Customer, Fulfilling Vendors, Admin</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-medium text-foreground">Payment records</td>
                        <td className="p-3 text-text-secondary">Transaction reference, amount, deposit status (card details not stored)</td>
                        <td className="p-3 text-text-secondary">Payment Provider (to be confirmed)</td>
                        <td className="p-3 text-text-secondary">Customer, Admin</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-medium text-foreground">Messages</td>
                        <td className="p-3 text-text-secondary">Communications regarding orders and damage inquiries</td>
                        <td className="p-3 text-text-secondary">Database</td>
                        <td className="p-3 text-text-secondary">Sender, Recipient, Admin</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-medium text-foreground">Vendor business details</td>
                        <td className="p-3 text-text-secondary">Business name, GST number, bank payout details</td>
                        <td className="p-3 text-text-secondary">Database</td>
                        <td className="p-3 text-text-secondary">Vendor, Admin</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-medium text-foreground">Reviews and ratings</td>
                        <td className="p-3 text-text-secondary">Public feedback on equipment performance</td>
                        <td className="p-3 text-text-secondary">Database</td>
                        <td className="p-3 text-text-secondary">Public</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ))}
        </div>
      </article>

      <div className="hidden lg:block w-56 shrink-0">
        <TableOfContents sections={tocSections} />
      </div>
    </div>
  )
}
