/**
 * Cloudinary URL Builder & Delivery Utilities
 * Supports named presets, dynamic DPR/format/quality optimization, LQIP, and private signed delivery.
 */
import { apiClient } from '@/lib/api/client'

export type CloudinaryPreset = 'card' | 'detail' | 'thumb' | 'logo' | 'zoom' | 'hero'

export const NAMED_TRANSFORMATIONS: Record<CloudinaryPreset, string> = {
  card: 't_listing_card',
  detail: 't_detail_page',
  thumb: 't_thumbnail',
  logo: 't_vendor_logo',
  zoom: 't_zoom_view',
  hero: 't_hero_carousel',
}

export interface CloudinaryTransformOptions {
  preset?: CloudinaryPreset
  width?: number
  height?: number
  crop?: 'fill' | 'fit' | 'limit' | 'scale' | 'thumb'
  gravity?: 'auto' | 'face' | 'center'
  quality?: 'auto' | number
  format?: 'auto' | 'webp' | 'jpg' | 'png'
  dpr?: 'auto' | number
  blur?: number
}

const PRESET_CONFIGS: Record<CloudinaryPreset, CloudinaryTransformOptions> = {
  card: { width: 600, height: 450, crop: 'fill', gravity: 'auto', quality: 'auto', format: 'auto', dpr: 'auto' },
  detail: { width: 1200, height: 900, crop: 'limit', quality: 'auto', format: 'auto', dpr: 'auto' },
  thumb: { width: 160, height: 160, crop: 'fill', gravity: 'auto', quality: 'auto', format: 'auto', dpr: 'auto' },
  logo: { width: 240, height: 240, crop: 'fit', quality: 'auto', format: 'auto', dpr: 'auto' },
  zoom: { width: 2000, crop: 'limit', quality: 'auto', format: 'auto', dpr: 'auto' },
  hero: { width: 1600, height: 800, crop: 'fill', gravity: 'auto', quality: 'auto', format: 'auto', dpr: 'auto' },
}

export function getCloudName(): string {
  return import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'rent4fraction-dev'
}

/**
 * Builds a transformed Cloudinary delivery URL for a public image.
 * Uses named presets or custom overrides.
 */
export function buildCloudinaryUrl(
  publicId: string | null | undefined,
  options: CloudinaryTransformOptions = {}
): string {
  if (!publicId) return ''
  // If it's already a full HTTP(S) URL or data URL, return it directly
  if (publicId.startsWith('http://') || publicId.startsWith('https://') || publicId.startsWith('data:')) {
    return publicId
  }

  const cloudName = getCloudName()
  // If using strict preset template without custom override
  if (options.preset && !options.width && !options.height && !options.crop && !options.blur) {
    const template = NAMED_TRANSFORMATIONS[options.preset]
    if (template) {
      const cleanId = publicId.replace(/^\/+/, '')
      return `https://res.cloudinary.com/${cloudName}/image/upload/${template}/${cleanId}`
    }
  }

  const baseConfig = options.preset ? PRESET_CONFIGS[options.preset] : {}
  const merged: CloudinaryTransformOptions = { ...baseConfig, ...options }

  const parts: string[] = []

  if (merged.width) parts.push(`w_${merged.width}`)
  if (merged.height) parts.push(`h_${merged.height}`)
  if (merged.crop) parts.push(`c_${merged.crop}`)
  if (merged.gravity) parts.push(`g_${merged.gravity}`)
  if (merged.blur) parts.push(`e_blur:${merged.blur}`)

  parts.push(merged.quality ? `q_${merged.quality}` : 'q_auto')
  parts.push(merged.format ? `f_${merged.format}` : 'f_auto')
  parts.push(merged.dpr ? `dpr_${merged.dpr}` : 'dpr_auto')

  const transformSegment = parts.join(',')
  const cleanId = publicId.replace(/^\/+/, '')

  return `https://res.cloudinary.com/${cloudName}/image/upload/${transformSegment}/${cleanId}`
}

/**
 * Generates an ultra-lightweight LQIP (Low Quality Image Placeholder) URL with strong blur.
 */
export function buildLqipUrl(publicId: string | null | undefined): string {
  if (!publicId) return ''
  if (publicId.startsWith('data:') || publicId.startsWith('blob:')) return publicId
  if (publicId.startsWith('http://') || publicId.startsWith('https://')) return publicId

  const cloudName = getCloudName()
  const cleanId = publicId.replace(/^\/+/, '')
  return `https://res.cloudinary.com/${cloudName}/image/upload/t_lqip_shimmer/${cleanId}`
}

/**
 * Builds responsive srcset string for a given preset or width array.
 */
export function buildCloudinarySrcSet(
  publicId: string | null | undefined,
  preset: CloudinaryPreset = 'card',
  customWidths?: number[]
): string | undefined {
  if (!publicId) return undefined
  if (publicId.startsWith('data:') || publicId.startsWith('blob:')) return undefined

  const cloudName = getCloudName()
  const cleanId = publicId.replace(/^\/+/, '')

  let widths: number[] = customWidths || []
  if (widths.length === 0) {
    switch (preset) {
      case 'card':
        widths = [300, 600, 900, 1200]
        break
      case 'detail':
        widths = [600, 900, 1200, 1600]
        break
      case 'thumb':
        widths = [80, 160, 240, 320]
        break
      case 'logo':
        widths = [120, 240, 360, 480]
        break
      case 'hero':
        widths = [800, 1200, 1600, 2000]
        break
      case 'zoom':
        widths = [1000, 1500, 2000]
        break
    }
  }

  const baseConfig = PRESET_CONFIGS[preset]

  return widths
    .map((w) => {
      const parts: string[] = [`w_${w}`]
      if (baseConfig.height && baseConfig.width) {
        const scaledH = Math.round((w / baseConfig.width) * baseConfig.height)
        parts.push(`h_${scaledH}`)
      }
      if (baseConfig.crop) parts.push(`c_${baseConfig.crop}`)
      if (baseConfig.gravity) parts.push(`g_${baseConfig.gravity}`)
      parts.push('f_auto', 'q_auto', 'dpr_auto')

      const transform = parts.join(',')
      return `https://res.cloudinary.com/${cloudName}/image/upload/${transform}/${cleanId} ${w}w`
    })
    .join(', ')
}

/**
 * Fetches a short-lived (300s TTL) signed delivery URL for a private asset
 * (e.g. delivery proof or damage report photo) from the backend.
 */
export async function fetchPrivateDeliveryUrl(publicId: string): Promise<string> {
  if (!publicId) throw new Error('publicId is required')
  // If it's already a full signed URL or http URL, return it
  if (publicId.startsWith('http://') || publicId.startsWith('https://')) {
    return publicId
  }

  const cleanId = publicId.replace(/^\/+/, '')
  const response = await apiClient.get<{ url: string; expires_at: string }>(
    `/api/v1/uploads/private/${cleanId}`
  )
  return response.url
}
