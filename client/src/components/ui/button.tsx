import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[10px] text-sm font-semibold transition-all outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
  {
    variants: {
      variant: {
        default:
          'bg-brand text-white hover:bg-brand-hover shadow-sm hover:shadow',
        outline:
          'border border-border bg-surface text-foreground hover:bg-muted hover:border-brand/40',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost:
          'text-foreground hover:bg-muted hover:text-foreground',
        link:
          'text-brand underline-offset-4 hover:underline p-0 h-auto font-medium',
        danger:
          'bg-danger text-white hover:bg-danger/90',
        subtle:
          'bg-brand/10 text-brand hover:bg-brand/20 dark:bg-brand/20 dark:hover:bg-brand/30',
      },
      size: {
        default: 'h-10 px-4 py-2', // 40px
        sm: 'h-8 rounded-[8px] px-3 text-xs',
        lg: 'h-12 rounded-[10px] px-6 text-base', // 48px for primary CTAs & Search
        icon: 'size-10 min-w-[40px] min-h-[40px] p-0', // 40px icon button
        'icon-sm': 'size-8 min-w-[32px] min-h-[32px] p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  },
)
Button.displayName = 'Button'

export { Button, buttonVariants }
