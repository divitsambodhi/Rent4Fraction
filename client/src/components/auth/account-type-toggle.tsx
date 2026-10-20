import { CheckCircle2, Store, User } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AccountTypeToggleProps {
  value: 'customer' | 'vendor'
  onChange: (val: 'customer' | 'vendor') => void
  className?: string
}

export function AccountTypeToggle({
  value,
  onChange,
  className,
}: AccountTypeToggleProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Account type selection"
      className={cn('grid grid-cols-2 gap-2.5', className)}
    >
      {/* Customer Card */}
      <button
        type="button"
        role="radio"
        aria-checked={value === 'customer'}
        onClick={() => onChange('customer')}
        className={cn(
          'relative p-3.5 rounded-[12px] border text-left transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand flex flex-col justify-between gap-2',
          value === 'customer'
            ? 'border-brand bg-brand/5 shadow-xs ring-1 ring-brand/20'
            : 'border-border bg-surface hover:bg-muted/40 hover:border-border/80',
        )}
      >
        <div className="flex items-center justify-between w-full">
          <div
            className={cn(
              'size-8 rounded-[8px] flex items-center justify-center transition-colors',
              value === 'customer'
                ? 'bg-brand text-white'
                : 'bg-muted text-muted-foreground',
            )}
          >
            <User className="size-4" />
          </div>

          {value === 'customer' && (
            <CheckCircle2 className="size-4 text-brand fill-brand/10 shrink-0" />
          )}
        </div>

        <div>
          <div className="text-xs sm:text-sm font-semibold text-foreground">
            I&apos;m a customer
          </div>
          <div className="text-[11px] text-muted-foreground leading-snug">
            Rent equipment for events
          </div>
        </div>
      </button>

      {/* Vendor Card */}
      <button
        type="button"
        role="radio"
        aria-checked={value === 'vendor'}
        onClick={() => onChange('vendor')}
        className={cn(
          'relative p-3.5 rounded-[12px] border text-left transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand flex flex-col justify-between gap-2',
          value === 'vendor'
            ? 'border-brand bg-brand/5 shadow-xs ring-1 ring-brand/20'
            : 'border-border bg-surface hover:bg-muted/40 hover:border-border/80',
        )}
      >
        <div className="flex items-center justify-between w-full">
          <div
            className={cn(
              'size-8 rounded-[8px] flex items-center justify-center transition-colors',
              value === 'vendor'
                ? 'bg-brand text-white'
                : 'bg-muted text-muted-foreground',
            )}
          >
            <Store className="size-4" />
          </div>

          {value === 'vendor' && (
            <CheckCircle2 className="size-4 text-brand fill-brand/10 shrink-0" />
          )}
        </div>

        <div>
          <div className="text-xs sm:text-sm font-semibold text-foreground">
            I&apos;m a vendor
          </div>
          <div className="text-[11px] text-muted-foreground leading-snug">
            List and rent out equipment
          </div>
        </div>
      </button>
    </div>
  )
}
