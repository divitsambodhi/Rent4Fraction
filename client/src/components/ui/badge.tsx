import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-label-sm font-medium transition-colors',
  {
    variants: {
      variant: {
        default:
          'bg-muted text-brand border border-transparent',
        chip:
          'bg-muted text-brand border border-transparent hover:border-brand/30',
        'chip-selected':
          'bg-muted text-brand border border-brand font-semibold',
        secondary:
          'bg-muted text-foreground border border-transparent',
        outline:
          'border border-border text-foreground bg-transparent',
        success:
          'bg-muted text-success border border-success/30',
        warning:
          'bg-muted text-warning border border-warning/30',
        info:
          'bg-muted text-info border border-info/30',
        danger:
          'bg-muted text-danger border border-danger/30',
        brand:
          'bg-muted text-brand border border-brand/30',
        neutral:
          'bg-muted text-muted-foreground border border-border',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
