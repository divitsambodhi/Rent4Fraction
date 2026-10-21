import { useCallback, useEffect, useState } from 'react'
import { ConversationListItem } from './conversation-list-item'
import { ThreadView } from './thread-view'
import { NotificationsPane } from './notifications-pane'
import { useAppSearchParams } from '@/components/shared/app-link'
import { getConversations, getNotifications } from '@/lib/api'
import type { Conversation } from '@/types/account'
import { Icon } from '@/components/ui/icon'
import { cn } from '@/lib/utils'

export function InboxTab() {
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
    getConversations(searchQuery).then((data) => {
      setConversations(data)
      setLoading(false)

      // If invalid threadId provided, clear param
      if (threadId && !data.some((c) => c.conversation_id === threadId)) {
        updateQuery({ thread: null })
      }
    })

    getNotifications('unread').then((data) => {
      setUnreadNotifsCount(data.length)
    })
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
          className="inline-flex p-1 rounded-[12px] bg-muted/60 border border-border"
        >
          <button
            type="button"
            role="tab"
            aria-selected={view === 'messages'}
            onClick={() => handleSelectView('messages')}
            className={cn(
              'min-h-[44px] h-11 sm:h-8 px-4 rounded-[8px] text-xs font-semibold inline-flex items-center gap-2 transition-all cursor-pointer',
              view === 'messages'
                ? 'bg-surface text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon name="message" size={16} />
            <span>Messages</span>
            {totalUnreadMessages > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-brand text-white tabular-nums">
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
              'min-h-[44px] h-11 sm:h-8 px-4 rounded-[8px] text-xs font-semibold inline-flex items-center gap-2 transition-all cursor-pointer',
              view === 'notifications'
                ? 'bg-surface text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon name="bell" size={16} />
            <span>Notifications</span>
            {unreadNotifsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-brand text-white tabular-nums">
                {unreadNotifsCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* VIEW: NOTIFICATIONS */}
      {view === 'notifications' ? (
        <NotificationsPane
          filter={nf}
          onFilterChange={(f) => updateQuery({ nf: f === 'all' ? null : f })}
          onUpdateBadge={loadData}
        />
      ) : (
        /* VIEW: MESSAGES (Master-Detail Card) */
        <div className="rounded-[16px] bg-surface border border-border shadow-xs overflow-hidden h-[calc(100dvh-200px)] min-h-[480px] flex">
          {/* Conversation List Pane (340px on desktop) */}
          <div
            className={cn(
              'w-full lg:w-[340px] shrink-0 border-r border-border flex flex-col h-full bg-surface',
              threadId ? 'hidden lg:flex' : 'flex'
            )}
          >
            {/* Search Header */}
            <div className="p-3 border-b border-border bg-muted/20">
              <div className="relative">
                <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search messages by vendor or gear…"
                  className="w-full h-8.5 pl-8 pr-7 rounded-full border border-border bg-surface text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <Icon name="close" className="size-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Conversations List */}
            <div className="flex-1 overflow-y-auto no-scrollbar divide-y divide-border/60">
              {loading ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  Loading conversations…
                </div>
              ) : conversations.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <Icon name="inbox" className="size-8 text-muted-foreground mx-auto" />
                  <p className="text-xs text-muted-foreground">
                    {searchQuery ? 'No matching conversations found.' : 'No conversations yet.'}
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

          {/* Active Thread Pane */}
          <div
            className={cn(
              'flex-1 flex flex-col h-full bg-surface',
              !threadId ? 'hidden lg:flex' : 'flex'
            )}
          >
            {activeConversation ? (
              <ThreadView
                conversation={activeConversation}
                onBack={handleBackFromThread}
                onMessageSent={loadData}
                isMobileFullscreen={Boolean(threadId)}
              />
            ) : (
              /* No-thread selected placeholder */
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-muted-foreground space-y-2">
                <div className="size-14 rounded-full bg-muted/60 flex items-center justify-center">
                  <Icon name="message" className="size-6 text-muted-foreground" />
                </div>
                <h3 className="font-serif font-semibold text-foreground text-sm">
                  Select a conversation
                </h3>
                <p className="text-xs text-muted-foreground max-w-xs">
                  Choose a message thread from the left to coordinate delivery, ask questions, or verify equipment specs.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
