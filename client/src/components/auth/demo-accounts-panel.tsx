import { useState } from 'react'
import { ChevronDown, ChevronUp, KeyRound, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { INITIAL_MOCK_ACCOUNTS } from '@/lib/auth/mock-accounts'

// Dev-only toggle: strictly enabled only in DEV with mock API mode
export const ENABLE_DEMO_ACCOUNTS =
  import.meta.env.DEV && import.meta.env.VITE_API_MODE === 'mock'

export interface DemoAccountsPanelProps {
  onFill: (email: string, password: string) => void
}

export function DemoAccountsPanel({ onFill }: DemoAccountsPanelProps) {
  const [collapsed, setCollapsed] = useState(true)

  if (!ENABLE_DEMO_ACCOUNTS) return null

  const accountsList = Object.values(INITIAL_MOCK_ACCOUNTS)

  return (
    <div className="w-full rounded-xl border border-dashed border-brand/40 bg-brand/5 p-3.5 sm:p-4 text-xs transition-all">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-foreground font-semibold">
          <span className="px-1.5 py-0.5 rounded bg-brand/20 text-brand text-[10px] font-mono uppercase tracking-wider">
            DEV ONLY
          </span>
          <span className="flex items-center gap-1.5 text-xs">
            <KeyRound className="size-3.5 text-brand" />
            <span>Test Accounts</span>
          </span>
        </div>

        <button
          type="button"
          onClick={() => setCollapsed((prev) => !prev)}
          className="text-muted-foreground hover:text-foreground text-[11px] font-medium flex items-center gap-1 cursor-pointer"
        >
          <span>{collapsed ? 'Show quick fill' : 'Hide'}</span>
          {collapsed ? <ChevronDown className="size-3.5" /> : <ChevronUp className="size-3.5" />}
        </button>
      </div>

      {!collapsed && (
        <div className="mt-3 space-y-2 border-t border-brand/20 pt-2.5">
          <p className="text-[11px] text-muted-foreground">
            Click &ldquo;Fill&rdquo; to populate credentials automatically:
          </p>
          <div className="grid grid-cols-1 gap-2">
            {accountsList.map((acc) => {
              const label =
                acc.user.role === 'customer'
                  ? 'Customer'
                  : acc.user.role === 'admin'
                  ? 'Administrator'
                  : acc.user.vendor?.approval_status === 'pending'
                  ? 'Vendor (Pending)'
                  : 'Vendor (Approved)'

              return (
                <div
                  key={acc.user.email}
                  className="flex items-center justify-between gap-2 p-2 rounded-lg bg-surface/80 border border-border/60 hover:border-brand/30 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-foreground truncate text-xs">
                        {acc.user.name}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        ({label})
                      </span>
                    </div>
                    <div className="text-[11px] text-muted-foreground font-mono truncate">
                      {acc.user.email}
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onFill(acc.user.email, acc.password)}
                    className="h-7 text-xs font-medium px-2.5 text-brand border-brand/30 hover:bg-brand/10 shrink-0"
                  >
                    <Sparkles className="size-3 mr-1" />
                    Fill
                  </Button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
