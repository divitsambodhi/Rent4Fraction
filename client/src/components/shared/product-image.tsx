import React from 'react'
import { CloudImage } from './cloud-image'
import type { CloudinaryPreset } from '@/lib/cloudinary'

export interface ProductImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  publicId?: string | null
  src?: string | null
  alt: string
  category?: string
  preset?: CloudinaryPreset
  aspectRatio?: '4/3' | '16/9' | '1/1'
  className?: string
  imgClassName?: string
  widths?: number[]
  sizes?: string
  fetchPriority?: 'high' | 'low' | 'auto'
}

/**
 * ProductImage: High-level equipment photo tile delegating to CloudImage.
 * Handles named Cloudinary transformations, responsive srcSet, LQIP blur placeholder,
 * and zero CLS layout container.
 */
export function ProductImage({
  publicId,
  src,
  alt,
  category,
  preset = 'card',
  aspectRatio = '4/3',
  className,
  imgClassName,
  fetchPriority,
  sizes,
  ...props
}: ProductImageProps) {
  return (
    <CloudImage
      publicId={publicId}
      src={src}
      alt={alt}
      preset={preset}
      aspectRatio={aspectRatio}
      priority={fetchPriority === 'high'}
      className={className}
      imgClassName={imgClassName}
      fallbackText={category || alt || 'Equipment'}
      sizes={sizes}
      {...props}
    />
  )
}
