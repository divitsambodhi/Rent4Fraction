import { forwardRef, useState } from 'react'
import { Icon } from '@/components/ui/icon'
import { cn } from '@/lib/utils'

export interface PasswordInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  error?: boolean
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, error, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false)

    return (
      <div className="relative flex items-center">
        <Icon name="lock" size={18} className="absolute left-3.5 text-muted-foreground pointer-events-none" />
        <input
          ref={ref}
          type={showPassword ? 'text' : 'password'}
          className={cn(
            'w-full h-12 pl-10 pr-12 rounded-[10px] border border-border bg-surface text-base sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all disabled:opacity-50',
            error && 'border-danger focus:ring-danger',
            className,
          )}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          aria-pressed={showPassword}
          className="absolute right-1 min-w-[44px] min-h-[44px] rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/40 flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand cursor-pointer"
        >
          <Icon name={showPassword ? 'eye-off' : 'eye'} size={18} />
        </button>
      </div>
    )
  },
)

PasswordInput.displayName = 'PasswordInput'
