import { useState } from 'react'
import { Loader2, MessageSquare, Send } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/providers/auth-provider'
import { useAppNavigate } from '@/components/shared/app-link'
import { sendVendorMessage } from '@/lib/api'

interface MessageVendorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  vendorId: string
  vendorName: string
  equipmentId: string
  equipmentName: string
}

export function MessageVendorDialog({
  open,
  onOpenChange,
  vendorId,
  vendorName,
  equipmentId,
  equipmentName,
}: MessageVendorDialogProps) {
  const { role, user } = useAuth()
  const navigate = useAppNavigate()

  const [subject, setSubject] = useState(`About: ${equipmentName}`)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  const charLimit = 500
  const charRemaining = charLimit - message.length

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || sending) return

    setSending(true)
    try {
      await sendVendorMessage({
        vendor_id: vendorId,
        equipment_id: equipmentId,
        subject: subject.trim(),
        message: message.trim(),
        customer_name: user?.name,
      })

      toast.success(`Message sent to ${vendorName}`, {
        description: 'The vendor will reply via your account messages inbox.',
      })
      setMessage('')
      onOpenChange(false)
    } catch {
      toast.error('Failed to send message. Please try again.')
    } finally {
      setSending(false)
    }
  }

  const handleVisitorLogin = () => {
    const redirectUrl =
      typeof window !== 'undefined'
        ? window.location.pathname + window.location.search
        : `/equipment/${equipmentId}`
    onOpenChange(false)
    navigate(`/auth?mode=login&redirect=${encodeURIComponent(redirectUrl)}`)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-surface border-border">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2 text-brand">
            <MessageSquare className="size-5" />
            <span className="text-xs font-semibold text-brand">
              Vendor Inquiry
            </span>
          </div>
          <DialogTitle className="text-xl font-bold font-serif text-foreground">
            Message {vendorName}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Inquire about setup options, venue delivery, or special technical requirements.
          </DialogDescription>
        </DialogHeader>

        {/* ROLE: VISITOR */}
        {role === 'visitor' ? (
          <div className="py-6 text-center space-y-4">
            <p className="text-sm text-foreground/80">
              Please log in with a customer account to send messages to vendors.
            </p>
            <Button
              type="button"
              onClick={handleVisitorLogin}
              className="w-full h-11 font-semibold rounded-[10px]"
            >
              Log in to message vendor
            </Button>
          </div>
        ) : role === 'vendor' || role === 'admin' ? (
          /* ROLE: VENDOR / ADMIN */
          <div className="py-6 text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              Direct vendor-to-vendor messaging is disabled. Please switch to a customer account to inquire about rentals.
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full h-10 text-xs"
            >
              Close
            </Button>
          </div>
        ) : (
          /* ROLE: CUSTOMER */
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label
                htmlFor="vendor-msg-subject"
                className="text-xs font-semibold text-foreground"
              >
                Subject
              </label>
              <input
                id="vendor-msg-subject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                className="w-full h-10 px-3 rounded-[8px] border border-border bg-surface text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                <label htmlFor="vendor-msg-body">Your message</label>
                <span
                  className={charRemaining < 0 ? 'text-danger' : 'text-muted-foreground'}
                >
                  {charRemaining} left
                </span>
              </div>
              <textarea
                id="vendor-msg-body"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ask about delivery timings, power requirements, or custom configurations..."
                maxLength={charLimit}
                rows={4}
                required
                className="w-full p-3 rounded-[8px] border border-border bg-surface text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand resize-none leading-relaxed"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="h-10 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={sending || !message.trim() || charRemaining < 0}
                className="h-10 px-4 text-xs font-semibold gap-1.5"
              >
                {sending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <Send className="size-3.5" />
                    <span>Send message</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
