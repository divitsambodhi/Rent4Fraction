import { useState } from 'react'
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface IncludesEditorProps {
  items: string[]
  onChange: (items: string[]) => void
  disabled?: boolean
  maxItems?: number
}

export function IncludesEditor({
  items,
  onChange,
  disabled = false,
  maxItems = 15,
}: IncludesEditorProps) {
  const [newText, setNewText] = useState('')

  const handleAdd = () => {
    const trimmed = newText.trim()
    if (!trimmed || items.includes(trimmed) || items.length >= maxItems) return
    onChange([...items, trimmed])
    setNewText('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAdd()
    }
  }

  const handleRemove = (index: number) => {
    onChange(items.filter((_, i) => i !== index))
  }

  const handleMoveUp = (index: number) => {
    if (index === 0) return
    const next = [...items]
    const temp = next[index - 1]
    next[index - 1] = next[index]
    next[index] = temp
    onChange(next)
  }

  const handleMoveDown = (index: number) => {
    if (index === items.length - 1) return
    const next = [...items]
    const temp = next[index + 1]
    next[index + 1] = next[index]
    next[index] = temp
    onChange(next)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-foreground">
          What is included in the box / package
        </label>
        <span className="text-[11px] text-muted-foreground tabular-nums">
          {items.length}/{maxItems} items
        </span>
      </div>

      {/* Add Item Bar */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled || items.length >= maxItems}
          placeholder="e.g. Heavy-duty power cord, Carrying case, XLR cable..."
          className="flex-1 text-xs sm:text-sm p-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-brand disabled:opacity-60"
        />
        <Button
          type="button"
          size="sm"
          onClick={handleAdd}
          disabled={disabled || !newText.trim() || items.length >= maxItems}
          className="text-xs h-9 px-3 gap-1 bg-brand hover:bg-brand-hover text-white"
        >
          <Plus className="size-3.5" />
          <span>Add</span>
        </Button>
      </div>

      {/* Reorderable Items List */}
      {items.length > 0 && (
        <div className="rounded-xl border border-border divide-y divide-border/60 overflow-hidden bg-background">
          {items.map((item, index) => (
            <div
              key={index}
              className="p-2.5 flex items-center justify-between gap-2 text-xs text-foreground group hover:bg-muted/30"
            >
              <span className="truncate flex-1 pl-1 font-medium">{item}</span>

              <div className="flex items-center gap-1 shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={disabled || index === 0}
                  onClick={() => handleMoveUp(index)}
                  className="size-7"
                  aria-label={`Move ${item} up`}
                >
                  <ArrowUp className="size-3.5" />
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={disabled || index === items.length - 1}
                  onClick={() => handleMoveDown(index)}
                  className="size-7"
                  aria-label={`Move ${item} down`}
                >
                  <ArrowDown className="size-3.5" />
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={disabled}
                  onClick={() => handleRemove(index)}
                  className="size-7 text-danger hover:text-danger hover:bg-danger/10"
                  aria-label={`Remove ${item}`}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
