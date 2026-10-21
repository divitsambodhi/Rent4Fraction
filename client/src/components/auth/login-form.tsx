import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Icon } from '@/components/ui/icon'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/shared/form-field'
import { PasswordInput } from './password-input'
import { FormAlert } from './form-alert'
import { ForgotPasswordDialog } from './forgot-password-dialog'
import { DemoAccountsPanel } from './demo-accounts-panel'
import { useAuth } from '@/providers/auth-provider'
import { useAppNavigate } from '@/components/shared/app-link'
import { getHomeForRole, mapAuthError, sanitizeRedirect } from '@/lib/auth'
import type { AuthMode } from '@/types/auth'

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Please enter your email address')
    .email('Please enter a valid email address')
    .toLowerCase(),
  password: z.string().min(1, 'Please enter your password'),
  rememberMe: z.boolean(),
})

type LoginFormValues = z.infer<typeof loginSchema>

export interface LoginFormProps {
  onSwitchMode: (mode: AuthMode) => void
  redirectParam?: string | null
}

export function LoginForm({ onSwitchMode, redirectParam }: LoginFormProps) {
  const { login } = useAuth()
  const navigate = useAppNavigate()

  const [formError, setFormError] = useState<string | null>(null)
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false)
  const [typedEmail, setTypedEmail] = useState('')

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  })

  const currentEmail = watch('email')

  const onSubmit = async (values: LoginFormValues) => {
    setFormError(null)
    try {
      const user = await login(values.email, values.password, values.rememberMe)

      // Clear password from form state
      setValue('password', '')

      // Success toast
      const firstName = user.name.split(' ')[0] || user.name
      toast.success(`Logged in as ${firstName}`)

      // Destination calculation
      const sanitized = sanitizeRedirect(redirectParam)
      if (user.role === 'customer') {
        navigate(sanitized || '/')
      } else {
        navigate(getHomeForRole(user.role))
      }
    } catch (err: unknown) {
      const errCode = (err as { code?: string })?.code || 'auth/unknown'
      setFormError(mapAuthError(errCode))
    }
  }

  const handleFillDemo = (email: string, pass: string) => {
    setValue('email', email, { shouldValidate: true })
    setValue('password', pass, { shouldValidate: true })
    setFormError(null)
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5 text-left">
        <h1 className="text-headline-md font-bold text-foreground">
          Log in
        </h1>
        <p className="text-body-sm text-text-secondary">
          Log in to manage bookings, equipment, and account settings.
        </p>
      </div>

      {formError && (
        <FormAlert
          type="error"
          message={formError}
          onDismiss={() => setFormError(null)}
        />
      )}

      {/* DEV ONLY demo credentials */}
      <DemoAccountsPanel onFill={handleFillDemo} />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-left" noValidate>
        {/* Email */}
        <FormField
          label="Email address"
          htmlFor="login-email"
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

        {/* Password */}
        <FormField
          label="Password"
          htmlFor="login-password"
          required
          error={errors.password?.message}
        >
          {({ id, errorId }) => (
            <PasswordInput
              {...register('password')}
              id={id}
              autoComplete="current-password"
              placeholder="Enter your password"
              aria-invalid={!!errors.password}
              aria-describedby={errorId}
              disabled={isSubmitting}
            />
          )}
        </FormField>

        {/* Remember me & Forgot Password */}
        <div className="flex items-center justify-between text-xs pt-1">
          <label className="flex items-center gap-2 cursor-pointer select-none text-foreground font-medium">
            <input
              type="checkbox"
              {...register('rememberMe')}
              className="size-4 rounded border-border text-brand focus:ring-brand focus:ring-offset-background"
              disabled={isSubmitting}
            />
            <span>Remember me</span>
          </label>

          <button
            type="button"
            onClick={() => {
              setTypedEmail(currentEmail || '')
              setForgotPasswordOpen(true)
            }}
            className="text-brand hover:underline font-medium cursor-pointer"
          >
            Forgot password?
          </button>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-12 bg-brand hover:bg-brand-hover text-white font-medium shadow-xs text-sm mt-2 cursor-pointer"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <Icon name="loader" size={18} className="animate-spin" />
              <span>Logging in…</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <span>Log in</span>
              <Icon name="arrow-right" size={16} />
            </span>
          )}
        </Button>
      </form>

      {/* Switch mode links */}
      <div className="pt-2 border-t border-border/70 text-center space-y-2 text-xs text-muted-foreground">
        <p>
          Don&apos;t have an account?{' '}
          <button
            type="button"
            onClick={() => onSwitchMode('signup')}
            className="text-brand font-semibold hover:underline cursor-pointer"
          >
            Sign up as customer
          </button>
        </p>
        <p>
          Looking to list equipment?{' '}
          <button
            type="button"
            onClick={() => onSwitchMode('vendor')}
            className="text-foreground font-medium hover:text-brand underline underline-offset-2 cursor-pointer"
          >
            Partner as an equipment vendor
          </button>
        </p>
      </div>

      {/* Forgot Password Modal */}
      <ForgotPasswordDialog
        open={forgotPasswordOpen}
        onOpenChange={setForgotPasswordOpen}
        initialEmail={typedEmail}
      />
    </div>
  )
}
