import {
  FileText,
  HelpCircle,
  Info,
  Mail,
  RotateCcw,
  Shield,
  Workflow,
} from 'lucide-react'
import { AppLink } from '@/components/shared/app-link'
import type { HelpTab } from '@/types/help'
import { cn } from '@/lib/utils'

interface HelpNavProps {
  currentTab: HelpTab
}

interface NavItem {
  id: HelpTab
  label: string
  icon: React.ComponentType<{ className?: string }>
  section?: 'general' | 'legal'
}

export const helpNavItems: NavItem[] = [
  { id: 'about', label: 'About', icon: Info, section: 'general' },
  { id: 'how-it-works', label: 'How it works', icon: Workflow, section: 'general' },
  { id: 'faq', label: 'Frequently asked questions', icon: HelpCircle, section: 'general' },
  { id: 'contact', label: 'Contact support', icon: Mail, section: 'general' },
  { id: 'terms', label: 'Terms of service', icon: FileText, section: 'legal' },
  { id: 'privacy', label: 'Privacy policy', icon: Shield, section: 'legal' },
  { id: 'refunds', label: 'Refund policy', icon: RotateCcw, section: 'legal' },
]

export function HelpNav({ currentTab }: HelpNavProps) {
  return (
    <>
      {/* Desktop Vertical Nav (>=1024px, 240px width sticky) */}
      <aside className="hidden lg:block w-60 shrink-0 space-y-6">
        <div className="sticky top-24 space-y-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block px-3 mb-1">
              Help & Resources
            </span>
            <div className="space-y-1">
              {helpNavItems
                .filter((item) => item.section === 'general')
                .map((item) => {
                  const Icon = item.icon
                  const isActive = currentTab === item.id

                  return (
                    <AppLink
                      key={item.id}
                      to={`/help?tab=${item.id}`}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors',
                        isActive
                          ? 'bg-brand text-white font-semibold shadow-xs'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                      )}
                    >
                      <Icon className="size-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </AppLink>
                  )
                })}
            </div>
          </div>

          <div className="pt-2 border-t border-border">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block px-3 mb-1">
              Legal & Policies
            </span>
            <div className="space-y-1">
              {helpNavItems
                .filter((item) => item.section === 'legal')
                .map((item) => {
                  const Icon = item.icon
                  const isActive = currentTab === item.id

                  return (
                    <AppLink
                      key={item.id}
                      to={`/help?tab=${item.id}`}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors',
                        isActive
                          ? 'bg-brand text-white font-semibold shadow-xs'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                      )}
                    >
                      <Icon className="size-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </AppLink>
                  )
                })}
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile & Tablet Pill Bar (<1024px) */}
      <div className="lg:hidden w-full overflow-x-auto no-scrollbar border-b border-border pb-2 mb-6">
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          {helpNavItems.map((item) => {
            const isActive = currentTab === item.id

            return (
              <AppLink
                key={item.id}
                to={`/help?tab=${item.id}`}
                className={cn(
                  'px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer',
                  isActive
                    ? 'bg-brand text-white shadow-xs'
                    : 'bg-surface border border-border text-muted-foreground hover:text-foreground hover:bg-muted',
                )}
              >
                {item.label}
              </AppLink>
            )
          })}
        </div>
      </div>
    </>
  )
}
