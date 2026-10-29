import React, { useState } from 'react'
import {
  buildCloudinaryUrl,
  buildCloudinarySrcSet,
  buildLqipUrl,
  type CloudinaryPreset,
} from '@/lib/cloudinary'
import { cn } from '@/lib/utils'
import { ImageIcon } from 'lucide-react'

export interface CloudImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  publicId?: string | null
  src?: string | null
  alt: string
  preset?: CloudinaryPreset
  aspectRatio?: '4/3' | '16/9' | '1/1' | 'auto'
  priority?: boolean
  className?: string
  imgClassName?: string
  fallbackText?: string
  showLqip?: boolean
}

const DEFAULT_DIMENSIONS: Record<CloudinaryPreset, { width: number; height: number }> = {
  card: { width: 600, height: 450 },
  detail: { width: 1200, height: 900 },
  thumb: { width: 160, height: 160 },
  logo: { width: 240, height: 240 },
  zoom: { width: 2000, height: 1500 },
  hero: { width: 1600, height: 800 },
}

const DEFAULT_SIZES: Record<CloudinaryPreset, string> = {
  card: '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
  detail: '(max-width: 768px) 100vw, 1200px',
  thumb: '160px',
  logo: '240px',
  zoom: '100vw',
  hero: '100vw',
}

/**
 * CloudImage: Universal component for rendering optimized Cloudinary and fallback images.
 * Implements named presets, explicit width/height for zero CLS, responsive srcset,
 * LQIP blur transition, and accessible fallback state.
 */
export function CloudImage({
  publicId,
  src,
  alt,
  preset = 'card',
  aspectRatio = '4/3',
  priority = false,
  className,
  imgClassName,
  fallbackText,
  showLqip = true,
  width,
  height,
  sizes,
  onLoad,
  onError,
  ...props
}: CloudImageProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)

  const defaultDims = DEFAULT_DIMENSIONS[preset]
  const explicitWidth = width ?? defaultDims.width
  const explicitHeight = height ?? defaultDims.height

  const resolvedSizes = sizes || DEFAULT_SIZES[preset]

  const aspectClass = {
    '4/3': 'aspect-[4/3]',
    '16/9': 'aspect-video',
    '1/1': 'aspect-square',
    'auto': '',
  }[aspectRatio]

  // Decide source
  const effectivePublicId = publicId?.trim()
  const effectiveSrc = src?.trim()

  const isCloudinary = Boolean(
    effectivePublicId &&
      !effectivePublicId.startsWith('http://') &&
      !effectivePublicId.startsWith('https://') &&
      !effectivePublicId.startsWith('data:') &&
      !effectivePublicId.startsWith('blob:')
  )

  const finalSrc = isCloudinary
    ? buildCloudinaryUrl(effectivePublicId, { preset })
    : effectivePublicId || effectiveSrc || ''

  const finalSrcSet = isCloudinary
    ? buildCloudinarySrcSet(effectivePublicId, preset)
    : undefined

  const lqipUrl = isCloudinary && showLqip ? buildLqipUrl(effectivePublicId) : undefined

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setIsLoaded(true)
    onLoad?.(e)
  }

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setHasError(true)
    onError?.(e)
  }

  // Fallback state
  if (!finalSrc || hasError) {
    return (
      <div
        className={cn(
          'relative w-full flex flex-col items-center justify-center bg-muted/50 border border-border/60 text-muted-foreground select-none p-4 rounded-sm',
          aspectClass,
          className
        )}
        role="img"
        aria-label={alt || fallbackText || 'Image not available'}
      >
        <ImageIcon className="size-6 mb-1 text-muted-foreground/70" />
        <span className="text-xs font-medium text-center line-clamp-1">
          {fallbackText || alt || 'Photo unavailable'}
        </span>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'relative w-full overflow-hidden bg-muted/20 select-none',
        aspectClass,
        className
      )}
    >
      {/* LQIP Blur Background (smooth transition) */}
      {lqipUrl && !isLoaded && (
        <img
          src={lqipUrl}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover filter blur-md scale-105 pointer-events-none"
        />
      )}

      {/* Main Image */}
      <img
        src={finalSrc}
        srcSet={finalSrcSet}
        sizes={resolvedSizes}
        alt={alt}
        width={explicitWidth}
        height={explicitHeight}
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'sync' : 'async'}
        // @ts-expect-error fetchpriority attribute
        fetchpriority={priority ? 'high' : 'auto'}
        onLoad={handleImageLoad}
        onError={handleImageError}
        className={cn(
          'w-full h-full object-cover transition-opacity duration-300',
          !isLoaded && lqipUrl ? 'opacity-0' : 'opacity-100',
          imgClassName
        )}
        {...props}
      />
    </div>
  )
}
