import React, { useState } from 'react'
import {
  Armchair,
  Disc3,
  Flame,
  Mic,
  Package,
  Sparkles,
  SquareMenu,
  Tent,
  Volume2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ProductImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string
  alt: string
  category?: string
  aspectRatio?: '4/3' | '16/9' | '1/1'
  className?: string
}

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  // Canonical IDs
  '1': Volume2,
  '2': Mic,
  '3': Disc3,
  '4': Sparkles,
  '5': Flame,
  '6': Armchair,
  '7': SquareMenu,
  '8': Tent,
  // Slugs and names
  speakers: Volume2,
  microphones: Mic,
  'dj equipment': Disc3,
  'dj-equipment': Disc3,
  'stage lights': Sparkles,
  'stage-lights': Sparkles,
  'fairy lights': Flame,
  'fairy-lights': Flame,
  chairs: Armchair,
  tables: SquareMenu,
  'tents & decor': Tent,
  'tents-decor': Tent,
}

export function ProductImage({
  src,
  alt,
  category,
  aspectRatio = '4/3',
  className,
  loading = 'lazy',
  ...props
}: ProductImageProps) {
  const [hasError, setHasError] = useState(false)

  const aspectClass = {
    '4/3': 'aspect-4/3',
    '16/9': 'aspect-video',
    '1/1': 'aspect-square',
  }[aspectRatio]

  const IconComponent =
    (category && CATEGORY_ICONS[category.toLowerCase()]) || Package

  if (!src || hasError) {
    return (
      <div
        className={cn(
          'relative w-full flex items-center justify-center overflow-hidden bg-gradient-to-br from-brand/8 via-muted/40 to-brand/12 border-b border-border/60 select-none',
          aspectClass,
          className,
        )}
        role="img"
        aria-label={alt}
      >
        <div
          className="absolute inset-0 opacity-[0.06] bg-[radial-gradient(#762B36_1px,transparent_1px)] [background-size:16px_16px]"
          aria-hidden="true"
        />
        <div className="flex flex-col items-center justify-center text-brand/40">
          <IconComponent className="size-16 sm:size-20 transition-transform duration-300 group-hover:scale-105" />
          <span className="text-[11px] font-medium tracking-wide uppercase mt-2 text-muted-foreground/80">
            {category || 'Rent4Fraction'}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'relative w-full overflow-hidden bg-muted/30',
        aspectClass,
        className,
      )}
    >
      <img
        src={src}
        alt={alt}
        loading={loading}
        onError={() => setHasError(true)}
        className="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03]"
        {...props}
      />
    </div>
  )
}
