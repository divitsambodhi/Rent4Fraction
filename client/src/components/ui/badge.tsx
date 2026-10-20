import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 h-6.5 px-2.5 rounded-full text-xs font-medium tracking-wide transition-colors',
  {
    variants: {
      variant: {
        default:
          'bg-brand text-white border-transparent',
        secondary:
          'bg-secondary text-secondary-foreground border-transparent',
        outline:
          'border border-border text-foreground bg-transparent',
        success:
          'bg-success/15 text-success border border-success/30 dark:bg-success/20',
        warning:
          'bg-warning/15 text-warning border border-warning/30 dark:bg-warning/20',
        info:
          'bg-info/15 text-info border border-info/30 dark:bg-info/20',
        danger:
          'bg-danger/15 text-danger border border-danger/30 dark:bg-danger/20',
        brand:
          'bg-brand/10 text-brand border border-brand/20 dark:bg-brand/20 dark:text-brand',
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
