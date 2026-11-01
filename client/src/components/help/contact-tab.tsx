import { Mail, MapPin, Phone, ShieldCheck } from 'lucide-react'
import { ContactForm, type ContactFormData } from './contact-form'
import { toast } from 'sonner'

export function ContactTab() {
  const handleSubmitMessage = async (_data: ContactFormData): Promise<boolean> => {
    // 600ms mock submission per spec
    await new Promise((resolve) => setTimeout(resolve, 600))
    toast.success('Inquiry submitted successfully.')
    return true
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="space-y-2">
        <h2 className="font-serif text-2xl sm:text-3xl font-bold text-foreground">
          Contact Support
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Need help with an ongoing booking, equipment handover, or vendor application? Reach out to our operations team.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Contact Form (Left) */}
        <div className="lg:col-span-8 p-6 rounded-2xl border border-border bg-surface shadow-xs">
          <ContactForm onSubmitMessage={handleSubmitMessage} />
        </div>

        {/* Side Info Card (Right) */}
        <div className="lg:col-span-4 p-6 rounded-2xl border border-border bg-surface shadow-xs space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-border">
            <Mail className="size-4 text-brand" />
            <h3 className="font-serif text-base font-bold text-foreground">
              Direct Contact
            </h3>
          </div>

          <div className="space-y-4 text-xs">
            <div className="flex items-start gap-3">
              <Mail className="size-4 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <span className="text-muted-foreground block text-[11px]">Support Email</span>
                <span className="font-semibold text-foreground">divitsambodhi67@gmail.com</span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Phone className="size-4 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <span className="text-muted-foreground block text-[11px]">Phone Support</span>
                <span className="font-semibold text-foreground">+91 9316532780</span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="size-4 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <span className="text-muted-foreground block text-[11px]">Operations Centre</span>
                <span className="font-semibold text-foreground">
                  SVNIT, Surat, Gujarat 395007
                </span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-border/60 text-[11px] text-muted-foreground leading-relaxed space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-foreground">
              <ShieldCheck className="size-3.5 text-brand" />
              <span>Inquiry Notice</span>
            </div>
            <p>
              Support availability varies across communication channels. When inquiring about an active booking, please include your booking number.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
