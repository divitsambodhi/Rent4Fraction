import React, { useState } from 'react'
import { cn } from '@/lib/utils'

export interface ProductImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string
  alt: string
  category?: string
  aspectRatio?: '4/3' | '16/9' | '1/1'
  className?: string
  widths?: number[]
  sizes?: string
  fetchPriority?: 'high' | 'low' | 'auto'
}

/**
 * Helper to build responsive srcset from an image URL and array of widths.
 * For URLs that support width param (e.g., Unsplash, Cloudinary, CDN) it appends w=;
 * otherwise it formats srcset with descriptors.
 */
function buildSrcSet(url: string, widths?: number[]): string | undefined {
  if (!widths || widths.length === 0) return undefined
  if (url.startsWith('data:') || url.startsWith('blob:')) return undefined

  return widths
    .map((w) => {
      // If URL already has query parameters or supports w=
      const separator = url.includes('?') ? '&' : '?'
      const resizedUrl = url.includes('w=')
        ? url.replace(/w=\d+/, `w=${w}`)
        : `${url}${separator}w=${w}&auto=format&fit=crop`
      return `${resizedUrl} ${w}w`
    })
    .join(', ')
}

/**
 * ProductImage: Honest retail fallback tile with responsive srcset and sizes.
 * A flat neutral tile (background color) with the item's category name in label-md
 * and a fixed aspect ratio container (preventing layout shift).
 */
export function ProductImage({
  src,
  alt,
  category,
  aspectRatio = '4/3',
  className,
  loading = 'lazy',
  decoding = 'async',
  fetchPriority,
  widths = [400, 800, 1200],
  sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
  ...props
}: ProductImageProps) {
  const [hasError, setHasError] = useState(false)

  const aspectClass = {
    '4/3': 'aspect-[4/3]',
    '16/9': 'aspect-video',
    '1/1': 'aspect-square',
  }[aspectRatio]

  if (!src || hasError) {
    return (
      <div
        className={cn(
          'relative w-full flex flex-col items-center justify-center bg-muted/60 border-b border-border select-none p-4 rounded-t-sm',
          aspectClass,
          className,
        )}
        role="img"
        aria-label={alt}
      >
        <span className="text-label-md font-medium text-text-secondary tracking-normal text-center">
          {category || 'Equipment'}
        </span>
      </div>
    )
  }

  const srcSet = buildSrcSet(src, widths)

  return (
    <div
      className={cn(
        'relative w-full overflow-hidden bg-muted/30 border-b border-border rounded-t-sm',
        aspectClass,
        className,
      )}
    >
      <img
        src={src}
        srcSet={srcSet}
        sizes={sizes}
        alt={alt}
        loading={loading}
        decoding={decoding}
        // @ts-expect-error React types fetchPriority
        fetchpriority={fetchPriority}
        onError={() => setHasError(true)}
        className="w-full h-full object-cover"
        {...props}
      />
    </div>
  )
}
