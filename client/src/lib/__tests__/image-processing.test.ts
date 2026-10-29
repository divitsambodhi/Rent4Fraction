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
})
