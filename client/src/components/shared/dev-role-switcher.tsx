import { useState } from 'react'
import { ChevronUp, Shield, User, UserCheck, Wrench, X } from 'lucide-react'
import { useAuth } from '@/providers/auth-provider'
import type { UserRole } from '@/types'
import { cn } from '@/lib/utils'

// DEV ONLY: set to false to completely hide/disable this dev widget
export const ENABLE_DEV_ROLE_SWITCHER = true

export function DevRoleSwitcher() {
  const { role, setRole } = useAuth()
  const [expanded, setExpanded] = useState(false)

  if (!ENABLE_DEV_ROLE_SWITCHER) return null

  const roles: { id: UserRole; label: string; icon: typeof User }[] = [
    { id: 'visitor', label: 'Visitor', icon: User },
    { id: 'customer', label: 'Customer (Aarav)', icon: UserCheck },
    { id: 'vendor', label: 'Vendor (Sargam)', icon: Wrench },
    { id: 'admin', label: 'Admin', icon: Shield },
  ]

  return (
    <aside
      aria-label="Developer Role Switcher"
      className="fixed bottom-4 left-4 z-40 text-xs font-sans"
    >
      {expanded ? (
        <div className="bg-surface border border-border rounded-[12px] p-3 shadow-lg max-w-xs animate-in fade-in-0 duration-150">
          <div className="flex items-center justify-between gap-3 pb-2 border-b border-border mb-2">
            <span className="font-semibold text-foreground text-[11px] text-brand">
              // DEV ONLY: Preview as
            </span>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="text-muted-foreground hover:text-foreground size-5 flex items-center justify-center rounded-[4px]"
              aria-label="Collapse role switcher"
            >
              <X className="size-3" />
            </button>
          </div>
          <div className="space-y-1">
            {roles.map((r) => {
              const Icon = r.icon
              const active = role === r.id
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    setRole(r.id)
                    setExpanded(false)
                  }}
                  className={cn(
                    'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[8px] text-left transition-colors text-xs',
                    active
                      ? 'bg-brand text-white font-medium shadow-xs'
                      : 'hover:bg-muted text-foreground',
                  )}
                >
                  <Icon className="size-3.5 shrink-0" />
                  <span className="truncate">{r.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface/90 hover:bg-surface border border-border shadow-md backdrop-blur-xs text-foreground text-[11px] font-medium transition-transform hover:scale-105"
          title="Click to switch preview user role"
        >
          <span className="size-2 rounded-full bg-brand animate-pulse" />
          <span>Role: <strong className="text-brand capitalize">{role}</strong></span>
          <ChevronUp className="size-3 text-muted-foreground" />
        </button>
      )}
    </aside>
  )
}
