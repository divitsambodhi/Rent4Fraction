import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm text-label-lg transition-all duration-100 ease-out select-none touch-manipulation active:scale-[0.98] outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-brand text-white hover:bg-brand-hover',
        secondary:
          'border border-border bg-surface text-foreground hover:bg-muted',
        outline:
          'border border-border bg-surface text-foreground hover:bg-muted',
        ghost:
          'text-foreground hover:bg-muted',
        link:
          'text-brand underline-offset-4 hover:underline p-0 h-auto font-medium',
        tertiary:
          'text-brand underline-offset-4 hover:underline p-0 h-auto font-medium',
        danger:
          'bg-danger text-white hover:bg-danger/90',
        destructive:
          'bg-danger text-white hover:bg-danger/90',
        subtle:
          'bg-muted text-foreground hover:bg-border/60',
      },
      size: {
        default: 'h-10 px-4 py-2 text-sm', // 40px height per spec
        sm: 'h-8 px-3 text-xs',
        lg: 'h-10 md:h-10 px-5 text-sm',
        icon: 'size-10 min-w-[40px] min-h-[40px] p-0 text-foreground',
        'icon-sm': 'size-8 min-w-[32px] min-h-[32px] p-0 text-foreground',
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
