import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/shared/form-field'
import { PasswordInput } from './password-input'
import { PasswordStrength } from './password-strength'
import { MobileNumberInput } from './mobile-number-input'
import { FormAlert } from './form-alert'
import { GoogleSignInButton } from './google-sign-in-button'
import { AppLink } from '@/components/shared/app-link'
import { useAuth } from '@/providers/auth-provider'
import { mapAuthError } from '@/lib/auth'
import type { AuthMode, AuthUser } from '@/types/auth'

const customerSignupSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Please enter your full name (at least 2 characters)'),
    email: z
      .string()
      .trim()
      .min(1, 'Please enter your email address')
      .email('Please enter a valid email address')
      .toLowerCase(),
    phone: z
      .string()
      .optional()
      .refine(
        (val) => !val || /^[6-9]\d{9}$/.test(val),
        'Enter a valid 10-digit mobile number starting with 6, 7, 8, or 9'
      ),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Za-z]/, 'Password must contain at least one letter')
      .regex(/\d/, 'Password must contain at least one number'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    termsAccepted: z.boolean().refine((val) => val === true, {
      message: 'You must agree to the terms and privacy policy to continue',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type CustomerSignupFormValues = z.infer<typeof customerSignupSchema>

export interface CustomerSignupFormProps {
  onSwitchMode: (mode: AuthMode) => void
  onSuccess: (user: AuthUser) => void
}

export function CustomerSignupForm({
  onSwitchMode,
  onSuccess,
}: CustomerSignupFormProps) {
  const { signupCustomer } = useAuth()
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CustomerSignupFormValues>({
    resolver: zodResolver(customerSignupSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      termsAccepted: false,
    },
  })

  const passwordValue = watch('password') || ''

  const onSubmit = async (values: CustomerSignupFormValues) => {
    setFormError(null)
    try {
      const user = await signupCustomer({
        name: values.name,
        email: values.email,
        password: values.password,
        phone: values.phone || null,
      })

      // Clear sensitive fields
      setValue('password', '')
      setValue('confirmPassword', '')

      onSuccess(user)
    } catch (err: unknown) {
      const errCode = (err as { code?: string })?.code || 'auth/unknown'
      setFormError(mapAuthError(errCode))
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5 text-left">
        <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Create customer account
        </h1>
        <p className="text-sm text-muted-foreground">
          Rent premium event gear, audiovisual equipment, and decor with ease.
        </p>
      </div>

      {formError && (
        <FormAlert
          type="error"
          message={formError}
          onDismiss={() => setFormError(null)}
        />
      )}

      {/* Google Social Sign-In */}
      <div className="space-y-3">
        <GoogleSignInButton
          text="Sign up with Google"
          onSuccess={() => {
            // onSuccess handled via auth state
          }}
          disabled={isSubmitting}
        />
        <div className="relative flex items-center justify-center">
          <div className="border-t border-border w-full" />
          <span className="bg-card px-2 text-[11px] text-muted-foreground uppercase tracking-wider relative">
            or sign up with email
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-left" noValidate>
        {/* Full Name */}
        <FormField
          label="Full name"
          htmlFor="signup-name"
          required
          error={errors.name?.message}
        >
          {({ id, errorId }) => (
            <Input
              {...register('name')}
              id={id}
              type="text"
              autoComplete="name"
              placeholder="Aarav Sharma"
              aria-invalid={!!errors.name}
              aria-describedby={errorId}
              className="h-12 text-sm"
              disabled={isSubmitting}
            />
          )}
        </FormField>

        {/* Email */}
        <FormField
          label="Email address"
          htmlFor="signup-email"
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
              placeholder="name@eventpro.in"
              aria-invalid={!!errors.email}
              aria-describedby={errorId}
              className="h-12 text-sm"
              disabled={isSubmitting}
            />
          )}
        </FormField>

        {/* Mobile Number (Optional) */}
        <FormField
          label="Mobile number"
          htmlFor="signup-phone"
          optional
          hint="For rental order status & delivery notifications"
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
          htmlFor="signup-password"
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
          htmlFor="signup-confirm-password"
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

        {/* Terms Checkbox */}
        <div className="pt-1">
          <label className="flex items-start gap-2.5 cursor-pointer text-xs select-none">
            <input
              type="checkbox"
              {...register('termsAccepted')}
              className="size-4 rounded border-border text-brand focus:ring-brand focus:ring-offset-background mt-0.5"
              disabled={isSubmitting}
            />
            <span className="text-muted-foreground leading-relaxed">
              I agree to the{' '}
              <AppLink
                to="/help?tab=terms"
                className="text-foreground underline underline-offset-2 hover:text-brand font-medium"
              >
                Terms of Service
              </AppLink>{' '}
              and{' '}
              <AppLink
                to="/help?tab=privacy"
                className="text-foreground underline underline-offset-2 hover:text-brand font-medium"
              >
                Privacy Policy
              </AppLink>
              .
            </span>
          </label>
          {errors.termsAccepted && (
            <p className="text-xs text-danger font-medium mt-1 pl-6">
              {errors.termsAccepted.message}
            </p>
          )}
        </div>

        {/* Create Account Button */}
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-12 bg-brand hover:bg-brand-hover text-white font-medium shadow-xs text-sm mt-2"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <Loader2 className="size-4.5 animate-spin" />
              <span>Creating account…</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <span>Create account</span>
              <ArrowRight className="size-4" />
            </span>
          )}
        </Button>
      </form>

      {/* Switch to login */}
      <div className="pt-2 border-t border-border/70 text-center text-xs text-muted-foreground">
        Already have an account?{' '}
        <button
          type="button"
          onClick={() => onSwitchMode('login')}
          className="text-brand font-semibold hover:underline cursor-pointer"
        >
          Log in
        </button>
      </div>
    </div>
  )
}
