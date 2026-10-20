import { forwardRef, useState } from 'react'
import { Eye, EyeOff, Lock } from 'lucide-react'
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
        <Lock className="absolute left-3.5 size-4.5 text-muted-foreground pointer-events-none stroke-[1.75]" />
        <input
          ref={ref}
          type={showPassword ? 'text' : 'password'}
          className={cn(
            'w-full h-12 pl-10 pr-11 rounded-[10px] border border-border bg-surface text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all disabled:opacity-50',
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
          className="absolute right-2.5 size-8 rounded-[6px] text-muted-foreground hover:text-foreground hover:bg-muted/60 flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand cursor-pointer"
        >
          {showPassword ? (
            <EyeOff className="size-4 stroke-[1.75]" />
          ) : (
            <Eye className="size-4 stroke-[1.75]" />
          )}
        </button>
      </div>
    )
  },
)

PasswordInput.displayName = 'PasswordInput'
