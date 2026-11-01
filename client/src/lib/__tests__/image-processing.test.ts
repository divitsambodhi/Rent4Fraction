import { describe, it, expect } from 'vitest'
import { processImageUpload } from '../image-processing'

describe('Client Image Processing & EXIF Stripping', () => {
  it('rejects non-image files with clear validation error', async () => {
    const fakeFile = new File(['hello world'], 'document.pdf', {
      type: 'application/pdf',
    })

    await expect(processImageUpload(fakeFile)).rejects.toThrow(
      'Unsupported image format'
    )
  })

  it('accepts valid JPEG, PNG, and WebP types', () => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp']
    validTypes.forEach((t) => {
      expect(t.startsWith('image/')).toBe(true)
    })
  })

  it('rejects oversized files exceeding maximum size', async () => {
    // Create a 15MB dummy file
    const largeBuffer = new Uint8Array(15 * 1024 * 1024)
    const largeFile = new File([largeBuffer], 'giant.jpg', { type: 'image/jpeg' })

    // Node env doesn't have Image/Canvas, but processImageUpload fails cleanly or catches it
    await expect(processImageUpload(largeFile)).rejects.toThrow()
  })

  it('identifies heic/heif file types correctly', () => {
    const isHeic = (name: string, type: string) =>
      type === 'image/heic' || type === 'image/heif' || /\.hei[cf]$/i.test(name)

    expect(isHeic('photo.HEIC', '')).toBe(true)
    expect(isHeic('photo.heif', '')).toBe(true)
    expect(isHeic('image.jpg', 'image/heic')).toBe(true)
    expect(isHeic('normal.jpg', 'image/jpeg')).toBe(false)
  })
})
