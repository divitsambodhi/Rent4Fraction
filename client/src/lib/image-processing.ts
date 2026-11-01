/**
 * Client-side image processing utility.
 * Downscales images to max 1600px on the long side,
 * corrects EXIF orientation via createImageBitmap or canvas,
 * and re-encodes to WebP (fallback JPEG) at 0.8 quality.
 */

export interface ProcessedImage {
  dataUrl: string
  file: File | Blob
  width: number
  height: number
  sizeBytes: number
}

export async function processImageUpload(
  file: File,
  maxDimension = 2000,
  quality = 0.8,
): Promise<ProcessedImage> {
  const isHeic = file.type === 'image/heic' || file.type === 'image/heif' || /\.hei[cf]$/i.test(file.name)
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
  if (!isHeic && !allowedTypes.includes(file.type) && !file.type.startsWith('image/')) {
    throw new Error('Unsupported image format. Please select a JPG, PNG, WebP, or HEIC photo.')
  }

  // Convert HEIC/HEIF files to JPEG using client-side wasm/canvas
  let sourceBlob: Blob = file
  if (isHeic) {
    try {
      const heic2anyModule = await import('heic2any');
      const heic2any = (heic2anyModule as any).default || heic2anyModule;
      const converted = await heic2any({
        blob: file,
        toType: 'image/jpeg',
        quality: 0.9,
      })
      sourceBlob = Array.isArray(converted) ? converted[0] : converted
    } catch {
      throw new Error('Could not convert HEIC photo. Please save as JPEG or WebP and try again.')
    }
  }

  // Use createImageBitmap with imageOrientation: 'from-image' for automatic EXIF orientation handling
  let bitmap: ImageBitmap | null = null
  try {
    if (typeof window !== 'undefined' && 'createImageBitmap' in window) {
      bitmap = await createImageBitmap(sourceBlob, { imageOrientation: 'from-image' })
    }
  } catch {
    bitmap = null
  }

  let sourceWidth = 0
  let sourceHeight = 0
  let sourceElement: CanvasImageSource

  if (bitmap) {
    sourceWidth = bitmap.width
    sourceHeight = bitmap.height
    sourceElement = bitmap
  } else {
    // Fallback using HTMLImageElement
    const img = new Image()
    const objectUrl = URL.createObjectURL(sourceBlob)
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('The selected image file is corrupted or cannot be read.'))
      img.src = objectUrl
    })
    sourceWidth = img.naturalWidth || img.width
    sourceHeight = img.naturalHeight || img.height
    sourceElement = img
    URL.revokeObjectURL(objectUrl)
  }

  // Calculate scaled dimensions preserving aspect ratio
  let targetWidth = sourceWidth
  let targetHeight = sourceHeight

  if (sourceWidth > maxDimension || sourceHeight > maxDimension) {
    if (sourceWidth >= sourceHeight) {
      targetWidth = maxDimension
      targetHeight = Math.round((sourceHeight / sourceWidth) * maxDimension)
    } else {
      targetHeight = maxDimension
      targetWidth = Math.round((sourceWidth / sourceHeight) * maxDimension)
    }
  }

  // Draw onto canvas
  const canvas = document.createElement('canvas')
  canvas.width = targetWidth
  canvas.height = targetHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Canvas 2D context unavailable')
  }

  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(sourceElement, 0, 0, targetWidth, targetHeight)

  if (bitmap) {
    bitmap.close()
  }

  // Encode to WebP if supported, fallback to JPEG
  return new Promise<ProcessedImage>((resolve, reject) => {
    // Try webp first
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          // Fallback to jpeg
          canvas.toBlob(
            (jpegBlob) => {
              if (!jpegBlob) {
                reject(new Error('Image encoding failed'))
                return
              }
              const dataUrl = canvas.toDataURL('image/jpeg', quality)
              resolve({
                dataUrl,
                file: jpegBlob,
                width: targetWidth,
                height: targetHeight,
                sizeBytes: jpegBlob.size,
              })
            },
            'image/jpeg',
            quality,
          )
          return
        }

        const dataUrl = canvas.toDataURL('image/webp', quality)
        resolve({
          dataUrl,
          file: blob,
          width: targetWidth,
          height: targetHeight,
          sizeBytes: blob.size,
        })
      },
      'image/webp',
      quality,
    )
  })
}
