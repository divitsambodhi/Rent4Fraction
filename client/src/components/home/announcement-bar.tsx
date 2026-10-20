import { useState } from 'react'
import { Sparkles, X } from 'lucide-react'
import { AppLink } from '@/components/shared/app-link'

export function AnnouncementBar() {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('r4f-announcement-dismissed') === 'true'
  })

  if (dismissed) return null

  const handleDismiss = () => {
    setDismissed(true)
    try {
      localStorage.setItem('r4f-announcement-dismissed', 'true')
    } catch {
      // Ignore
    }
  }

  return (
    <aside
      aria-label="Announcement"
      className="bg-brand text-white text-xs py-2 px-4 transition-colors relative z-30"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex-1 flex items-center justify-center gap-2 text-center truncate">
          <Sparkles className="size-3.5 shrink-0 text-white/90 animate-pulse" />
          <span className="truncate">
            Delivery available on most items across Mumbai, Pune, Bengaluru, Delhi NCR & Hyderabad.
          </span>
          <AppLink
            to="/help?tab=faq"
            className="hidden sm:inline-flex underline underline-offset-2 hover:text-white/80 font-semibold ml-1 shrink-0"
          >
            Learn more
          </AppLink>
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss announcement"
          className="size-5 rounded flex items-center justify-center hover:bg-white/20 transition-colors shrink-0"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </aside>
  )
}
