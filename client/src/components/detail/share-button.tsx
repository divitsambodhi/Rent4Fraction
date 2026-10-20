import { useState } from 'react'
import { Check, Share2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ShareButtonProps {
  title?: string
  className?: string
  variant?: 'outline' | 'ghost' | 'secondary'
  size?: 'default' | 'sm' | 'icon'
}

export function ShareButton({
  title = 'Equipment listing',
  className,
  variant = 'secondary',
  size = 'icon',
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleShare = async () => {
    try {
      if (typeof window !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(window.location.href)
        setCopied(true)
        toast.success('Link copied to clipboard', {
          description: `Share ${title} with your event team.`,
        })
        setTimeout(() => setCopied(false), 2000)
      }
    } catch {
      toast.error('Could not copy link to clipboard')
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={handleShare}
      aria-label="Share this equipment"
      className={cn(
        'size-10 rounded-full bg-surface/90 backdrop-blur-xs border border-border/80 shadow-xs hover:bg-surface hover:border-brand/40 transition-colors',
        className,
      )}
    >
      {copied ? (
        <Check className="size-4 text-brand stroke-[2]" />
      ) : (
        <Share2 className="size-4 text-foreground/80 stroke-[1.75]" />
      )}
    </Button>
  )
}
