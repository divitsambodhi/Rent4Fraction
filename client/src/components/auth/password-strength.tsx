import { Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PasswordStrengthProps {
  password?: string
  className?: string
}

export function PasswordStrength({ password = '', className }: PasswordStrengthProps) {
  const hasMinLength = password.length >= 8
  const hasLetter = /[a-zA-Z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  const hasSpecial = /[^a-zA-Z0-9]/.test(password)

  let score = 0
  if (hasMinLength) score += 1
  if (hasLetter) score += 1
  if (hasNumber) score += 1
  if (hasSpecial && password.length >= 10) score += 1

  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong']
  const label = password ? labels[score] || 'Weak' : ''

  const segmentColors = [
    'bg-muted',
    'bg-danger',
    'bg-amber-500',
    'bg-brand',
    'bg-emerald-600',
  ]

  const activeColor = segmentColors[score] || 'bg-muted'

  return (
    <div className={cn('space-y-2 pt-1', className)}>
      {/* 4-segment meter bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground">Password strength</span>
          {label && (
            <span
              className={cn(
                'font-semibold',
                score <= 1 && 'text-danger',
                score === 2 && 'text-amber-600 dark:text-amber-400',
                score === 3 && 'text-brand',
                score >= 4 && 'text-emerald-600 dark:text-emerald-400',
              )}
            >
              {label}
            </span>
          )}
        </div>

        <div className="grid grid-cols-4 gap-1.5 h-1">
          {[1, 2, 3, 4].map((step) => (
            <div
              key={step}
              className={cn(
                'h-full rounded-full transition-colors duration-200',
                step <= score ? activeColor : 'bg-muted/80',
              )}
            />
          ))}
        </div>
      </div>

      {/* Live requirement checklist */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 pt-1 text-[11px] text-muted-foreground">
        <div
          className={cn(
            'flex items-center gap-1.5 transition-colors',
            hasMinLength ? 'text-brand font-medium' : 'text-muted-foreground',
          )}
        >
          {hasMinLength ? (
            <Check className="size-3.5 stroke-[2.5]" />
          ) : (
            <X className="size-3.5 text-muted-foreground/50" />
          )}
          <span>8+ characters</span>
        </div>

        <div
          className={cn(
            'flex items-center gap-1.5 transition-colors',
            hasLetter ? 'text-brand font-medium' : 'text-muted-foreground',
          )}
        >
          {hasLetter ? (
            <Check className="size-3.5 stroke-[2.5]" />
          ) : (
            <X className="size-3.5 text-muted-foreground/50" />
          )}
          <span>At least 1 letter</span>
        </div>

        <div
          className={cn(
            'flex items-center gap-1.5 transition-colors',
            hasNumber ? 'text-brand font-medium' : 'text-muted-foreground',
          )}
        >
          {hasNumber ? (
            <Check className="size-3.5 stroke-[2.5]" />
          ) : (
            <X className="size-3.5 text-muted-foreground/50" />
          )}
          <span>At least 1 number</span>
        </div>
      </div>
    </div>
  )
}
