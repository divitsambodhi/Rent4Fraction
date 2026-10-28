import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/shared/form-field'
import { useAuth } from '@/providers/auth-provider'
import { toast } from 'sonner'
import { Loader2, ShieldCheck } from 'lucide-react'

export function CompleteProfileDialog() {
  const { needsProfileUser, setNeedsProfileUser, completeRegistration } = useAuth()
  const [name, setName] = useState(needsProfileUser?.name || '')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState<'customer' | 'vendor'>('customer')
  const [businessName, setBusinessName] = useState('')
  const [city, setCity] = useState('')
  const [address, setAddress] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!needsProfileUser) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Please enter your full name')
      return
    }

    if (!phone || !/^[6-9]\d{9}$/.test(phone.trim())) {
      setError('Please enter a valid 10-digit mobile number for delivery verification')
      return
    }

    if (role === 'vendor') {
      if (!businessName.trim()) {
        setError('Business name is required for vendor accounts')
        return
      }
      if (!city.trim() || !address.trim()) {
        setError('Business address and city are required for vendor accounts')
        return
      }
    }

    try {
      setSubmitting(true)
      await completeRegistration({
        role,
        name: name.trim(),
        phone: phone.trim(),
        business:
          role === 'vendor'
            ? {
                name: name.trim(),
                email: needsProfileUser.email,
                phone: phone.trim(),
                password: '',
                business_name: businessName.trim(),
                business_address: address.trim(),
                city: city.trim(),
              }
            : undefined,
      })
      toast.success('Registration complete! Welcome to Rent4Fraction.')
      setNeedsProfileUser(null)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={!!needsProfileUser} onOpenChange={(open) => !open && setNeedsProfileUser(null)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-brand mb-1">
            <ShieldCheck className="size-5" />
            <span className="text-xs font-semibold uppercase tracking-wider">Complete Your Profile</span>
          </div>
          <DialogTitle className="text-lg font-bold">One last step!</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            You signed in with <strong>{needsProfileUser.email}</strong>. Because Rent4Fraction operates on Cash on Delivery, a valid mobile phone number is required on your profile.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 text-xs rounded-lg bg-destructive/10 text-destructive border border-destructive/20">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <FormField label="Full Name" htmlFor="profile-name" required>
            {({ id }) => (
              <Input
                id={id}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                disabled={submitting}
                className="h-10 text-sm"
              />
            )}
          </FormField>

          <FormField
            label="Mobile Number"
            htmlFor="profile-phone"
            required
            hint="Used by vendors to coordinate cash collection upon delivery"
          >
            {({ id }) => (
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-mono">
                  +91
                </span>
                <Input
                  id={id}
                  type="tel"
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="9876543210"
                  disabled={submitting}
                  className="pl-11 h-10 text-sm font-mono"
                />
              </div>
            )}
          </FormField>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">I want to:</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRole('customer')}
                className={`p-2.5 rounded-lg border text-xs font-medium text-center transition-all cursor-pointer ${
                  role === 'customer'
                    ? 'border-brand bg-brand/10 text-brand font-semibold ring-1 ring-brand'
                    : 'border-border text-muted-foreground hover:bg-muted/50'
                }`}
              >
                Rent Equipment
              </button>
              <button
                type="button"
                onClick={() => setRole('vendor')}
                className={`p-2.5 rounded-lg border text-xs font-medium text-center transition-all cursor-pointer ${
                  role === 'vendor'
                    ? 'border-brand bg-brand/10 text-brand font-semibold ring-1 ring-brand'
                    : 'border-border text-muted-foreground hover:bg-muted/50'
                }`}
              >
                List & Supply Gear
              </button>
            </div>
          </div>

          {role === 'vendor' && (
            <div className="space-y-3 p-3 rounded-lg bg-muted/40 border border-border/60">
              <FormField label="Business Name" htmlFor="vendor-biz-name" required>
                {({ id }) => (
                  <Input
                    id={id}
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="E.g. Creative Lens Rentals"
                    disabled={submitting}
                    className="h-9 text-xs"
                  />
                )}
              </FormField>

              <div className="grid grid-cols-2 gap-2">
                <FormField label="City" htmlFor="vendor-city" required>
                  {({ id }) => (
                    <Input
                      id={id}
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Mumbai"
                      disabled={submitting}
                      className="h-9 text-xs"
                    />
                  )}
                </FormField>
                <FormField label="Address" htmlFor="vendor-address" required>
                  {({ id }) => (
                    <Input
                      id={id}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Andheri West"
                      disabled={submitting}
                      className="h-9 text-xs"
                    />
                  )}
                </FormField>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setNeedsProfileUser(null)}
              disabled={submitting}
              className="text-xs h-9 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-brand hover:bg-brand-hover text-white text-xs h-9 font-medium cursor-pointer"
            >
              {submitting ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Saving…</span>
                </span>
              ) : (
                'Save & Continue'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

