import { describe, it, expect } from 'vitest'
import {
  buildCloudinaryUrl,
  buildCloudinarySrcSet,
  buildLqipUrl,
  getCloudName,
} from '../cloudinary'

describe('Cloudinary URL Builder & Presets', () => {
  const samplePublicId = 'dev/equipment_image/42/speaker-front'

  it('resolves correct cloud name from environment', () => {
    const cloud = getCloudName()
    expect(cloud).toBeTruthy()
    expect(typeof cloud).toBe('string')
  })

  it('builds card preset URL with strict named transformation template', () => {
    const url = buildCloudinaryUrl(samplePublicId, { preset: 'card' })
    expect(url).toContain('https://res.cloudinary.com/')
    expect(url).toContain('/image/upload/')
    expect(url).toContain('/t_listing_card/')
    expect(url).toContain(samplePublicId)
  })

  it('builds detail preset URL with strict named transformation template', () => {
    const url = buildCloudinaryUrl(samplePublicId, { preset: 'detail' })
    expect(url).toContain('/t_detail_page/')
  })

  it('builds thumb preset URL with strict named transformation template', () => {
    const url = buildCloudinaryUrl(samplePublicId, { preset: 'thumb' })
    expect(url).toContain('/t_thumbnail/')
  })

  it('builds logo preset URL with strict named transformation template', () => {
    const url = buildCloudinaryUrl('dev/vendor_logo/12/logo-main', { preset: 'logo' })
    expect(url).toContain('/t_vendor_logo/')
  })

  it('builds zoom preset URL with strict named transformation template', () => {
    const url = buildCloudinaryUrl(samplePublicId, { preset: 'zoom' })
    expect(url).toContain('/t_zoom_view/')
  })

  it('builds hero preset URL with strict named transformation template', () => {
    const url = buildCloudinaryUrl(samplePublicId, { preset: 'hero' })
    expect(url).toContain('/t_hero_carousel/')
  })

  it('generates responsive srcset with descriptors', () => {
    const srcset = buildCloudinarySrcSet(samplePublicId, 'card')
    expect(srcset).toBeTruthy()
    expect(srcset).toContain('300w')
    expect(srcset).toContain('600w')
    expect(srcset).toContain('900w')
    expect(srcset).toContain('1200w')
    expect(srcset).toContain('f_auto')
    expect(srcset).toContain('q_auto')
  })

  it('generates ultra-lightweight LQIP placeholder URL using template', () => {
    const lqip = buildLqipUrl(samplePublicId)
    expect(lqip).toContain('/t_lqip_shimmer/')
  })

  it('passes through external and data URLs without alteration', () => {
    const external = 'https://images.unsplash.com/photo-12345?w=800'
    expect(buildCloudinaryUrl(external)).toBe(external)

    const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg=='
    expect(buildCloudinaryUrl(dataUrl)).toBe(dataUrl)

    expect(buildCloudinaryUrl(null)).toBe('')
    expect(buildCloudinaryUrl(undefined)).toBe('')
  })
})
