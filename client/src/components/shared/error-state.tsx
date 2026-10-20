import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void
  className?: string
}

export function ErrorState({
  title = 'Unable to load content',
  message = 'We encountered an unexpected issue while retrieving data. Please try again.',
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-[16px] border border-danger/20 bg-danger/5 dark:bg-danger/10',
        className,
      )}
    >
      <div className="size-12 rounded-full bg-danger/15 text-danger flex items-center justify-center mb-3">
        <AlertCircle className="size-6" />
      </div>
      <h3 className="font-serif text-lg sm:text-xl font-semibold text-foreground mb-1.5">
        {title}
      </h3>
      <p className="text-sm text-muted-foreground max-w-md mb-5 leading-relaxed">
        {message}
      </p>

      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="gap-2 border-danger/30 text-danger hover:bg-danger/10"
        >
          <RefreshCw className="size-4" />
          <span>Try again</span>
        </Button>
      )}
    </div>
  )
}
