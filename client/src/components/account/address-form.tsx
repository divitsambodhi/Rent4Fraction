import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import type { Address, AddressLabel } from '@/types/account'
import { cn } from '@/lib/utils'

export const INDIAN_STATES = [
  'Andaman and Nicobar Islands',
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chandigarh',
  'Chhattisgarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jammu and Kashmir',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Ladakh',
  'Lakshadweep',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Puducherry',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
]

const addressSchema = z.object({
  label: z.enum(['Home', 'Office', 'Venue', 'Other']),
  name: z.string().trim().min(2, 'Recipient name must be at least 2 characters'),
  line1: z.string().trim().min(5, 'Street address line 1 must be at least 5 characters'),
  line2: z.string().trim().optional(),
  city: z.string().trim().min(2, 'City is required'),
  state: z.string().trim().min(2, 'Please select a state'),
  pincode: z
    .string()
    .trim()
    .regex(/^[1-9][0-9]{5}$/, 'Enter a valid 6-digit Indian PIN code (e.g. 560001)'),
  is_default: z.boolean(),
})

export type AddressFormData = z.infer<typeof addressSchema>

interface AddressFormProps {
  initialData?: Address | null
  onSubmit: (data: AddressFormData) => Promise<void> | void
  onCancel?: () => void
  submitLabel?: string
}

const LABELS: AddressLabel[] = ['Home', 'Office', 'Venue', 'Other']

export function AddressForm({
  initialData,
  onSubmit,
  onCancel,
  submitLabel = 'Save address',
}: AddressFormProps) {
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      label: initialData?.label || 'Home',
      name: initialData?.name || '',
      line1: initialData?.line1 || '',
      line2: initialData?.line2 || '',
      city: initialData?.city || 'Bengaluru',
      state: initialData?.state || 'Karnataka',
      pincode: initialData?.pincode || '',
      is_default: initialData?.is_default || false,
    },
  })

  const currentLabel = watch('label')

  const handleFormSubmit = async (data: AddressFormData) => {
    setSubmitting(true)
    try {
      await onSubmit(data)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      {/* Label Segmented Control */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-foreground">
          Address type
        </label>
        <div className="grid grid-cols-4 gap-1.5 p-1 rounded-[10px] bg-muted/60 border border-border">
          {LABELS.map((lbl) => (
            <button
              key={lbl}
              type="button"
              onClick={() => setValue('label', lbl)}
              className={cn(
                'h-8 rounded-[7px] text-xs font-semibold transition-all cursor-pointer',
                currentLabel === lbl
                  ? 'bg-surface text-brand shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {/* Recipient Full Name */}
      <div className="space-y-1">
        <label htmlFor="address-name" className="text-xs font-semibold text-foreground">
          Contact name / Event POC
        </label>
        <input
          id="address-name"
          type="text"
          autoComplete="name"
          {...register('name')}
          placeholder="e.g. Aarav Mehta"
          className="w-full h-10 px-3 rounded-[8px] border border-border bg-surface text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand"
        />
        {errors.name && (
          <p className="text-[11px] text-danger">{errors.name.message}</p>
        )}
      </div>

      {/* Address Line 1 */}
      <div className="space-y-1">
        <label htmlFor="address-line1" className="text-xs font-semibold text-foreground">
          Address line 1
        </label>
        <input
          id="address-line1"
          type="text"
          autoComplete="address-line1"
          {...register('line1')}
          placeholder="House/flat no., building name, street"
          className="w-full h-10 px-3 rounded-[8px] border border-border bg-surface text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand"
        />
        {errors.line1 && (
          <p className="text-[11px] text-danger">{errors.line1.message}</p>
        )}
      </div>

      {/* Address Line 2 (Optional) */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs font-semibold text-foreground">
          <label htmlFor="address-line2">Address line 2</label>
          <span className="text-[11px] text-muted-foreground font-normal">Optional</span>
        </div>
        <input
          id="address-line2"
          type="text"
          autoComplete="address-line2"
          {...register('line2')}
          placeholder="Landmark, area, stage or hall name"
          className="w-full h-10 px-3 rounded-[8px] border border-border bg-surface text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand"
        />
      </div>

      {/* City and State */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label htmlFor="address-city" className="text-xs font-semibold text-foreground">
            City
          </label>
          <input
            id="address-city"
            type="text"
            autoComplete="address-level2"
            {...register('city')}
            placeholder="e.g. Bengaluru"
            className="w-full h-10 px-3 rounded-[8px] border border-border bg-surface text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand"
          />
          {errors.city && (
            <p className="text-[11px] text-danger">{errors.city.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <label htmlFor="address-state" className="text-xs font-semibold text-foreground">
            State / Union Territory
          </label>
          <select
            id="address-state"
            autoComplete="address-level1"
            {...register('state')}
            className="w-full h-10 px-3 rounded-[8px] border border-border bg-surface text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-brand"
          >
            {INDIAN_STATES.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
          {errors.state && (
            <p className="text-[11px] text-danger">{errors.state.message}</p>
          )}
        </div>
      </div>

      {/* PIN Code and Country */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label htmlFor="address-pincode" className="text-xs font-semibold text-foreground">
            PIN code (6 digits)
          </label>
          <input
            id="address-pincode"
            type="text"
            inputMode="numeric"
            maxLength={6}
            autoComplete="postal-code"
            {...register('pincode')}
            placeholder="e.g. 560001"
            className="w-full h-10 px-3 rounded-[8px] border border-border bg-surface text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand font-mono tabular-nums"
          />
          {errors.pincode && (
            <p className="text-[11px] text-danger">{errors.pincode.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-foreground">
            Country
          </label>
          <input
            type="text"
            value="India"
            disabled
            autoComplete="country-name"
            className="w-full h-10 px-3 rounded-[8px] border border-border bg-muted/60 text-xs text-muted-foreground cursor-not-allowed"
          />
        </div>
      </div>

      {/* Make Default Checkbox */}
      <div className="pt-1">
        <label className="inline-flex items-center gap-2.5 text-xs font-medium text-foreground cursor-pointer select-none">
          <input
            type="checkbox"
            {...register('is_default')}
            className="rounded border-border text-brand focus:ring-brand size-4"
          />
          <span>Make this my default delivery address</span>
        </label>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={submitting}
            className="h-10 text-xs px-4"
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={submitting}
          className="h-10 px-5 text-xs font-semibold gap-1.5"
        >
          {submitting && <Loader2 className="size-4 animate-spin" />}
          <span>{submitLabel}</span>
        </Button>
      </div>
    </form>
  )
}
