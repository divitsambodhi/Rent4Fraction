import { useRef } from 'react'
import { cn } from '@/lib/utils'

export interface ModeTabsProps {
  activeTab?: 'login' | 'signup'
  mode?: 'login' | 'signup'
  onChange: (tab: 'login' | 'signup') => void
  className?: string
}

export function ModeTabs({ activeTab, mode, onChange, className }: ModeTabsProps) {
  const currentTab = activeTab || mode || 'login'
  const tabsRef = useRef<(HTMLButtonElement | null)[]>([])

  const handleKeyDown = (e: React.KeyboardEvent, currentIdx: number) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault()
      const nextIdx = currentIdx === 0 ? 1 : 0
      tabsRef.current[nextIdx]?.focus()
      onChange(nextIdx === 0 ? 'login' : 'signup')
    }
  }

  return (
    <div
      role="tablist"
      aria-label="Authentication modes"
      className={cn(
        'grid grid-cols-2 p-1 bg-muted/60 border border-border/80 rounded-[12px] h-11 relative select-none',
        className,
      )}
    >
      <button
        ref={(el) => {
          tabsRef.current[0] = el
        }}
        role="tab"
        type="button"
        aria-selected={currentTab === 'login'}
        tabIndex={currentTab === 'login' ? 0 : -1}
        onClick={() => onChange('login')}
        onKeyDown={(e) => handleKeyDown(e, 0)}
        className={cn(
          'flex items-center justify-center text-xs sm:text-sm font-semibold rounded-[9px] transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand',
          currentTab === 'login'
            ? 'bg-surface text-foreground shadow-xs'
            : 'text-muted-foreground hover:text-foreground',
        )}
      >
        Log in
      </button>

      <button
        ref={(el) => {
          tabsRef.current[1] = el
        }}
        role="tab"
        type="button"
        aria-selected={currentTab === 'signup'}
        tabIndex={currentTab === 'signup' ? 0 : -1}
        onClick={() => onChange('signup')}
        onKeyDown={(e) => handleKeyDown(e, 1)}
        className={cn(
          'flex items-center justify-center text-xs sm:text-sm font-semibold rounded-[9px] transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand',
          currentTab === 'signup'
            ? 'bg-surface text-foreground shadow-xs'
            : 'text-muted-foreground hover:text-foreground',
        )}
      >
        Sign up
      </button>
    </div>
  )
}
