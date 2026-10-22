import { describe, it, expect } from 'vitest'
import { evaluateRoutePolicy } from '../route-policy'

describe('Route Policy Matrix (Task E1 & Section 8)', () => {
  describe('Visitor Role', () => {
    it('allows access to public browse and storefront routes', () => {
      expect(evaluateRoutePolicy('visitor', '/')).toEqual({ action: 'allow' })
      expect(evaluateRoutePolicy('visitor', '/equipment')).toEqual({ action: 'allow' })
      expect(evaluateRoutePolicy('visitor', '/equipment/1')).toEqual({ action: 'allow' })
      expect(evaluateRoutePolicy('visitor', '/help')).toEqual({ action: 'allow' })
      expect(evaluateRoutePolicy('visitor', '/auth')).toEqual({ action: 'allow' })
    })

    it('redirects visitors attempting to access protected customer routes to login', () => {
      expect(evaluateRoutePolicy('visitor', '/checkout')).toEqual({
        action: 'redirect',
        to: '/auth?mode=login',
      })
      expect(evaluateRoutePolicy('visitor', '/account')).toEqual({
        action: 'redirect',
        to: '/auth?mode=login',
      })
    })

    it('redirects visitors attempting to access vendor or admin routes to login', () => {
      expect(evaluateRoutePolicy('visitor', '/vendor')).toEqual({
        action: 'redirect',
        to: '/auth?mode=login',
      })
      expect(evaluateRoutePolicy('visitor', '/admin')).toEqual({
        action: 'redirect',
        to: '/auth?mode=login',
      })
    })
  })

  describe('Customer Role', () => {
    it('allows access to customer routes and public storefront', () => {
      expect(evaluateRoutePolicy('customer', '/')).toEqual({ action: 'allow' })
      expect(evaluateRoutePolicy('customer', '/equipment')).toEqual({ action: 'allow' })
      expect(evaluateRoutePolicy('customer', '/equipment/1')).toEqual({ action: 'allow' })
      expect(evaluateRoutePolicy('customer', '/checkout')).toEqual({ action: 'allow' })
      expect(evaluateRoutePolicy('customer', '/account')).toEqual({ action: 'allow' })
      expect(evaluateRoutePolicy('customer', '/help')).toEqual({ action: 'allow' })
    })

    it('forbids customer access to vendor and admin consoles', () => {
      expect(evaluateRoutePolicy('customer', '/vendor')).toEqual({ action: 'forbidden' })
      expect(evaluateRoutePolicy('customer', '/vendor/orders')).toEqual({ action: 'forbidden' })
      expect(evaluateRoutePolicy('customer', '/admin')).toEqual({ action: 'forbidden' })
    })
  })

  describe('Vendor Role', () => {
    it('allows access to vendor dashboard routes and help', () => {
      expect(evaluateRoutePolicy('vendor', '/vendor')).toEqual({ action: 'allow' })
      expect(evaluateRoutePolicy('vendor', '/vendor/inventory')).toEqual({ action: 'allow' })
      expect(evaluateRoutePolicy('vendor', '/vendor/orders')).toEqual({ action: 'allow' })
      expect(evaluateRoutePolicy('vendor', '/help')).toEqual({ action: 'allow' })
    })

    it('redirects vendors attempting to open customer storefront routes to /vendor', () => {
      expect(evaluateRoutePolicy('vendor', '/')).toEqual({
        action: 'redirect',
        to: '/vendor',
      })
      expect(evaluateRoutePolicy('vendor', '/equipment')).toEqual({
        action: 'redirect',
        to: '/vendor',
      })
      expect(evaluateRoutePolicy('vendor', '/equipment/1')).toEqual({
        action: 'redirect',
        to: '/vendor',
      })
      expect(evaluateRoutePolicy('vendor', '/checkout')).toEqual({
        action: 'redirect',
        to: '/vendor',
      })
      expect(evaluateRoutePolicy('vendor', '/account')).toEqual({
        action: 'redirect',
        to: '/vendor',
      })
    })

    it('forbids vendor access to admin console', () => {
      expect(evaluateRoutePolicy('vendor', '/admin')).toEqual({ action: 'forbidden' })
    })

    it('allows preview exception on /equipment/:id and /equipment?vendor=ID with ?preview=1', () => {
      const searchParamsWithPreview = new URLSearchParams('preview=1')
      expect(
        evaluateRoutePolicy('vendor', '/equipment/1', searchParamsWithPreview)
      ).toEqual({ action: 'allow' })

      expect(
        evaluateRoutePolicy('vendor', '/equipment', searchParamsWithPreview)
      ).toEqual({ action: 'allow' })
    })
  })

  describe('Admin Role', () => {
    it('allows access to admin console and help', () => {
      expect(evaluateRoutePolicy('admin', '/admin')).toEqual({ action: 'allow' })
      expect(evaluateRoutePolicy('admin', '/help')).toEqual({ action: 'allow' })
    })

    it('redirects admin attempting to open customer storefront routes to /admin', () => {
      expect(evaluateRoutePolicy('admin', '/')).toEqual({
        action: 'redirect',
        to: '/admin',
      })
      expect(evaluateRoutePolicy('admin', '/equipment')).toEqual({
        action: 'redirect',
        to: '/admin',
      })
      expect(evaluateRoutePolicy('admin', '/checkout')).toEqual({
        action: 'redirect',
        to: '/admin',
      })
      expect(evaluateRoutePolicy('admin', '/account')).toEqual({
        action: 'redirect',
        to: '/admin',
      })
    })

    it('forbids admin from normal vendor routes', () => {
      expect(evaluateRoutePolicy('admin', '/vendor')).toEqual({ action: 'forbidden' })
    })

    it('allows preview exception for admin with ?preview=1', () => {
      const searchParamsWithPreview = new URLSearchParams('preview=1')
      expect(
        evaluateRoutePolicy('admin', '/equipment/1', searchParamsWithPreview)
      ).toEqual({ action: 'allow' })
    })
  })
})
