import { useEffect, useRef, useState } from 'react'
import { AppLink } from '@/components/shared/app-link'
import { MessageBubble } from './message-bubble'
import { MessageComposer } from './message-composer'
import { ArrowDown, ArrowLeft, ExternalLink } from 'lucide-react'
import { getMessages, sendMessage } from '@/lib/api'
import type { Conversation, Message } from '@/types/account'
import { format, isToday, isYesterday, parseISO } from 'date-fns'
import { toast } from 'sonner'

interface ThreadViewProps {
  conversation: Conversation
  onBack?: () => void
  onMessageSent?: () => void
  isMobileFullscreen?: boolean
}

function getDayHeader(dateStr: string): string {
  try {
    const d = parseISO(dateStr)
    if (isToday(d)) return 'Today'
    if (isYesterday(d)) return 'Yesterday'
    return format(d, 'EEEE, dd MMMM yyyy')
  } catch {
    return dateStr
  }
}

export function ThreadView({
  conversation,
  onBack,
  onMessageSent,
  isMobileFullscreen = false,
}: ThreadViewProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [showScrollBottom, setShowScrollBottom] = useState(false)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Focus thread heading when opened on mobile per spec
  useEffect(() => {
    if (isMobileFullscreen) {
      headingRef.current?.focus()
    }
  }, [conversation.conversation_id, isMobileFullscreen])

  // Load messages and mark conversation read
  useEffect(() => {
    let active = true
    setLoading(true)

    getMessages(conversation.conversation_id)
      .then((data) => {
        if (!active) return
        setMessages(data)
      })
      .catch(() => {
        toast.error('Failed to load thread messages.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [conversation.conversation_id])

  // Auto-scroll to bottom on messages load
  const scrollToBottom = (smooth = true) => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto',
      })
      setShowScrollBottom(false)
    }
  }

  useEffect(() => {
    if (!loading) {
      scrollToBottom(false)
    }
  }, [loading, messages.length])

  // Detect scroll position to show/hide "New messages" pill
  const handleScroll = () => {
    const el = scrollContainerRef.current
    if (!el) return
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    setShowScrollBottom(distanceFromBottom > 150)
  }

  const handleSendMessage = async (text: string) => {
    // Optimistic append
    const tempId = `temp_${Date.now()}`
    const optimisticMsg: Message = {
      message_id: tempId,
      conversation_id: conversation.conversation_id,
      sender: 'customer',
      text,
      created_at: new Date().toISOString(),
      status: 'sending',
    }

    setMessages((prev) => [...prev, optimisticMsg])
    scrollToBottom(true)

    try {
      const realMsg = await sendMessage({
        conversationId: conversation.conversation_id,
        text,
      })

      // Update optimistic message to sent
      setMessages((prev) =>
        prev.map((m) => (m.message_id === tempId ? realMsg : m))
      )
      onMessageSent?.()
    } catch {
      // Mark as failed
      setMessages((prev) =>
        prev.map((m) =>
          m.message_id === tempId ? { ...m, status: 'failed' } : m
        )
      )
      toast.error('Could not send message. Click retry.')
    }
  }

  const handleRetry = async (failedMsg: Message) => {
    // Set to sending again
    setMessages((prev) =>
      prev.map((m) =>
        m.message_id === failedMsg.message_id ? { ...m, status: 'sending' } : m
      )
    )

    try {
      const realMsg = await sendMessage({
        conversationId: conversation.conversation_id,
        text: failedMsg.text,
      })
      setMessages((prev) =>
        prev.map((m) =>
          m.message_id === failedMsg.message_id ? realMsg : m
        )
      )
      onMessageSent?.()
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.message_id === failedMsg.message_id ? { ...m, status: 'failed' } : m
        )
      )
      toast.error('Retry failed. Please check connection.')
    }
  }

  // Group messages by day
  const groupedDays: { day: string; msgs: Message[] }[] = []
  messages.forEach((msg) => {
    const day = getDayHeader(msg.created_at)
    const existing = groupedDays.find((g) => g.day === day)
    if (existing) {
      existing.msgs.push(msg)
    } else {
      groupedDays.push({ day, msgs: [msg] })
    }
  })

  return (
    <div className="flex flex-col h-full bg-surface relative">
      {/* Thread Header */}
      <header className="px-4 py-3 border-b border-border bg-surface/95 backdrop-blur-sm flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="lg:hidden p-1.5 -ml-1 text-muted-foreground hover:text-foreground rounded-lg"
              aria-label="Back to conversations list"
            >
              <ArrowLeft className="size-5" />
            </button>
          )}

          <div className="size-10 rounded-full bg-brand/10 border border-brand/20 text-brand font-bold text-xs flex items-center justify-center shrink-0">
            {conversation.vendor_initials}
          </div>

          <div className="min-w-0 space-y-0.5">
            <h2
              ref={headingRef}
              tabIndex={-1}
              className="font-serif font-bold text-sm text-foreground truncate outline-none"
            >
              {conversation.vendor_name}
            </h2>
            <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 truncate">
              <span>About:</span>
              <AppLink
                to={`/equipment/${conversation.equipment_id}`}
                className="font-semibold text-brand hover:underline inline-flex items-center gap-1 truncate"
              >
                <span>{conversation.equipment_name}</span>
                <ExternalLink className="size-2.5" />
              </AppLink>
            </div>
          </div>
        </div>

        {/* Equipment Mini Card */}
        <AppLink
          to={`/equipment/${conversation.equipment_id}`}
          className="hidden sm:flex items-center gap-2 p-1.5 pr-3 rounded-lg border border-border/80 bg-muted/40 hover:bg-muted transition-colors shrink-0 max-w-[200px]"
        >
          <img
            src={conversation.equipment_image}
            alt=""
            className="size-7 rounded object-contain bg-surface"
          />
          <span className="text-[11px] font-semibold text-foreground truncate">
            {conversation.equipment_name}
          </span>
        </AppLink>
      </header>

      {/* Message Log */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        role="log"
        aria-live="polite"
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {loading ? (
          <div className="py-20 text-center text-xs text-muted-foreground">
            Loading messages…
          </div>
        ) : messages.length === 0 ? (
          <div className="py-20 text-center text-xs text-muted-foreground">
            No messages in this conversation yet. Say hello!
          </div>
        ) : (
          groupedDays.map((group) => (
            <div key={group.day} className="space-y-3">
              {/* Day Separator */}
              <div className="flex items-center justify-center my-3">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold text-muted-foreground bg-muted/60 border border-border/60">
                  {group.day}
                </span>
              </div>

              {group.msgs.map((msg) => (
                <MessageBubble
                  key={msg.message_id}
                  message={msg}
                  onRetry={handleRetry}
                />
              ))}
            </div>
          ))
        )}
      </div>

      {/* New Messages Floating Pill */}
      {showScrollBottom && (
        <button
          type="button"
          onClick={() => scrollToBottom(true)}
          className="absolute bottom-20 right-6 z-10 px-3 py-1.5 rounded-full bg-brand text-white text-xs font-semibold shadow-md hover:bg-brand-hover inline-flex items-center gap-1.5 transition-all duration-150 hover:-translate-y-0.5 active:scale-95"
        >
          <ArrowDown className="size-3.5" />
          <span>Latest messages</span>
        </button>
      )}

      {/* Composer */}
      <MessageComposer onSend={handleSendMessage} />
    </div>
  )
}
