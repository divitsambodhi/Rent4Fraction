import React from 'react'
import { ResponsiveDialog } from '@/components/ui/responsive-dialog'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'default' | 'danger'
  loading?: boolean
  onConfirm: () => void
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  loading = false,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      overlayId="confirm-dialog"
      footer={
        <>
          <Button
            type="button"
            variant="ghost"
            disabled={loading}
            onClick={() => onOpenChange(false)}
            className="h-11 sm:h-10 text-xs font-medium w-full sm:w-auto"
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={variant === 'danger' ? 'danger' : 'default'}
            disabled={loading}
            onClick={onConfirm}
            className="h-11 sm:h-10 px-4 text-xs font-semibold gap-1.5 w-full sm:w-auto"
          >
            {loading && <Icon name="loader" size={16} className="animate-spin" />}
            <span>{confirmLabel}</span>
          </Button>
        </>
      }
    >
      <div className="text-body-sm text-muted-foreground leading-relaxed">
        {description}
      </div>
    </ResponsiveDialog>
  )
}
