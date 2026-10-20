import { AlertTriangle } from 'lucide-react'

export const SHOW_LEGAL_PLACEHOLDER_NOTICE = true

export function PlaceholderNotice() {
  if (!SHOW_LEGAL_PLACEHOLDER_NOTICE) return null

  return (
    <div
      role="alert"
      className="p-4 rounded-xl border border-warning/30 bg-warning/10 text-xs sm:text-sm text-warning flex items-start gap-3 my-4"
    >
      <AlertTriangle className="size-5 shrink-0 mt-0.5 text-warning" />
      <div className="space-y-0.5">
        <span className="font-semibold block">Notice: Legal Template Guidance</span>
        <p className="text-xs text-foreground/80 leading-relaxed">
          Placeholder text. Replace with approved legal copy before launch.
        </p>
      </div>
    </div>
  )
}
