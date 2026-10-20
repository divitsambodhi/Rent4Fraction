import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AlertCircle, RotateCcw, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/account/confirm-dialog'
import { LogoUploader } from './logo-uploader'
import type { VendorProfile } from '@/types/vendor'

const businessDetailsSchema = z.object({
  name: z
    .string()
    .min(3, 'Business name must be at least 3 characters')
    .max(80, 'Business name cannot exceed 80 characters'),
  description: z
    .string()
    .max(500, 'Description cannot exceed 500 characters'),
  address: z.string().min(3, 'Please enter a valid business address'),
  city: z.string().min(2, 'Please enter a valid city'),
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian phone number starting with 6-9'),
  gst: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/.test(val),
      'Enter a valid 15-character GSTIN format (e.g. 29ABCDE1234F1Z5)',
    ),
  logo: z.string().optional(),
})

export type BusinessDetailsFormData = z.infer<typeof businessDetailsSchema>

interface BusinessDetailsFormProps {
  initialProfile: VendorProfile
  onSave: (data: BusinessDetailsFormData) => Promise<void>
  disabled?: boolean
  readOnlyReason?: string
}

export function BusinessDetailsForm({
  initialProfile,
  onSave,
  disabled = false,
  readOnlyReason,
}: BusinessDetailsFormProps) {
  const [showResetDialog, setShowResetDialog] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isDirty },
  } = useForm<BusinessDetailsFormData>({
    resolver: zodResolver(businessDetailsSchema),
    defaultValues: {
      name: initialProfile.business_name,
      description: initialProfile.description || '',
      address: initialProfile.address,
      city: initialProfile.city,
      phone: initialProfile.phone.replace(/^\+91\s?/, ''),
      gst: initialProfile.gst || '',
      logo: initialProfile.logo || '',
    },
  })

  const descriptionValue = watch('description') || ''
  const logoValue = watch('logo') || ''

  // Unsaved changes beforeunload guard
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault()
        e.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [isDirty])

  const onSubmit = async (data: BusinessDetailsFormData) => {
    setIsSubmitting(true)
    try {
      await onSave({
        ...data,
        phone: data.phone.startsWith('+91') ? data.phone : `+91 ${data.phone}`,
      })
      reset(data)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleConfirmReset = () => {
    reset({
      name: initialProfile.business_name,
      description: initialProfile.description || '',
      address: initialProfile.address,
      city: initialProfile.city,
      phone: initialProfile.phone.replace(/^\+91\s?/, ''),
      gst: initialProfile.gst || '',
      logo: initialProfile.logo || '',
    })
    setShowResetDialog(false)
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-xs space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-border/60">
        <div>
          <h2 className="font-serif text-lg font-bold text-foreground">
            Business details
          </h2>
          <p className="text-xs text-muted-foreground">
            Information shown to customers on equipment detail pages and storefront
          </p>
        </div>
      </div>

      {disabled && readOnlyReason && (
        <div className="p-3.5 rounded-xl border border-warning/30 bg-warning/5 text-xs text-warning flex items-center gap-2">
          <AlertCircle className="size-4 shrink-0" />
          <span>{readOnlyReason}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Logo Uploader */}
        <div>
          <label className="text-xs font-semibold text-foreground block mb-2">
            Storefront Logo
          </label>
          <LogoUploader
            logoUrl={logoValue}
            initials={initialProfile.business_name.slice(0, 2).toUpperCase()}
            onLogoChange={(url) => setValue('logo', url, { shouldDirty: true })}
            disabled={disabled}
          />
        </div>

        {/* Business Name */}
        <div>
          <label htmlFor="business-name" className="text-xs font-semibold text-foreground block mb-1.5">
            Business Name <span className="text-danger">*</span>
          </label>
          <input
            id="business-name"
            type="text"
            disabled={disabled}
            {...register('name')}
            className="w-full text-xs sm:text-sm p-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-brand disabled:opacity-60"
          />
          {errors.name && (
            <p className="text-[11px] text-danger mt-1">{errors.name.message}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="business-desc" className="text-xs font-semibold text-foreground">
              Business Description
            </label>
            <span className="text-[11px] text-muted-foreground tabular-nums">
              {descriptionValue.length}/500
            </span>
          </div>
          <textarea
            id="business-desc"
            rows={4}
            disabled={disabled}
            {...register('description')}
            placeholder="Tell customers about your equipment inventory, experience, and service..."
            className="w-full text-xs sm:text-sm p-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-brand disabled:opacity-60 resize-y"
          />
          {errors.description && (
            <p className="text-[11px] text-danger mt-1">{errors.description.message}</p>
          )}
        </div>

        {/* Address and City */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="business-address" className="text-xs font-semibold text-foreground block mb-1.5">
              Business Address <span className="text-danger">*</span>
            </label>
            <input
              id="business-address"
              type="text"
              disabled={disabled}
              {...register('address')}
              className="w-full text-xs sm:text-sm p-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-brand disabled:opacity-60"
            />
            {errors.address && (
              <p className="text-[11px] text-danger mt-1">{errors.address.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="business-city" className="text-xs font-semibold text-foreground block mb-1.5">
              Operating City <span className="text-danger">*</span>
            </label>
            <input
              id="business-city"
              type="text"
              disabled={disabled}
              {...register('city')}
              className="w-full text-xs sm:text-sm p-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-brand disabled:opacity-60"
            />
            {errors.city && (
              <p className="text-[11px] text-danger mt-1">{errors.city.message}</p>
            )}
          </div>
        </div>

        {/* Phone and GST */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="business-phone" className="text-xs font-semibold text-foreground block mb-1.5">
              Contact Phone (+91) <span className="text-danger">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                +91
              </span>
              <input
                id="business-phone"
                type="tel"
                maxLength={10}
                disabled={disabled}
                {...register('phone')}
                placeholder="9876543210"
                className="w-full text-xs sm:text-sm p-3 pl-12 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-brand disabled:opacity-60 tabular-nums"
              />
            </div>
            {errors.phone && (
              <p className="text-[11px] text-danger mt-1">{errors.phone.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="business-gst" className="text-xs font-semibold text-foreground block mb-1.5">
              GSTIN <span className="text-muted-foreground text-[10px] font-normal">(Optional)</span>
            </label>
            <input
              id="business-gst"
              type="text"
              maxLength={15}
              disabled={disabled}
              {...register('gst')}
              placeholder="29ABCDE1234F1Z5"
              className="w-full text-xs sm:text-sm p-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-brand disabled:opacity-60 uppercase tabular-nums"
            />
            {errors.gst && (
              <p className="text-[11px] text-danger mt-1">{errors.gst.message}</p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        {!disabled && (
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSubmitting || !isDirty}
              onClick={() => {
                if (isDirty) {
                  setShowResetDialog(true)
                }
              }}
              className="text-xs h-9 gap-1.5"
            >
              <RotateCcw className="size-3.5" />
              <span>Reset changes</span>
            </Button>

            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || !isDirty}
              className="bg-brand hover:bg-brand-hover text-white text-xs h-9 gap-1.5"
            >
              <Save className="size-3.5" />
              <span>{isSubmitting ? 'Saving...' : 'Save changes'}</span>
            </Button>
          </div>
        )}
      </form>

      {/* Unsaved Changes Reset Confirmation Dialog */}
      <ConfirmDialog
        open={showResetDialog}
        onOpenChange={setShowResetDialog}
        title="Discard unsaved changes?"
        description="Any unsaved modifications made to your business profile will be reverted to the last saved state."
        confirmLabel="Discard changes"
        cancelLabel="Keep editing"
        variant="danger"
        onConfirm={handleConfirmReset}
      />
    </div>
  )
}
