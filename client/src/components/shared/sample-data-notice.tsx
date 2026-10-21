import { useState } from 'react'
import { Icon } from '@/components/ui/icon'

interface SampleDataNoticeProps {
  dismissible?: boolean
}

/**
 * SampleDataNotice: Explicit, honest labelling that vendors, prices, and reviews are examples.
 * Shown in the footer and as a dismissible strip on Home.
 * Controlled by VITE_SHOW_SAMPLE_NOTICE (default true).
 */
export function SampleDataNotice({ dismissible = false }: SampleDataNoticeProps) {
  const [dismissed, setDismissed] = useState(false)

  // Only show if mock/sample notice is not explicitly disabled
  const showNotice = import.meta.env.VITE_SHOW_SAMPLE_NOTICE !== 'false'

  if (!showNotice || (dismissible && dismissed)) {
    return null
  }

  if (dismissible) {
    return (
      <aside aria-label="Sample data notice" className="w-full bg-muted/70 border-b border-border py-2 px-4 text-center text-label-sm text-text-secondary flex items-center justify-center gap-2">
        <span>Sample data: vendors, prices, and reviews are examples.</span>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="text-text-secondary hover:text-foreground p-0.5 ml-2 focus:outline-none focus-visible:ring-1 focus-visible:ring-brand rounded-xs"
          aria-label="Dismiss sample data notice"
        >
          <Icon name="close" size={14} />
        </button>
      </aside>
    )
  }

  return (
    <div className="text-label-sm text-text-secondary pt-2">
      Sample data: vendors, prices, and reviews are examples.
    </div>
  )
}
