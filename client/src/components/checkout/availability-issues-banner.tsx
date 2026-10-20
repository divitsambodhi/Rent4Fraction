import { AlertCircle, ArrowDown } from 'lucide-react'
import type { CartLine } from '@/types/checkout'
import type { LineAvailabilityResult } from '@/lib/api/cart'

interface AvailabilityIssuesBannerProps {
  lines: CartLine[]
  availabilityMap: Record<string, LineAvailabilityResult>
  onFixLine?: (cartItemId: string) => void
}

export function AvailabilityIssuesBanner({
  lines,
  availabilityMap,
  onFixLine,
}: AvailabilityIssuesBannerProps) {
  const problemLines = lines.filter((l) => availabilityMap[l.cart_item_id]?.is_blocked)

  if (problemLines.length === 0) return null

  return (
    <div
      role="alert"
      className="p-4 rounded-[14px] bg-danger/10 border border-danger/30 text-xs space-y-2.5 animate-in fade-in"
    >
      <div className="flex items-center gap-2 font-bold text-danger text-sm">
        <AlertCircle className="size-4 shrink-0" />
        <span>Availability issues detected</span>
      </div>
      <p className="text-foreground/90 leading-relaxed text-xs">
        The following items have stock or date conflicts for your selected rental period. Please
        adjust quantities or dates before continuing to checkout.
      </p>

      <ul className="space-y-1.5 pt-1">
        {problemLines.map((line) => {
          const avail = availabilityMap[line.cart_item_id]
          return (
            <li
              key={line.cart_item_id}
              className="flex items-center justify-between gap-3 p-2 rounded-[8px] bg-surface/80 border border-danger/20 text-xs"
            >
              <div className="space-y-0.5 min-w-0">
                <span className="font-semibold text-foreground truncate block">
                  {line.name}
                </span>
                <span className="text-[11px] text-danger font-medium block">
                  {avail?.message || 'Item no longer available in this quantity'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (onFixLine) onFixLine(line.cart_item_id)
                  const el = document.getElementById(`cart-line-${line.cart_item_id}`)
                  if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    el.focus?.()
                  }
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[6px] bg-danger text-white hover:bg-danger/90 text-xs font-semibold shrink-0 cursor-pointer transition-colors"
              >
                <span>Fix</span>
                <ArrowDown className="size-3" />
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
