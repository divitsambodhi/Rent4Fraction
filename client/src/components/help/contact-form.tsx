import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CheckCircle2, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'

const contactSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(80),
  email: z.string().email('Please enter a valid email address'),
  topic: z.enum([
    'booking_issue',
    'payment_deposit',
    'vendor_application',
    'damage_dispute',
    'equipment_inquiry',
    'other',
  ]),
  booking_number: z.string().optional(),
  message: z
    .string()
    .min(10, 'Message must be at least 10 characters')
    .max(1000, 'Message cannot exceed 1000 characters'),
  consent: z.boolean().refine((val) => val === true, {
    message: 'You must agree before submitting',
  }),
})

export type ContactFormData = z.infer<typeof contactSchema>

interface ContactFormProps {
  onSubmitMessage: (data: ContactFormData) => Promise<boolean>
}

export function ContactForm({ onSubmitMessage }: ContactFormProps) {
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: '',
      email: '',
      topic: 'booking_issue',
      booking_number: '',
      message: '',
      consent: false,
    },
  })

  const messageText = watch('message') || ''

  const handleFormSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true)
    try {
      const ok = await onSubmitMessage(data)
      if (ok) {
        setSubmitted(true)
        reset()
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="p-8 rounded-2xl border border-success/30 bg-success/5 text-center space-y-4">
        <div className="size-12 rounded-full bg-success/15 text-success mx-auto flex items-center justify-center">
          <CheckCircle2 className="size-6" />
        </div>
        <div className="space-y-1">
          <h3 className="font-serif text-xl font-bold text-foreground">
            Thank you, we’ve received your message
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
            Our support team has recorded your inquiry along with your reference details. We will review your context and follow up via email.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSubmitted(false)}
          className="text-xs mt-2"
        >
          Send another inquiry
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="contact-name" className="text-xs font-semibold text-foreground block mb-1">
            Your Name <span className="text-danger">*</span>
          </label>
          <input
            id="contact-name"
            type="text"
            {...register('name')}
            placeholder="e.g. Diya Shah"
            className="w-full text-xs sm:text-sm p-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-brand"
          />
          {errors.name && (
            <p className="text-[11px] text-danger mt-1">{errors.name.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="contact-email" className="text-xs font-semibold text-foreground block mb-1">
            Email Address <span className="text-danger">*</span>
          </label>
          <input
            id="contact-email"
            type="email"
            {...register('email')}
            placeholder="you@example.com"
            className="w-full text-xs sm:text-sm p-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-brand"
          />
          {errors.email && (
            <p className="text-[11px] text-danger mt-1">{errors.email.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="contact-topic" className="text-xs font-semibold text-foreground block mb-1">
            Inquiry Topic <span className="text-danger">*</span>
          </label>
          <select
            id="contact-topic"
            {...register('topic')}
            className="w-full text-xs sm:text-sm p-3 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-brand cursor-pointer"
          >
            <option value="booking_issue">Booking Issue</option>
            <option value="payment_deposit">Payment or Security Deposit</option>
            <option value="vendor_application">Vendor Application</option>
            <option value="damage_dispute">Damage Report Dispute</option>
            <option value="equipment_inquiry">Equipment Specifications</option>
            <option value="other">Other Inquiry</option>
          </select>
        </div>

        <div>
          <label htmlFor="contact-booking" className="text-xs font-semibold text-foreground block mb-1">
            Booking Number <span className="text-muted-foreground text-[10px] font-normal">(Optional)</span>
          </label>
          <input
            id="contact-booking"
            type="text"
            {...register('booking_number')}
            placeholder="e.g. BK-2026-0412"
            className="w-full text-xs sm:text-sm p-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-brand uppercase"
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label htmlFor="contact-msg" className="text-xs font-semibold text-foreground">
            Message <span className="text-danger">*</span>
          </label>
          <span className="text-[11px] text-muted-foreground tabular-nums">
            {messageText.length}/1000
          </span>
        </div>
        <textarea
          id="contact-msg"
          rows={5}
          maxLength={1000}
          {...register('message')}
          placeholder="Please describe your question or issue in detail..."
          className="w-full text-xs sm:text-sm p-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-brand resize-y"
        />
        {errors.message && (
          <p className="text-[11px] text-danger mt-1">{errors.message.message}</p>
        )}
      </div>

      <div>
        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            {...register('consent')}
            className="rounded border-border text-brand focus:ring-brand size-4 mt-0.5"
          />
          <span className="text-xs text-muted-foreground leading-normal">
            I agree that Rent4Fraction can use this information and contact details to respond to my inquiry.
          </span>
        </label>
        {errors.consent && (
          <p className="text-[11px] text-danger mt-1">{errors.consent.message}</p>
        )}
      </div>

      <div className="pt-2">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-brand hover:bg-brand-hover text-white text-xs gap-1.5 h-9"
        >
          <Send className="size-3.5" />
          <span>{isSubmitting ? 'Sending inquiry...' : 'Send message'}</span>
        </Button>
      </div>
    </form>
  )
}
