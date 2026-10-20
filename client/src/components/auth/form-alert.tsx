import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface FormAlertProps {
  type?: 'error' | 'warning' | 'info' | 'success'
  title?: string
  message: string
  className?: string
  onDismiss?: () => void
}

export function FormAlert({
  type = 'error',
  title,
  message,
  className,
  onDismiss,
}: FormAlertProps) {
  if (!message) return null

  const icons = {
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
    success: CheckCircle2,
  }

  const styles = {
    error: 'bg-danger/10 border-danger/30 text-danger',
    warning: 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400',
    info: 'bg-info/10 border-info/30 text-info',
    success: 'bg-brand/10 border-brand/30 text-brand',
  }

  const Icon = icons[type]

  return (
    <div
      role="alert"
      className={cn(
        'p-3.5 rounded-[10px] border flex items-start justify-between gap-2.5 text-xs leading-relaxed animate-in fade-in-0 duration-150',
        styles[type],
        className,
      )}
    >
      <div className="flex items-start gap-2.5 min-w-0">
        <Icon className="size-4 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          {title && <p className="font-semibold tracking-tight">{title}</p>}
          <p className="opacity-90">{message}</p>
        </div>
      </div>

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="size-5 rounded flex items-center justify-center opacity-70 hover:opacity-100 transition-opacity cursor-pointer shrink-0"
          aria-label="Dismiss alert"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  )
}
