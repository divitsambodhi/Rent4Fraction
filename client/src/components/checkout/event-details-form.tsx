import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { FormField } from '@/components/shared/form-field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { CalendarDays, MapPin } from 'lucide-react'
import type { EventType, CartPeriod } from '@/types/checkout'
import type { Address } from '@/types/account'

const EVENT_TYPES: [EventType, ...EventType[]] = [
  'Wedding',
  'Birthday',
  'Corporate event',
  'Concert',
  'Festival',
  'Other',
]

interface EventDetailsFormProps {
  period: CartPeriod
  deliveryAddress?: Address | null
  initialValues?: {
    event_name?: string
    event_type?: EventType
    event_date?: string
    venue_address?: string
    same_as_delivery?: boolean
    notes?: string
  }
  onChange: (values: {
    event_name?: string
    event_type: EventType
    event_date: string
    venue_address: string
    same_as_delivery: boolean
    notes?: string
    isValid: boolean
  }) => void
}

export function EventDetailsForm({
  period,
  deliveryAddress,
  initialValues,
  onChange,
}: EventDetailsFormProps) {
  const schema = z.object({
    event_name: z.string().optional(),
    event_type: z.enum(EVENT_TYPES),
    event_date: z
      .string()
      .min(1, 'Event date is required')
      .refine(
        (val) => val >= period.start_date && val <= period.end_date,
        `Date must fall within rental period (${period.start_date} to ${period.end_date})`,
      ),
    venue_address: z
      .string()
      .min(5, 'Venue address is required (at least 5 characters)'),
    same_as_delivery: z.boolean(),
    notes: z.string().max(300, 'Notes cannot exceed 300 characters').optional(),
  })

  type FormData = z.infer<typeof schema>

  const formattedDeliveryAddress = deliveryAddress
    ? `${deliveryAddress.name}, ${deliveryAddress.line1}${deliveryAddress.line2 ? `, ${deliveryAddress.line2}` : ''}, ${deliveryAddress.city}, ${deliveryAddress.state} – ${deliveryAddress.pincode}`
    : ''

  const {
    register,
    watch,
    setValue,
    formState: { errors, isValid },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: {
      event_name: initialValues?.event_name || '',
      event_type: initialValues?.event_type || 'Wedding',
      event_date: initialValues?.event_date || period.start_date,
      venue_address:
        initialValues?.venue_address ||
        (initialValues?.same_as_delivery ? formattedDeliveryAddress : ''),
      same_as_delivery: initialValues?.same_as_delivery ?? true,
      notes: initialValues?.notes || '',
    },
  })

  const formValues = watch()
  const sameAsDelivery = formValues.same_as_delivery
  const notesText = formValues.notes || ''

  // Sync "same as delivery" when address changes or checkbox toggled
  useEffect(() => {
    if (sameAsDelivery && formattedDeliveryAddress) {
      setValue('venue_address', formattedDeliveryAddress, { shouldValidate: true })
    }
  }, [sameAsDelivery, formattedDeliveryAddress, setValue])

  // Propagate changes to parent checkout draft
  useEffect(() => {
    onChange({
      event_name: formValues.event_name,
      event_type: formValues.event_type || 'Wedding',
      event_date: formValues.event_date || period.start_date,
      venue_address: formValues.venue_address || '',
      same_as_delivery: Boolean(formValues.same_as_delivery),
      notes: formValues.notes,
      isValid,
    })
  }, [
    formValues.event_name,
    formValues.event_type,
    formValues.event_date,
    formValues.venue_address,
    formValues.same_as_delivery,
    formValues.notes,
    isValid,
    onChange,
    period.start_date,
  ])

  return (
    <div className="p-5 sm:p-6 rounded-[16px] bg-surface border border-border space-y-5 shadow-xs">
      <div className="flex items-center gap-2.5 pb-3 border-b border-border/70">
        <div className="size-8 rounded-full bg-brand/10 text-brand flex items-center justify-center">
          <CalendarDays className="size-4" />
        </div>
        <div>
          <h3 className="font-serif font-bold text-sm text-foreground">Event & Venue Details</h3>
          <p className="text-[11px] text-muted-foreground">
            Provide event info so vendors can prepare your setup and logistics.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Event Name */}
        <FormField
          label="Event name"
          optional
          hint="e.g. Ananya & Arjun Wedding"
          error={errors.event_name?.message}
        >
          {({ id }) => (
            <Input
              id={id}
              {...register('event_name')}
              placeholder="e.g. Corporate Summit 2026"
              className="h-10 text-xs"
            />
          )}
        </FormField>

        {/* Event Type */}
        <FormField
          label="Event type"
          required
          error={errors.event_type?.message}
        >
          {({ id }) => (
            <select
              id={id}
              {...register('event_type')}
              className="w-full h-10 px-3 rounded-[10px] bg-surface border border-border text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-brand"
            >
              {EVENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          )}
        </FormField>

        {/* Event Date (Within rental range) */}
        <FormField
          label="Event date"
          required
          hint={`Must be between ${period.start_date} and ${period.end_date}`}
          error={errors.event_date?.message}
        >
          {({ id }) => (
            <Input
              id={id}
              type="date"
              min={period.start_date}
              max={period.end_date}
              {...register('event_date')}
              className="h-10 text-xs font-mono"
            />
          )}
        </FormField>

        {/* Same as Delivery Checkbox */}
        <div className="sm:col-span-2 pt-1">
          <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-foreground select-none">
            <input
              type="checkbox"
              {...register('same_as_delivery')}
              className="size-4 rounded border-border text-brand focus:ring-brand accent-brand cursor-pointer"
            />
            <span>Same as delivery address</span>
          </label>
        </div>

        {/* Venue Address */}
        <div className="sm:col-span-2">
          <FormField
            label="Venue address"
            required
            error={errors.venue_address?.message}
          >
            {({ id }) => (
              <div className="relative">
                <Textarea
                  id={id}
                  rows={2}
                  disabled={sameAsDelivery}
                  {...register('venue_address')}
                  placeholder="Street, hall name, landmark, city and pincode"
                  className="text-xs resize-none"
                />
                <MapPin className="size-4 text-muted-foreground absolute top-3 right-3 pointer-events-none" />
              </div>
            )}
          </FormField>
        </div>

        {/* Notes */}
        <div className="sm:col-span-2">
          <FormField
            label="Logistics notes"
            optional
            hint={`${notesText.length} / 300 characters`}
            error={errors.notes?.message}
          >
            {({ id }) => (
              <Textarea
                id={id}
                rows={2}
                maxLength={300}
                {...register('notes')}
                placeholder="Gate entry instructions, elevator access, or sound check time..."
                className="text-xs resize-none"
              />
            )}
          </FormField>
        </div>
      </div>
    </div>
  )
}
