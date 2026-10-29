import { useRef, useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Icon } from '@/components/ui/icon'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/shared/form-field'
import { PasswordInput } from './password-input'
import { PasswordStrength } from './password-strength'
import { MobileNumberInput } from './mobile-number-input'
import { Stepper, type StepItem } from './stepper'
import { FormAlert } from './form-alert'
import { GoogleSignInButton } from './google-sign-in-button'
import { useAuth } from '@/providers/auth-provider'
import { mapAuthError } from '@/lib/auth'
import type { AuthMode, AuthUser } from '@/types/auth'

const GST_PATTERN = /^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/

const vendorSignupSchema = z
  .object({
    // Step 1: Account
    name: z.string().trim().min(2, 'Enter your full contact name'),
    email: z
      .string()
      .trim()
      .min(1, 'Enter your contact email')
      .email('Enter a valid email address')
      .toLowerCase(),
    phone: z
      .string()
      .min(1, 'Mobile number is required for vendor operations')
      .refine(
        (val) => /^[6-9]\d{9}$/.test(val),
        'Enter a valid 10-digit mobile number starting with 6, 7, 8, or 9'
      ),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Za-z]/, 'Password must contain at least one letter')
      .regex(/\d/, 'Password must contain at least one number'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),

    // Step 2: Business
    businessName: z
      .string()
      .trim()
      .min(2, 'Enter your registered business or company name'),
    businessAddress: z
      .string()
      .trim()
      .min(5, 'Enter your equipment warehouse or operational address'),
    city: z.string().trim().min(2, 'Enter your primary operational city'),
    gstNumber: z
      .string()
      .trim()
      .optional()
      .refine(
        (val) => !val || GST_PATTERN.test(val.toUpperCase()),
        'Enter a valid 15-character Indian GSTIN (e.g. 29ABCDE1234F1Z5)'
      ),
    description: z
      .string()
      .max(300, 'Description cannot exceed 300 characters')
      .optional(),

    // Step 3: Review Confirmation
    termsConfirmed: z.boolean().refine((val) => val === true, {
      message: 'You must confirm the application details and vendor partner terms',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type VendorSignupFormValues = z.infer<typeof vendorSignupSchema>

const STEPS: StepItem[] = [
  { id: 'account', label: 'Account', title: 'Account' },
  { id: 'business', label: 'Business', title: 'Business' },
  { id: 'review', label: 'Review', title: 'Review' },
]

export interface VendorSignupWizardProps {
  onSwitchMode: (mode: AuthMode) => void
  onSuccess: (user: AuthUser, businessName: string) => void
}

export function VendorSignupWizard({
  onSwitchMode,
  onSuccess,
}: VendorSignupWizardProps) {
  const { signupVendor } = useAuth()
  const [currentStep, setCurrentStep] = useState(0)
  const [formError, setFormError] = useState<string | null>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)

  const {
    register,
    handleSubmit,
    control,
    trigger,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<VendorSignupFormValues>({
    resolver: zodResolver(vendorSignupSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      businessName: '',
      businessAddress: '',
      city: '',
      gstNumber: '',
      description: '',
      termsConfirmed: false,
    },
  })

  // Focus heading when step changes
  useEffect(() => {
    headingRef.current?.focus()
  }, [currentStep])

  const watchedValues = watch()
  const passwordValue = watch('password') || ''
  const descriptionValue = watch('description') || ''

  const handleNextStep = async () => {
    setFormError(null)
    if (currentStep === 0) {
      const isValid = await trigger(['name', 'email', 'phone', 'password', 'confirmPassword'])
      if (isValid) setCurrentStep(1)
    } else if (currentStep === 1) {
      const isValid = await trigger(['businessName', 'businessAddress', 'city', 'gstNumber', 'description'])
      if (isValid) setCurrentStep(2)
    }
  }

  const handlePrevStep = () => {
    setFormError(null)
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1)
    }
  }

  const onSubmit = async (values: VendorSignupFormValues) => {
    setFormError(null)
    try {
      const user = await signupVendor({
        name: values.name,
        email: values.email,
        password: values.password,
        phone: values.phone,
        business_name: values.businessName,
        business_address: values.businessAddress,
        city: values.city,
        gst_number: values.gstNumber ? values.gstNumber.toUpperCase() : undefined,
        description: values.description,
      })

      // Clear sensitive fields
      setValue('password', '')
      setValue('confirmPassword', '')

      onSuccess(user, values.businessName)
    } catch (err: unknown) {
      const errCode = (err as { code?: string })?.code || 'auth/unknown'
      setFormError(mapAuthError(errCode))
    }
  }

  return (
    <div className="space-y-6">
      {/* Stepper */}
      <Stepper
        steps={STEPS}
        currentStep={currentStep + 1}
        onStepClick={(stepIndex) => {
          if (stepIndex < currentStep) {
            setCurrentStep(stepIndex)
          }
        }}
      />

      {formError && (
        <FormAlert
          type="error"
          message={formError}
          onDismiss={() => setFormError(null)}
        />
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 text-left" noValidate>
        {/* STEP 1: Account */}
        {currentStep === 0 && (
          <div className="space-y-4 animate-in fade-in-50 duration-200">
            <div className="space-y-1">
              <h2
                ref={headingRef}
                tabIndex={-1}
                className="font-serif text-2xl font-bold tracking-tight text-foreground outline-none"
              >
                Account information
              </h2>
              <p className="text-sm text-muted-foreground">
                Set up your primary contact credentials for managing your vendor portal.
              </p>
            </div>

            {/* Google Social Sign-In */}
            <div className="space-y-3">
              <GoogleSignInButton
                text="Sign up with Google"
                initialRole="vendor"
                disabled={isSubmitting}
              />
              <div className="relative flex items-center justify-center">
                <div className="border-t border-border w-full" />
                <span className="bg-card px-2 text-[11px] text-muted-foreground uppercase tracking-wider relative">
                  or register with email
                </span>
              </div>
            </div>

            {/* Name */}
            <FormField
              label="Primary contact name"
              htmlFor="vendor-name"
              required
              error={errors.name?.message}
            >
              {({ id, errorId }) => (
                <Input
                  {...register('name')}
                  id={id}
                  type="text"
                  autoComplete="name"
                  placeholder="Sargam Patel"
                  aria-invalid={!!errors.name}
                  aria-describedby={errorId}
                  className="h-12 text-sm"
                  disabled={isSubmitting}
                />
              )}
            </FormField>

            {/* Email */}
            <FormField
              label="Business email"
              htmlFor="vendor-email"
              required
              error={errors.email?.message}
            >
              {({ id, errorId }) => (
                <Input
                  {...register('email')}
                  id={id}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="contact@sargam-events.com"
                  aria-invalid={!!errors.email}
                  aria-describedby={errorId}
                  className="h-12 text-sm"
                  disabled={isSubmitting}
                />
              )}
            </FormField>

            {/* Mobile (Required for vendors) */}
            <FormField
              label="Operational mobile number"
              htmlFor="vendor-phone"
              required
              hint="Used for booking confirmations and equipment delivery coordination"
              error={errors.phone?.message}
            >
              {({ id, errorId, hintId }) => (
                <Controller
                  name="phone"
                  control={control}
                  render={({ field }) => (
                    <MobileNumberInput
                      id={id}
                      value={field.value || ''}
                      onChange={field.onChange}
                      error={!!errors.phone}
                      aria-describedby={`${errorId || ''} ${hintId || ''}`.trim()}
                      disabled={isSubmitting}
                    />
                  )}
                />
              )}
            </FormField>

            {/* Password */}
            <FormField
              label="Password"
              htmlFor="vendor-password"
              required
              error={errors.password?.message}
            >
              {({ id, errorId }) => (
                <div className="space-y-2">
                  <PasswordInput
                    {...register('password')}
                    id={id}
                    autoComplete="new-password"
                    placeholder="Create a strong password"
                    aria-invalid={!!errors.password}
                    aria-describedby={errorId}
                    disabled={isSubmitting}
                  />
                  <PasswordStrength password={passwordValue} />
                </div>
              )}
            </FormField>

            {/* Confirm Password */}
            <FormField
              label="Confirm password"
              htmlFor="vendor-confirm-password"
              required
              error={errors.confirmPassword?.message}
            >
              {({ id, errorId }) => (
                <PasswordInput
                  {...register('confirmPassword')}
                  id={id}
                  autoComplete="new-password"
                  placeholder="Confirm your password"
                  aria-invalid={!!errors.confirmPassword}
                  aria-describedby={errorId}
                  disabled={isSubmitting}
                />
              )}
            </FormField>
          </div>
        )}

        {/* STEP 2: Business */}
        {currentStep === 1 && (
          <div className="space-y-4 animate-in fade-in-50 duration-200">
            <div className="space-y-1">
              <h2
                ref={headingRef}
                tabIndex={-1}
                className="font-serif text-2xl font-bold tracking-tight text-foreground outline-none"
              >
                Business details
              </h2>
              <p className="text-sm text-muted-foreground">
                Tell us about your rental business or fleet operations.
              </p>
            </div>

            {/* Business Name */}
            <FormField
              label="Business / Brand name"
              htmlFor="vendor-business-name"
              required
              error={errors.businessName?.message}
            >
              {({ id, errorId }) => (
                <Input
                  {...register('businessName')}
                  id={id}
                  type="text"
                  autoComplete="organization"
                  placeholder="Sargam Audiovisual Rentals"
                  aria-invalid={!!errors.businessName}
                  aria-describedby={errorId}
                  className="h-12 text-sm"
                  disabled={isSubmitting}
                />
              )}
            </FormField>

            {/* City */}
            <FormField
              label="Primary operating city"
              htmlFor="vendor-city"
              required
              error={errors.city?.message}
            >
              {({ id, errorId }) => (
                <Input
                  {...register('city')}
                  id={id}
                  type="text"
                  placeholder="Mumbai, Bangalore, Delhi..."
                  aria-invalid={!!errors.city}
                  aria-describedby={errorId}
                  className="h-12 text-sm"
                  disabled={isSubmitting}
                />
              )}
            </FormField>

            {/* Business Address */}
            <FormField
              label="Warehouse / Office address"
              htmlFor="vendor-address"
              required
              hint="Physical address where equipment is dispatched and inspected"
              error={errors.businessAddress?.message}
            >
              {({ id, errorId, hintId }) => (
                <textarea
                  {...register('businessAddress')}
                  id={id}
                  autoComplete="street-address"
                  rows={3}
                  placeholder="Unit 4B, Industrial Estate, Marol, Andheri East..."
                  aria-invalid={!!errors.businessAddress}
                  aria-describedby={`${errorId || ''} ${hintId || ''}`.trim()}
                  className="w-full rounded-[10px] border border-border/80 bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand disabled:opacity-50 resize-none"
                  disabled={isSubmitting}
                />
              )}
            </FormField>

            {/* GST Number (Optional) */}
            <FormField
              label="GST number (GSTIN)"
              htmlFor="vendor-gst"
              optional
              hint="You can add this later before receiving payouts"
              error={errors.gstNumber?.message}
            >
              {({ id, errorId, hintId }) => (
                <Input
                  {...register('gstNumber')}
                  id={id}
                  type="text"
                  placeholder="29ABCDE1234F1Z5"
                  aria-invalid={!!errors.gstNumber}
                  aria-describedby={`${errorId || ''} ${hintId || ''}`.trim()}
                  className="h-12 text-sm font-mono uppercase"
                  maxLength={15}
                  disabled={isSubmitting}
                />
              )}
            </FormField>

            {/* Description (Optional with 300 char counter) */}
            <FormField
              label="Short description / Equipment specialties"
              htmlFor="vendor-desc"
              optional
              hint={`${descriptionValue.length}/300 characters`}
              error={errors.description?.message}
            >
              {({ id, errorId, hintId }) => (
                <textarea
                  {...register('description')}
                  id={id}
                  rows={3}
                  maxLength={300}
                  placeholder="Briefly describe your inventory (e.g. concert sound, high-lumen projectors, staging)..."
                  aria-invalid={!!errors.description}
                  aria-describedby={`${errorId || ''} ${hintId || ''}`.trim()}
                  className="w-full rounded-[10px] border border-border/80 bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand disabled:opacity-50 resize-none"
                  disabled={isSubmitting}
                />
              )}
            </FormField>
          </div>
        )}

        {/* STEP 3: Review */}
        {currentStep === 2 && (
          <div className="space-y-4 animate-in fade-in-50 duration-200">
            <div className="space-y-1">
              <h2
                ref={headingRef}
                tabIndex={-1}
                className="font-serif text-2xl font-bold tracking-tight text-foreground outline-none"
              >
                Review your application
              </h2>
              <p className="text-sm text-muted-foreground">
                Verify your details before submitting your vendor application.
              </p>
            </div>

            {/* Info Alert: No time promise */}
            <div className="rounded-xl border border-brand/30 bg-brand/5 p-4 flex items-start gap-3">
              <Icon name="info" className="size-5 text-brand shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed text-foreground">
                <p className="font-semibold mb-0.5">Admin Review Notice</p>
                <p className="text-muted-foreground">
                  Your application will be reviewed before you can list equipment.
                  We&apos;ll email you once it&apos;s approved.
                </p>
              </div>
            </div>

            {/* Grouped Summary */}
            <div className="rounded-xl border border-border/80 divide-y divide-border/60 bg-surface text-xs overflow-hidden">
              {/* Account section */}
              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground uppercase tracking-wider text-[11px]">
                    1. Account
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(0)}
                    className="inline-flex items-center gap-1 text-brand hover:underline font-medium cursor-pointer"
                  >
                    <Icon name="edit" className="size-3" />
                    <span>Edit</span>
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-muted-foreground">
                  <div>
                    <span className="block text-[11px]">Name:</span>
                    <span className="font-medium text-foreground">{watchedValues.name}</span>
                  </div>
                  <div>
                    <span className="block text-[11px]">Email:</span>
                    <span className="font-medium text-foreground">{watchedValues.email}</span>
                  </div>
                  <div>
                    <span className="block text-[11px]">Mobile:</span>
                    <span className="font-medium text-foreground">+91 {watchedValues.phone}</span>
                  </div>
                </div>
              </div>

              {/* Business section */}
              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground uppercase tracking-wider text-[11px]">
                    2. Business
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="inline-flex items-center gap-1 text-brand hover:underline font-medium cursor-pointer"
                  >
                    <Icon name="edit" className="size-3" />
                    <span>Edit</span>
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-muted-foreground">
                  <div>
                    <span className="block text-[11px]">Business Name:</span>
                    <span className="font-medium text-foreground">{watchedValues.businessName}</span>
                  </div>
                  <div>
                    <span className="block text-[11px]">City:</span>
                    <span className="font-medium text-foreground">{watchedValues.city}</span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="block text-[11px]">Address:</span>
                    <span className="font-medium text-foreground">{watchedValues.businessAddress}</span>
                  </div>
                  {watchedValues.gstNumber && (
                    <div>
                      <span className="block text-[11px]">GSTIN:</span>
                      <span className="font-mono font-medium text-foreground">
                        {watchedValues.gstNumber.toUpperCase()}
                      </span>
                    </div>
                  )}
                  {watchedValues.description && (
                    <div className="sm:col-span-2">
                      <span className="block text-[11px]">Description:</span>
                      <span className="font-medium text-foreground">{watchedValues.description}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Confirmation Checkbox */}
            <div className="pt-2">
              <label className="flex items-start gap-2.5 cursor-pointer text-xs select-none">
                <input
                  type="checkbox"
                  {...register('termsConfirmed')}
                  className="size-4 rounded border-border text-brand focus:ring-brand focus:ring-offset-background mt-0.5"
                  disabled={isSubmitting}
                />
                <span className="text-muted-foreground leading-relaxed">
                  I confirm that all business and contact details are accurate, and I agree to the{' '}
                  <span className="text-foreground font-medium underline underline-offset-2">
                    Rent4Fraction Vendor Partner Agreement
                  </span>
                  .
                </span>
              </label>
              {errors.termsConfirmed && (
                <p className="text-xs text-danger font-medium mt-1 pl-6">
                  {errors.termsConfirmed.message}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Sticky Mobile Footer Navigation Buttons */}
        <div className="sticky bottom-0 z-sticky-bar bg-surface/95 backdrop-blur-xs py-3 border-t border-border flex flex-col-reverse sm:flex-row items-center gap-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] -mx-4 px-4 sm:mx-0 sm:px-0 sm:static sm:bg-transparent sm:pb-0 sm:pt-3">
          {currentStep > 0 ? (
            <Button
              type="button"
              variant="outline"
              onClick={handlePrevStep}
              disabled={isSubmitting}
              className="w-full sm:w-auto h-12 px-5 text-sm font-medium cursor-pointer"
            >
              <Icon name="arrow-left" size={16} className="mr-1.5" />
              <span>Back</span>
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              onClick={() => onSwitchMode('login')}
              disabled={isSubmitting}
              className="w-full sm:w-auto h-12 text-sm text-muted-foreground hover:text-foreground cursor-pointer"
            >
              Cancel
            </Button>
          )}

          <div className="w-full sm:w-auto sm:ml-auto">
            {currentStep < 2 ? (
              <Button
                type="button"
                onClick={handleNextStep}
                className="w-full sm:w-auto h-12 px-6 bg-brand hover:bg-brand-hover text-white font-medium shadow-xs text-sm cursor-pointer"
              >
                <span>Continue to {STEPS[currentStep + 1]?.title || 'Next'}</span>
                <Icon name="arrow-right" size={16} className="ml-1.5" />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto h-12 px-6 bg-brand hover:bg-brand-hover text-white font-medium shadow-xs text-sm cursor-pointer"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <Icon name="loader" size={18} className="animate-spin" />
                    <span>Submitting application…</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <Icon name="check" size={18} />
                    <span>Submit application</span>
                  </span>
                )}
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  )
}
