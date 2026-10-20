import { cn } from '@/lib/utils'

export type StatusType =
  // Success
  | 'completed'
  | 'delivered'
  | 'paid'
  | 'approved'
  | 'resolved'
  | 'active'
  | 'returned'
  | 'good'
  | 'delivery_available'
  // Warning
  | 'pending'
  | 'scheduled'
  | 'unpaid'
  | 'partial'
  | 'processing'
  | 'reported'
  | 'late'
  // Info
  | 'confirmed'
  | 'accepted'
  | 'dispatched'
  | 'out_for_delivery'
  | 'pickup'
  | 'delivery'
  // Brand
  | 'in_progress'
  // Danger
  | 'cancelled'
  | 'rejected'
  | 'failed'
  | 'suspended'
  | 'disputed'
  | 'lost'
  | 'major_damage'
  | 'incomplete'
  // Neutral
  | 'inactive'
  | 'archived'
  | 'refunded'
  | 'out_of_stock'
  | 'minor_damage'

interface StatusBadgeProps {
  status: StatusType | string
  label?: string
  className?: string
  size?: 'sm' | 'md'
}

const SUCCESS_STATUSES = new Set([
  'completed',
  'delivered',
  'paid',
  'approved',
  'resolved',
  'active',
  'returned',
  'good',
  'delivery_available',
])

const WARNING_STATUSES = new Set([
  'pending',
  'scheduled',
  'unpaid',
  'partial',
  'processing',
  'reported',
  'late',
])

const INFO_STATUSES = new Set([
  'confirmed',
  'accepted',
  'dispatched',
  'out_for_delivery',
  'pickup',
  'delivery',
])

const DANGER_STATUSES = new Set([
  'cancelled',
  'rejected',
  'failed',
  'suspended',
  'disputed',
  'lost',
  'major_damage',
  'incomplete',
])

const BRAND_STATUSES = new Set(['in_progress'])

export function StatusBadge({
  status,
  label,
  className,
  size = 'md',
}: StatusBadgeProps) {
  const norm = status.toLowerCase().replace(/\s+/g, '_')

  let category: 'success' | 'warning' | 'info' | 'danger' | 'brand' | 'neutral' = 'neutral'
  if (SUCCESS_STATUSES.has(norm)) category = 'success'
  else if (WARNING_STATUSES.has(norm)) category = 'warning'
  else if (INFO_STATUSES.has(norm)) category = 'info'
  else if (DANGER_STATUSES.has(norm)) category = 'danger'
  else if (BRAND_STATUSES.has(norm)) category = 'brand'

  const styles = {
    success: 'bg-success/15 text-success border-success/30',
    warning: 'bg-warning/15 text-warning border-warning/30',
    info: 'bg-info/15 text-info border-info/30',
    danger: 'bg-danger/15 text-danger border-danger/30',
    brand: 'bg-brand/10 text-brand border-brand/20',
    neutral: 'bg-muted text-muted-foreground border-border',
  }

  const dotStyles = {
    success: 'bg-success',
    warning: 'bg-warning',
    info: 'bg-info',
    danger: 'bg-danger',
    brand: 'bg-brand',
    neutral: 'bg-muted-foreground',
  }

  const displayLabel =
    label ||
    status
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase())

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-medium tracking-wide transition-colors',
        size === 'sm' ? 'h-6 px-2 text-[11px]' : 'h-6.5 px-2.5 text-xs',
        styles[category],
        className,
      )}
    >
      <span
        className={cn(
          'size-1.5 rounded-full shrink-0 animate-pulse',
          dotStyles[category],
        )}
      />
      <span>{displayLabel}</span>
    </span>
  )
}
