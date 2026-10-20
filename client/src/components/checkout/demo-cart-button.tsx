import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface DemoCartButtonProps {
  onLoadDemo: () => void
  disabled?: boolean
  className?: string
}

export function DemoCartButton({
  onLoadDemo,
  disabled = false,
  className,
}: DemoCartButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={disabled}
      onClick={onLoadDemo}
      className={`h-9 px-3.5 text-xs font-semibold gap-1.5 border-dashed border-brand/40 text-brand hover:bg-brand/10 hover:border-brand cursor-pointer ${className || ''}`}
      title="Add 4 demo items across 2 rental periods"
    >
      <Sparkles className="size-3.5" />
      <span>Add demo items (Dev)</span>
    </Button>
  )
}
