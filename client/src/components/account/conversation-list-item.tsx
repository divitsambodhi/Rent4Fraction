import type { Conversation } from '@/types/account'
import { format, isToday, isYesterday, parseISO } from 'date-fns'
import { cn } from '@/lib/utils'

interface ConversationListItemProps {
  conversation: Conversation
  isSelected: boolean
  onSelect: () => void
}

function formatRelativeTime(dateStr: string): string {
  try {
    const d = parseISO(dateStr)
    if (isToday(d)) {
      return format(d, 'hh:mm a')
    }
    if (isYesterday(d)) {
      return 'Yesterday'
    }
    return format(d, 'dd MMM')
  } catch {
    return dateStr
  }
}

export function ConversationListItem({
  conversation,
  isSelected,
  onSelect,
}: ConversationListItemProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'group relative flex items-start gap-3 w-full p-3.5 min-h-[72px] text-left transition-colors cursor-pointer select-none border-b border-border/70',
        isSelected
          ? 'bg-brand/10'
          : 'hover:bg-muted/40'
      )}
    >
      {/* 3px Active Brand Bar */}
      {isSelected && (
        <span
          className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-brand"
          aria-hidden="true"
        />
      )}

      {/* 40px Vendor Initials Avatar */}
      <div className="size-10 rounded-full bg-brand/10 border border-brand/20 text-brand font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
        {conversation.vendor_initials}
      </div>

      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <span className="font-serif font-bold text-xs text-foreground truncate">
            {conversation.vendor_name}
          </span>
          <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
            {formatRelativeTime(conversation.last_message_time)}
          </span>
        </div>

        {/* Equipment Chip */}
        <div className="inline-block max-w-full">
          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-muted text-muted-foreground truncate max-w-[200px] border border-border/60">
            {conversation.equipment_name}
          </span>
        </div>

        {/* 1-Line Message Preview */}
        <p className="text-[11px] text-muted-foreground truncate leading-snug">
          {conversation.last_message}
        </p>
      </div>

      {/* Unread badge */}
      {conversation.unread_count > 0 && (
        <span className="size-5 rounded-full bg-brand text-white text-[10px] font-bold flex items-center justify-center shrink-0 self-center tabular-nums">
          {conversation.unread_count}
        </span>
      )}
    </button>
  )
}
