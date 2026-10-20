import { Check, CheckCheck, Clock, AlertCircle } from 'lucide-react'
import type { Message } from '@/types/account'
import { format, parseISO } from 'date-fns'
import { cn } from '@/lib/utils'

interface MessageBubbleProps {
  message: Message
  onRetry?: (msg: Message) => void
}

function formatMsgTime(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'hh:mm a')
  } catch {
    return dateStr
  }
}

export function MessageBubble({ message, onRetry }: MessageBubbleProps) {
  const isOwn = message.sender === 'customer'
  const isFailed = message.status === 'failed'
  const isSending = message.status === 'sending'

  return (
    <div
      className={cn(
        'flex flex-col mb-3',
        isOwn ? 'items-end' : 'items-start'
      )}
    >
      <div
        className={cn(
          'max-w-[85%] sm:max-w-[75%] px-4 py-2.5 rounded-[16px] text-xs leading-relaxed break-words shadow-xs select-text',
          isOwn
            ? 'bg-brand text-white rounded-br-[4px]'
            : 'bg-surface text-foreground border border-border rounded-bl-[4px]'
        )}
      >
        <p className="whitespace-pre-wrap">{message.text}</p>
      </div>

      {/* Timestamp and Status Row */}
      <div
        className={cn(
          'flex items-center gap-1.5 mt-1 text-[10px]',
          isOwn ? 'text-muted-foreground mr-1' : 'text-muted-foreground ml-1'
        )}
      >
        <span>{formatMsgTime(message.created_at)}</span>

        {isOwn && (
          <>
            <span>·</span>
            {isSending ? (
              <span className="flex items-center gap-1 text-muted-foreground">
                <Clock className="size-2.5 animate-pulse" />
                <span>Sending…</span>
              </span>
            ) : isFailed ? (
              <button
                type="button"
                onClick={() => onRetry?.(message)}
                className="flex items-center gap-1 text-danger font-semibold hover:underline cursor-pointer"
              >
                <AlertCircle className="size-2.5" />
                <span>Failed. Retry</span>
              </button>
            ) : message.status === 'seen' ? (
              <span className="flex items-center gap-0.5 text-brand" title="Seen by vendor">
                <CheckCheck className="size-3" />
                <span>Seen</span>
              </span>
            ) : (
              <span className="flex items-center gap-0.5 text-muted-foreground" title="Sent">
                <Check className="size-3" />
                <span>Sent</span>
              </span>
            )}
          </>
        )}
      </div>
    </div>
  )
}
