import { forwardRef } from 'react'
import { Phone } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface MobileNumberInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  error?: boolean
  onValueChange?: (val: string) => void
}

export const MobileNumberInput = forwardRef<HTMLInputElement, MobileNumberInputProps>(
  ({ className, error, value, onChange, onValueChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/\D/g, '').slice(0, 10)
      onValueChange?.(raw)
      onChange?.(e)
    }

    return (
      <div className="relative flex items-center">
        <div className="absolute left-3.5 flex items-center gap-1.5 pointer-events-none text-muted-foreground select-none">
          <Phone className="size-4 stroke-[1.75]" />
          <span className="font-semibold text-xs text-foreground/80 border-r border-border/80 pr-2">
            +91
          </span>
        </div>
        <input
          ref={ref}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          placeholder="98765 43210"
          value={value}
          onChange={handleChange}
          className={cn(
            'w-full h-12 pl-[74px] pr-4 rounded-sm border border-border bg-surface text-base sm:text-sm text-foreground placeholder:text-muted-foreground/60 tabular-nums focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all disabled:opacity-50',
            error && 'border-danger focus:ring-danger',
            className,
          )}
          {...props}
        />
      </div>
    )
  },
)

MobileNumberInput.displayName = 'MobileNumberInput'
