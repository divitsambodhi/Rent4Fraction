export type HelpTab =
  | 'about'
  | 'how-it-works'
  | 'faq'
  | 'contact'
  | 'terms'
  | 'privacy'
  | 'refunds'

export type FaqCategory =
  | 'all'
  | 'booking'
  | 'bookings'
  | 'pricing'
  | 'payments'
  | 'fulfillment'
  | 'delivery'
  | 'policies'
  | 'account'
  | 'general'
  | 'deposits'
  | 'vendors'

export interface HelpFaqItem {
  id: string
  question: string
  answer: string
  category: FaqCategory | string
}

export type ContactTopic =
  | 'booking_issue'
  | 'payment_query'
  | 'vendor_application'
  | 'damage_dispute'
  | 'other'

export interface ContactFormData {
  name: string
  email: string
  topic: ContactTopic
  booking_number?: string
  message: string
  consent: boolean
}
