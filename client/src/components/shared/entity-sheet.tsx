import React, { useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { ConfirmDialog } from '@/components/account/confirm-dialog'
import { cn } from '@/lib/utils'

export interface EntitySheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  eyebrow?: string
  title: string
  subtitle?: string
  headerActions?: React.ReactNode
  isDirty?: boolean
  children: React.ReactNode
  footerActions?: React.ReactNode
  className?: string
  widthClass?: string
}

export function EntitySheet({
  open,
  onOpenChange,
  eyebrow,
  title,
  subtitle,
  headerActions,
  isDirty = false,
  children,
  footerActions,
  className,
  widthClass = 'sm:max-w-[640px]',
}: EntitySheetProps) {
  const [showDiscardDialog, setShowDiscardDialog] = useState(false)

  const handleCloseAttempt = (nextOpen: boolean) => {
    if (!nextOpen && isDirty) {
      setShowDiscardDialog(true)
    } else {
      onOpenChange(nextOpen)
    }
  }

  return (
    <>
      <Sheet open={open} onOpenChange={handleCloseAttempt}>
        <SheetContent
          side="right"
          className={cn(
            'w-full h-dvh max-h-dvh p-0 flex flex-col bg-background border-l border-border shadow-2xl z-sheet overflow-hidden',
            widthClass,
            className
          )}
        >
          {/* Sticky Header with Safe Area */}
          <SheetHeader className="p-4 sm:p-6 border-b border-border bg-card/60 backdrop-blur-sm sticky top-0 z-sticky-header pt-[max(1rem,env(safe-area-inset-top))]">
            <div className="flex items-start justify-between gap-4 pr-10">
              <div className="space-y-1">
                {eyebrow && (
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    {eyebrow}
                  </p>
                )}
                <SheetTitle className="text-lg sm:text-xl font-display font-semibold text-foreground tracking-tight">
                  {title}
                </SheetTitle>
                {subtitle && <p className="text-xs text-muted-foreground leading-normal">{subtitle}</p>}
              </div>
              {headerActions && <div className="flex items-center gap-2 shrink-0">{headerActions}</div>}
            </div>
          </SheetHeader>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-6">
            {children}
          </div>

          {/* Sticky Footer actions with Safe Area */}
          {footerActions && (
            <div className="p-4 sm:px-6 border-t border-border bg-card/80 backdrop-blur-sm sticky bottom-0 z-sticky-bar pb-[max(1rem,env(safe-area-inset-bottom))] flex flex-col sm:flex-row items-center justify-end gap-2.5 sm:gap-3 [&>button]:w-full sm:[&>button]:w-auto [&>button]:h-11 sm:[&>button]:h-10">
              {footerActions}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Discard changes dialog */}
      <ConfirmDialog
        open={showDiscardDialog}
        onOpenChange={setShowDiscardDialog}
        title="Discard Unsaved Changes?"
        description="You have unsaved edits in this drawer. If you leave now, your changes will be discarded."
        confirmLabel="Discard Edits"
        cancelLabel="Continue Editing"
        variant="danger"
        onConfirm={() => {
          setShowDiscardDialog(false)
          onOpenChange(false)
        }}
      />
    </>
  )
}
