import { useEffect, useRef, useState } from 'react'
import { ArrowUp, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MessageComposerProps {
  onSend: (text: string) => Promise<void> | void
  disabled?: boolean
  placeholder?: string
}

const MAX_CHARS = 1000
const COUNTER_THRESHOLD = 900

export function MessageComposer({
  onSend,
  disabled = false,
  placeholder = 'Write a message… (Enter to send, Shift+Enter for new line)',
}: MessageComposerProps) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-grow textarea up to 5 rows
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    const newHeight = Math.min(el.scrollHeight, 120)
    el.style.height = `${newHeight}px`
  }, [text])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleSubmit = async () => {
    const trimmed = text.trim()
    if (!trimmed || sending || disabled) return

    setSending(true)
    const content = trimmed
    setText('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }

    try {
      await onSend(content)
    } finally {
      setSending(false)
      // Refocus textarea after sending
      textareaRef.current?.focus()
    }
  }

  const charLength = text.length
  const showCounter = charLength >= COUNTER_THRESHOLD

  return (
    <div className="p-3 bg-surface border-t border-border space-y-1.5 shrink-0">
      <div className="relative flex items-end gap-2 bg-muted/30 border border-border rounded-[14px] p-1.5 focus-within:ring-2 focus-within:ring-brand focus-within:border-brand transition-all">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS))}
          onKeyDown={handleKeyDown}
          disabled={disabled || sending}
          placeholder={placeholder}
          rows={1}
          maxLength={MAX_CHARS}
          className="flex-1 max-h-[120px] px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground bg-transparent resize-none focus:outline-none leading-relaxed"
        />

        {/* 44px Send Button */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!text.trim() || sending || disabled}
          aria-label="Send message"
          className={cn(
            'size-11 rounded-[10px] flex items-center justify-center transition-all shrink-0',
            text.trim() && !sending && !disabled
              ? 'bg-brand text-white hover:bg-brand-hover shadow-xs cursor-pointer'
              : 'bg-muted text-muted-foreground cursor-not-allowed opacity-50'
          )}
        >
          {sending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ArrowUp className="size-4 stroke-[2.2]" />
          )}
        </button>
      </div>

      {showCounter && (
        <div className="flex justify-end pr-1 text-[10px] font-mono tabular-nums text-muted-foreground">
          <span className={charLength >= MAX_CHARS ? 'text-danger font-bold' : ''}>
            {charLength} / {MAX_CHARS}
          </span>
        </div>
      )}
    </div>
  )
}
