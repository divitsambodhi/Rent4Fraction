import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface ReplyComposerProps {
  initialValue?: string
  onSubmit: (text: string) => Promise<void> | void
  onCancel: () => void
  isSubmitting?: boolean
}

export function ReplyComposer({
  initialValue = '',
  onSubmit,
  onCancel,
  isSubmitting = false,
}: ReplyComposerProps) {
  const [text, setText] = useState(initialValue)
  const maxLength = 500
  const remaining = maxLength - text.length

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim() || text.length > maxLength) return
    await onSubmit(text.trim())
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 p-3.5 rounded-xl border border-border bg-surface space-y-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">
          {initialValue ? 'Edit your response' : 'Write a response'}
        </span>
        <span className={`tabular-nums ${remaining < 0 ? 'text-danger font-bold' : ''}`}>
          {text.length}/{maxLength} characters
        </span>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Thank your customer, answer queries, or provide helpful context..."
        rows={3}
        maxLength={maxLength}
        disabled={isSubmitting}
        className="w-full text-xs sm:text-sm p-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-brand resize-y"
      />

      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCancel}
          disabled={isSubmitting}
          className="text-xs h-8"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={isSubmitting || !text.trim() || text.length > maxLength}
          className="bg-brand hover:bg-brand-hover text-white text-xs h-8"
        >
          {isSubmitting ? 'Posting...' : initialValue ? 'Update reply' : 'Post reply'}
        </Button>
      </div>
    </form>
  )
}
