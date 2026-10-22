import React, { useState } from 'react'
import { toast } from 'sonner'
import { Icon } from '@/components/ui/icon'
import { useWishlist } from '@/providers/wishlist-provider'
import { cn } from '@/lib/utils'

export interface WishlistButtonProps {
  equipmentId: string
  equipmentName?: string
  className?: string
  stopPropagation?: boolean
}

/**
 * WishlistButton: 36px circular button on a white surface with a 1px ring border,
 * outline heart icon (text-primary) when not saved, filled wine heart when saved,
 * 44px hit area, hover tint only inside @media (hover: hover), 100ms pressed state,
 * 150ms fill and small scale (1 to 1.12 to 1) on toggle, aria-pressed with clear label,
 * optimistic update, and Undo toast on removal.
 */
export function WishlistButton({
  equipmentId,
  equipmentName,
  className,
  stopPropagation = true,
}: WishlistButtonProps) {
  const { isWishlisted, toggleWishlist } = useWishlist()
  const isSaved = isWishlisted(equipmentId)
  const [animating, setAnimating] = useState(false)

  const handleToggle = (e: React.MouseEvent) => {
    if (stopPropagation) {
      e.preventDefault()
      e.stopPropagation()
    }

    setAnimating(true)
    setTimeout(() => setAnimating(false), 200)

    const willRemove = isSaved
    toggleWishlist(equipmentId)

    if (willRemove) {
      toast('Removed from wishlist', {
        description: equipmentName || 'Item removed from your saved equipment',
        action: {
          label: 'Undo',
          onClick: () => toggleWishlist(equipmentId),
        },
      })
    } else {
      toast.success('Saved to wishlist', {
        description: equipmentName || 'Item added to your saved equipment',
      })
    }
  }

  return (
    <button
      type="button"
      role="button"
      aria-pressed={isSaved}
      aria-label={isSaved ? 'Remove from wishlist' : 'Save to wishlist'}
      onClick={handleToggle}
      className={cn(
        'relative min-w-[44px] min-h-[44px] flex items-center justify-center p-1 select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-full cursor-pointer group',
        className,
      )}
    >
      <div
        className={cn(
          'size-9 rounded-full bg-surface border border-border flex items-center justify-center shadow-xs transition-transform duration-200 active:scale-95',
          '[@media(hover:hover)]:group-hover:bg-muted/70',
          animating && 'scale-[1.2] transition-transform ease-out',
        )}
      >
        <Icon
          name={isSaved ? 'heart-filled' : 'heart'}
          size={18}
          className={cn(
            'transition-colors duration-150',
            isSaved ? 'text-brand' : 'text-foreground [@media(hover:hover)]:group-hover:text-brand',
          )}
        />
      </div>
    </button>
  )
}
