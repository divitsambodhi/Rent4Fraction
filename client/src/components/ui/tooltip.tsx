import * as React from 'react'
import { cn } from '@/lib/utils'

interface TooltipContextType {
  open: boolean
  setOpen: (open: boolean) => void
}

const TooltipContext = React.createContext<TooltipContextType | undefined>(undefined)

export function TooltipProvider({ children }: { children: React.ReactNode; delayDuration?: number }) {
  return <>{children}</>
}

export function Tooltip({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)
  return (
    <TooltipContext.Provider value={{ open, setOpen }}>
      <div className="relative inline-flex items-center">{children}</div>
    </TooltipContext.Provider>
  )
}

export function TooltipTrigger({
  children,
  asChild: _asChild,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { asChild?: boolean }) {
  const ctx = React.useContext(TooltipContext)

  return (
    <div
      onMouseEnter={() => ctx?.setOpen(true)}
      onMouseLeave={() => ctx?.setOpen(false)}
      onFocus={() => ctx?.setOpen(true)}
      onBlur={() => ctx?.setOpen(false)}
      className={cn('inline-flex', className)}
      {...props}
    >
      {children}
    </div>
  )
}

export function TooltipContent({
  children,
  className,
  side = 'top',
}: {
  children: React.ReactNode
  className?: string
  side?: 'top' | 'bottom' | 'left' | 'right'
}) {
  const ctx = React.useContext(TooltipContext)
  if (!ctx?.open) return null

  return (
    <div
      role="tooltip"
      className={cn(
        'absolute z-50 overflow-hidden rounded-[8px] bg-foreground text-background px-3 py-1.5 text-xs shadow-md animate-in fade-in-0 zoom-in-95 pointer-events-none whitespace-normal select-none',
        side === 'top' && 'bottom-full left-1/2 -translate-x-1/2 mb-2',
        side === 'bottom' && 'top-full left-1/2 -translate-x-1/2 mt-2',
        side === 'left' && 'right-full top-1/2 -translate-y-1/2 mr-2',
        side === 'right' && 'left-full top-1/2 -translate-y-1/2 ml-2',
        className,
      )}
    >
      {children}
    </div>
  )
}
