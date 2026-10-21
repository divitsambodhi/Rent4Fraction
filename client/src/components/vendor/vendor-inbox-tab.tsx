import { useCallback, useEffect, useState } from 'react'
import { Bell, Inbox, MessageSquare, Search, X } from 'lucide-react'
import { ConversationListItem } from '@/components/account/conversation-list-item'
import { ThreadView } from '@/components/account/thread-view'
import { NotificationsPane } from '@/components/account/notifications-pane'
import { useAppSearchParams } from '@/components/shared/app-link'
import { getVendorConversations, getVendorNotifications } from '@/lib/api/vendor-store'
import type { Conversation } from '@/types/account'
import { cn } from '@/lib/utils'

export function VendorInboxTab() {
  const [searchParams, setSearchParams] = useAppSearchParams()

  const view = searchParams.get('view') === 'notifications' ? 'notifications' : 'messages'
  const threadId = searchParams.get('thread')
  const nf = (searchParams.get('nf') || 'all') as 'all' | 'unread'

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(0)

  // Update query params helper
  const updateQuery = useCallback((updates: Record<string, string | null>, pushHistory = false) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      Object.entries(updates).forEach(([key, val]) => {
        if (val === null || val === '') {
          next.delete(key)
        } else {
          next.set(key, val)
        }
      })
      return next
    }, { replace: !pushHistory })
  }, [setSearchParams])

  const loadData = useCallback(() => {
    setLoading(true)
    const rawConvs = getVendorConversations('1')
    const filtered = searchQuery
      ? rawConvs.filter(
          (c) =>
            c.vendor_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.equipment_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.last_message.toLowerCase().includes(searchQuery.toLowerCase()),
        )
      : rawConvs

    setConversations(filtered)
    setLoading(false)

    // If invalid threadId provided, clear param
    if (threadId && !filtered.some((c) => c.conversation_id === threadId)) {
      updateQuery({ thread: null })
    }

    const notifs = getVendorNotifications('1')
    setUnreadNotifsCount(notifs.filter((n) => !n.read).length)
  }, [searchQuery, threadId, updateQuery])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleSelectView = (newView: 'messages' | 'notifications') => {
    updateQuery({ view: newView === 'messages' ? null : newView }, true)
  }

  const handleSelectThread = (id: string) => {
    updateQuery({ thread: id }, true)
  }

  const handleBackFromThread = () => {
    updateQuery({ thread: null })
  }

  const totalUnreadMessages = conversations.reduce((acc, c) => acc + c.unread_count, 0)
  const activeConversation = conversations.find((c) => c.conversation_id === threadId)

  return (
    <div className="space-y-4">
      {/* Segmented Top Switcher: Messages | Notifications */}
      <div className="flex items-center justify-between gap-4 border-b border-border pb-3">
        <div
          role="tablist"
          aria-label="Inbox views"
          className="flex items-center gap-1 p-1 bg-surface border border-border rounded-xl"
        >
          <button
            type="button"
            role="tab"
            aria-selected={view === 'messages'}
            onClick={() => handleSelectView('messages')}
            className={cn(
              'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer',
              view === 'messages'
                ? 'bg-brand text-white shadow-xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
            )}
          >
            <MessageSquare className="size-3.5" />
            <span>Messages</span>
            {totalUnreadMessages > 0 && (
              <span className="size-5 rounded-full bg-white/20 text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                {totalUnreadMessages}
              </span>
            )}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={view === 'notifications'}
            onClick={() => handleSelectView('notifications')}
            className={cn(
              'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer',
              view === 'notifications'
                ? 'bg-brand text-white shadow-xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
            )}
          >
            <Bell className="size-3.5" />
            <span>Notifications</span>
            {unreadNotifsCount > 0 && (
              <span className="size-5 rounded-full bg-brand/20 text-brand text-[10px] font-bold flex items-center justify-center tabular-nums">
                {unreadNotifsCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Main Inbox Content */}
      {view === 'notifications' ? (
        <NotificationsPane
          filter={nf}
          onFilterChange={(newNf) => updateQuery({ nf: newNf === 'all' ? null : newNf })}
          onUpdateBadge={loadData}
        />
      ) : (
        <div className="rounded-2xl border border-border bg-surface overflow-hidden shadow-xs min-h-[560px] grid grid-cols-1 md:grid-cols-12">
          {/* Conversation List Pane (hidden on mobile when thread open) */}
          <div
            className={cn(
              'md:col-span-5 lg:col-span-4 border-r border-border flex flex-col',
              activeConversation ? 'hidden md:flex' : 'flex',
            )}
          >
            {/* Search Bar */}
            <div className="p-3 border-b border-border">
              <div className="relative">
                <Search className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search customer messages..."
                  className="w-full text-base md:text-sm bg-background border border-border rounded-lg pl-9 pr-8 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-brand"
                  enterKeyHint="search"
                  autoCapitalize="none"
                  autoCorrect="off"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Conversation list */}
            <div className="flex-1 overflow-y-auto divide-y divide-border/60">
              {loading ? (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  Loading conversations...
                </div>
              ) : conversations.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground space-y-2">
                  <Inbox className="size-8 mx-auto opacity-40 mb-1" />
                  <p className="text-xs font-semibold text-foreground">No conversations found</p>
                  <p className="text-[11px] text-muted-foreground">
                    Customer queries regarding bookings and equipment appear here.
                  </p>
                </div>
              ) : (
                conversations.map((c) => (
                  <ConversationListItem
                    key={c.conversation_id}
                    conversation={c}
                    isSelected={c.conversation_id === threadId}
                    onSelect={() => handleSelectThread(c.conversation_id)}
                  />
                ))
              )}
            </div>
          </div>

          {/* Thread View Pane */}
          <div
            className={cn(
              'md:col-span-7 lg:col-span-8 flex flex-col',
              !activeConversation ? 'hidden md:flex' : 'flex',
            )}
          >
            {activeConversation ? (
              <ThreadView
                conversation={activeConversation}
                onBack={handleBackFromThread}
                onMessageSent={loadData}
                isMobileFullscreen
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                <MessageSquare className="size-10 opacity-30 mb-2" />
                <p className="text-sm font-semibold text-foreground">Select a conversation</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Choose a customer inquiry from the left to read messages and reply.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
