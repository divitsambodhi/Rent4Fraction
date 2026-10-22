import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Icon } from '@/components/ui/icon'
import { cn } from '@/lib/utils'
import { useMediaQuery } from '@/hooks/use-media-query'
import { useOverlayHistory } from '@/hooks/use-overlay-history'

export interface ResponsiveDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: React.ReactNode
  description?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  fullScreenMobile?: boolean
  overlayId?: string
  className?: string
  contentClassName?: string
}

export function ResponsiveDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  fullScreenMobile = false,
  overlayId,
  className,
  contentClassName,
}: ResponsiveDialogProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)')

  // Support Android Back button closing mobile dialogs
  useOverlayHistory({
    isOpen: open,
    onClose: () => onOpenChange(false),
    overlayId: overlayId || 'responsive-dialog',
    enabled: !isDesktop && open,
  })

  // P-020: Drag-to-dismiss gesture and spring deceleration physics
  const [dragY, setDragY] = React.useState(0)
  const [isDragging, setIsDragging] = React.useState(false)
  const touchStartY = React.useRef(0)

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY
    setIsDragging(true)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    const delta = e.touches[0].clientY - touchStartY.current
    if (delta > 0) {
      setDragY(delta)
    }
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
    if (dragY > 90) {
      onOpenChange(false)
    }
    setDragY(0)
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        {/* Overlay */}
        <DialogPrimitive.Overlay
          className={cn(
            'fixed inset-0 z-dialog bg-black/60 transition-opacity',
            'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          )}
        />

        {/* Desktop Modal Content */}
        {isDesktop ? (
          <DialogPrimitive.Content
            className={cn(
              'fixed left-[50%] top-[50%] z-dialog grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border border-border bg-surface p-6 duration-200 rounded-sm shadow-none',
              'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]',
              className,
            )}
          >
            {(title || description) && (
              <div className="flex flex-col space-y-1.5 text-left">
                {title && (
                  <DialogPrimitive.Title className="text-headline-sm font-semibold text-foreground font-sans">
                    {title}
                  </DialogPrimitive.Title>
                )}
                {description && (
                  <DialogPrimitive.Description className="text-body-sm text-muted-foreground">
                    {description}
                  </DialogPrimitive.Description>
                )}
              </div>
            )}

            <div className={cn('py-1', contentClassName)}>{children}</div>

            {footer && (
              <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 pt-2">
                {footer}
              </div>
            )}

            <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm min-w-[44px] min-h-[44px] inline-flex items-center justify-center text-foreground/70 transition-opacity hover:text-foreground focus:outline-none focus:ring-2 focus:ring-brand cursor-pointer">
              <Icon name="close" size={18} />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          </DialogPrimitive.Content>
        ) : fullScreenMobile ? (
          /* Mobile Full-Screen Dialog (for Inspection & Availability) */
          <DialogPrimitive.Content
            className={cn(
              'fixed inset-0 z-dialog flex flex-col h-dvh max-h-dvh bg-surface border-none rounded-none overflow-hidden duration-200',
              'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
              className,
            )}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface shrink-0 pt-[max(0.75rem,env(safe-area-inset-top,0px))]">
              <div className="flex flex-col">
                {title && (
                  <DialogPrimitive.Title className="text-headline-sm font-semibold text-foreground font-sans">
                    {title}
                  </DialogPrimitive.Title>
                )}
                {description && (
                  <DialogPrimitive.Description className="text-body-xs text-muted-foreground">
                    {description}
                  </DialogPrimitive.Description>
                )}
              </div>
              <DialogPrimitive.Close className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-sm text-muted-foreground hover:text-foreground cursor-pointer -mr-2">
                <Icon name="close" size={20} />
                <span className="sr-only">Close</span>
              </DialogPrimitive.Close>
            </div>

            <div
              className={cn(
                'flex-1 overflow-y-auto overscroll-contain p-4',
                contentClassName,
              )}
            >
              {children}
            </div>

            {footer && (
              <div className="p-4 border-t border-border bg-surface shrink-0 pb-[max(1rem,env(safe-area-inset-bottom,0px))] flex flex-col gap-2 [&>button]:w-full [&>button]:h-11">
                {footer}
              </div>
            )}
          </DialogPrimitive.Content>
        ) : (
          /* Mobile Bottom Drawer / Sheet */
          <DialogPrimitive.Content
            style={{
              transform: dragY > 0 ? `translateY(${dragY}px)` : undefined,
              transition: isDragging ? 'none' : 'transform 220ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            className={cn(
              'fixed inset-x-0 bottom-0 z-dialog flex flex-col max-h-[90dvh] bg-surface rounded-t-[16px] border-t border-border overflow-hidden duration-200',
              'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
              className,
            )}
          >
            {/* Drag Handle with touch-to-dismiss */}
            <div
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className="w-full pt-3 pb-1 flex justify-center cursor-grab active:cursor-grabbing touch-none select-none"
              aria-hidden="true"
            >
              <div className="h-1.5 w-12 rounded-full bg-border shrink-0" />
            </div>

            <div className="flex items-start justify-between px-5 pt-2 pb-3 border-b border-border bg-surface shrink-0">
              <div className="flex flex-col pr-2">
                {title && (
                  <DialogPrimitive.Title className="text-headline-sm font-semibold text-foreground font-sans">
                    {title}
                  </DialogPrimitive.Title>
                )}
                {description && (
                  <DialogPrimitive.Description className="text-body-xs text-muted-foreground mt-0.5">
                    {description}
                  </DialogPrimitive.Description>
                )}
              </div>
              <DialogPrimitive.Close className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-sm text-muted-foreground hover:text-foreground cursor-pointer -mr-2 -mt-1">
                <Icon name="close" size={20} />
                <span className="sr-only">Close</span>
              </DialogPrimitive.Close>
            </div>

            <div
              className={cn(
                'flex-1 overflow-y-auto overscroll-contain px-5 py-4',
                contentClassName,
              )}
            >
              {children}
            </div>

            {footer && (
              <div className="p-4 border-t border-border bg-surface shrink-0 pb-[max(1rem,env(safe-area-inset-bottom,0px))] flex flex-col gap-2 [&>button]:w-full [&>button]:h-11">
                {footer}
              </div>
            )}
          </DialogPrimitive.Content>
        )}
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
