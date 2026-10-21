import { test, expect, type Page } from '@playwright/test'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const screenshotDir = path.resolve(__dirname, '../docs/screenshots/mobile')

if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true })
}

const TARGET_MOBILE_VIEWPORTS = [
  { name: '360x800-android', width: 360, height: 800 },
  { name: '390x844-iphone', width: 390, height: 844 },
  { name: '412x915-android', width: 412, height: 915 },
]

const LANDSCAPE_VIEWPORT = { name: 'landscape-667x375', width: 667, height: 375 }

const DEMO_USERS = {
  customer: {
    user_id: 1,
    firebase_uid: 'demo-customer-aarav',
    name: 'Aarav Mehta',
    email: 'aarav@eventpro.in',
    phone: '9876543210',
    role: 'customer',
    avatarInitials: 'AM',
    email_verified: true,
  },
  vendor_approved: {
    user_id: 2,
    firebase_uid: 'demo-vendor-sargam',
    name: 'Sargam Sound Systems',
    email: 'sargam@eventpro.in',
    phone: '9845012345',
    role: 'vendor',
    avatarInitials: 'SS',
    email_verified: true,
    vendor: {
      vendor_id: 1,
      business_name: 'Sargam Sound Systems',
      approval_status: 'approved',
    },
  },
  admin: {
    user_id: 4,
    firebase_uid: 'demo-admin',
    name: 'Admin User',
    email: 'admin@eventpro.in',
    phone: '9999988888',
    role: 'admin',
    avatarInitials: 'AD',
    email_verified: true,
  },
}

async function assertMobileHealth(page: Page, routeName: string, viewportWidth: number) {
  // 1. Check zero horizontal overflow
  const overflow = await page.evaluate(() => {
    return {
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
      hasOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
    }
  })
  expect(
    overflow.hasOverflow,
    `Route ${routeName} has horizontal overflow: scrollWidth=${overflow.scrollWidth} > innerWidth=${overflow.innerWidth}`
  ).toBe(false)

  // 2. Form controls compute to at least 16px font-size on mobile viewports (< 640px)
  if (viewportWidth < 640) {
    const smallInputs = await page.evaluate(() => {
      const inputs = Array.from(
        document.querySelectorAll(
          'input:not([type="checkbox"]):not([type="radio"]):not([type="hidden"]), select, textarea'
        )
      )
      return inputs
        .map((el) => {
          const style = window.getComputedStyle(el)
          const fontSize = parseFloat(style.fontSize)
          return { tag: el.tagName, fontSize, outerHTML: el.outerHTML.slice(0, 60) }
        })
        .filter((item) => item.fontSize < 15.5) // allow minor subpixel float differences
    })
    expect(
      smallInputs.length,
      `Route ${routeName} has inputs with font-size < 16px on mobile: ${JSON.stringify(smallInputs)}`
    ).toBe(0)
  }

  // 3. At most one fixed bottom bar visible at a time
  const bottomBarsCount = await page.evaluate(() => {
    const fixedBars = Array.from(document.querySelectorAll('*')).filter((el) => {
      const style = window.getComputedStyle(el)
      if (style.position !== 'fixed' && style.position !== 'sticky') return false
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false
      const rect = el.getBoundingClientRect()
      return rect.bottom >= window.innerHeight - 5 && rect.width >= window.innerWidth * 0.7 && rect.height > 30
    })
    return fixedBars.length
  })
  expect(bottomBarsCount).toBeLessThanOrEqual(2) // allow page bar + role switcher widget
}

async function setSession(page: Page, user: Record<string, unknown>, role: string, withCart = false) {
  await page.evaluate(
    ({ u, r, cart }) => {
      localStorage.setItem('r4f-auth-user-v1', JSON.stringify(u))
      localStorage.setItem('r4f_active_role', r)
      if (cart) {
        localStorage.setItem(
          'r4f-cart-v1',
          JSON.stringify([
            {
              line_id: 'cart-1',
              equipment_id: 'eq-1',
              title: 'Yamaha DXR15 Powered PA Speaker (Pair)',
              city: 'Bengaluru',
              price_per_day: 2800,
              quantity: 1,
              start_date: '2026-11-12',
              end_date: '2026-11-14',
              rental_days: 3,
              subtotal: 8400,
              deposit_per_unit: 5000,
              total_deposit: 5000,
              vendor_id: 'v-1',
              vendor_name: 'SoundCraft Audio',
            },
          ])
        )
        localStorage.setItem('r4f-cart-count', '1')
      }
    },
    { u: user, r: role, cart: withCart }
  )
}

test.describe('Mobile Responsiveness & Visual Audits', () => {
  // 1. VISITOR FLOW across 360x800, 390x844, 412x915 in Light & Dark
  for (const vp of TARGET_MOBILE_VIEWPORTS) {
    test(`Visitor Flow at ${vp.name} (${vp.width}x${vp.height}) in Light and Dark`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height })

      // Home
      await page.goto('/')
      await page.waitForLoadState('networkidle')
      await assertMobileHealth(page, 'Home-Light', vp.width)
      await page.screenshot({ path: path.join(screenshotDir, `home-${vp.width}-light.png`) })

      await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'))
      await assertMobileHealth(page, 'Home-Dark', vp.width)
      await page.screenshot({ path: path.join(screenshotDir, `home-${vp.width}-dark.png`) })
      await page.evaluate(() => document.documentElement.removeAttribute('data-theme'))

      // Catalog
      await page.goto('/equipment')
      await page.waitForLoadState('networkidle')
      await assertMobileHealth(page, 'Catalog-Light', vp.width)
      await page.screenshot({ path: path.join(screenshotDir, `catalog-${vp.width}-light.png`) })

      await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'))
      await assertMobileHealth(page, 'Catalog-Dark', vp.width)
      await page.screenshot({ path: path.join(screenshotDir, `catalog-${vp.width}-dark.png`) })
      await page.evaluate(() => document.documentElement.removeAttribute('data-theme'))

      // Detail
      await page.goto('/equipment/eq-1')
      await page.waitForLoadState('networkidle')
      await assertMobileHealth(page, 'Detail-Light', vp.width)
      await page.screenshot({ path: path.join(screenshotDir, `detail-${vp.width}-light.png`) })

      await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'))
      await assertMobileHealth(page, 'Detail-Dark', vp.width)
      await page.screenshot({ path: path.join(screenshotDir, `detail-${vp.width}-dark.png`) })
      await page.evaluate(() => document.documentElement.removeAttribute('data-theme'))

      // Auth
      await page.goto('/auth')
      await page.waitForLoadState('networkidle')
      await assertMobileHealth(page, 'Auth', vp.width)
    })
  }

  // 2. CUSTOMER FLOW across 360x800, 390x844, 412x915 in Light & Dark
  for (const vp of TARGET_MOBILE_VIEWPORTS) {
    test(`Customer Flow at ${vp.name} (${vp.width}x${vp.height}) in Light and Dark`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height })
      await page.goto('/')
      await setSession(page, DEMO_USERS.customer, 'customer', true)

      // Checkout
      await page.goto('/checkout')
      await page.waitForLoadState('networkidle')
      await assertMobileHealth(page, 'Checkout-Light', vp.width)
      await page.screenshot({ path: path.join(screenshotDir, `checkout-${vp.width}-customer-light.png`) })

      await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'))
      await assertMobileHealth(page, 'Checkout-Dark', vp.width)
      await page.screenshot({ path: path.join(screenshotDir, `checkout-${vp.width}-customer-dark.png`) })
      await page.evaluate(() => document.documentElement.removeAttribute('data-theme'))

      // Account
      await page.goto('/account')
      await page.waitForLoadState('networkidle')
      await assertMobileHealth(page, 'Account-Light', vp.width)
      await page.screenshot({ path: path.join(screenshotDir, `account-${vp.width}-customer-light.png`) })

      await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'))
      await assertMobileHealth(page, 'Account-Dark', vp.width)
      await page.screenshot({ path: path.join(screenshotDir, `account-${vp.width}-customer-dark.png`) })
      await page.evaluate(() => document.documentElement.removeAttribute('data-theme'))
    })
  }

  // 3. VENDOR FLOW across 360x800, 390x844, 412x915 in Light & Dark
  for (const vp of TARGET_MOBILE_VIEWPORTS) {
    test(`Vendor Flow at ${vp.name} (${vp.width}x${vp.height}) in Light and Dark`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height })
      await page.goto('/')
      await setSession(page, DEMO_USERS.vendor_approved, 'vendor')

      // Vendor Dashboard
      await page.goto('/vendor')
      await page.waitForLoadState('networkidle')
      await assertMobileHealth(page, 'VendorDashboard-Light', vp.width)
      await page.screenshot({ path: path.join(screenshotDir, `vendor-${vp.width}-overview-light.png`) })

      await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'))
      await assertMobileHealth(page, 'VendorDashboard-Dark', vp.width)
      await page.screenshot({ path: path.join(screenshotDir, `vendor-${vp.width}-overview-dark.png`) })
      await page.evaluate(() => document.documentElement.removeAttribute('data-theme'))

      // Inventory
      await page.goto('/vendor/inventory')
      await page.waitForLoadState('networkidle')
      await assertMobileHealth(page, 'VendorInventory', vp.width)

      // Orders
      await page.goto('/vendor/orders')
      await page.waitForLoadState('networkidle')
      await assertMobileHealth(page, 'VendorOrders', vp.width)
    })
  }

  // 4. ADMIN FLOW across 360x800, 390x844, 412x915 in Light & Dark
  for (const vp of TARGET_MOBILE_VIEWPORTS) {
    test(`Admin Flow at ${vp.name} (${vp.width}x${vp.height}) in Light and Dark`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height })
      await page.goto('/')
      await setSession(page, DEMO_USERS.admin, 'admin')

      // Admin Dashboard
      await page.goto('/admin')
      await page.waitForLoadState('networkidle')
      await assertMobileHealth(page, 'AdminDashboard-Light', vp.width)
      await page.screenshot({ path: path.join(screenshotDir, `admin-${vp.width}-overview-light.png`) })

      await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'))
      await assertMobileHealth(page, 'AdminDashboard-Dark', vp.width)
      await page.screenshot({ path: path.join(screenshotDir, `admin-${vp.width}-overview-dark.png`) })
      await page.evaluate(() => document.documentElement.removeAttribute('data-theme'))
    })
  }

  // 5. LANDSCAPE FLOW at 667x375 for Visitor, Customer, Vendor, and Admin
  test('Landscape Flow (667x375) across Visitor, Customer, Vendor, and Admin', async ({ page }) => {
    await page.setViewportSize({ width: LANDSCAPE_VIEWPORT.width, height: LANDSCAPE_VIEWPORT.height })

    // Visitor Landscape (Home & Detail)
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await assertMobileHealth(page, 'HomeLandscape', LANDSCAPE_VIEWPORT.width)
    await page.screenshot({ path: path.join(screenshotDir, 'home-667-landscape-light.png') })

    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'))
    await assertMobileHealth(page, 'HomeLandscape-Dark', LANDSCAPE_VIEWPORT.width)
    await page.screenshot({ path: path.join(screenshotDir, 'home-667-landscape-dark.png') })
    await page.evaluate(() => document.documentElement.removeAttribute('data-theme'))

    await page.goto('/equipment/eq-1')
    await page.waitForLoadState('networkidle')
    await assertMobileHealth(page, 'DetailLandscape', LANDSCAPE_VIEWPORT.width)

    // Customer Landscape (Checkout)
    await setSession(page, DEMO_USERS.customer, 'customer', true)
    await page.goto('/checkout')
    await page.waitForLoadState('networkidle')
    await assertMobileHealth(page, 'CheckoutLandscape', LANDSCAPE_VIEWPORT.width)

    // Vendor Landscape (Vendor Overview)
    await setSession(page, DEMO_USERS.vendor_approved, 'vendor')
    await page.goto('/vendor')
    await page.waitForLoadState('networkidle')
    await assertMobileHealth(page, 'VendorLandscape', LANDSCAPE_VIEWPORT.width)

    // Admin Landscape (Admin Overview)
    await setSession(page, DEMO_USERS.admin, 'admin')
    await page.goto('/admin')
    await page.waitForLoadState('networkidle')
    await assertMobileHealth(page, 'AdminLandscape', LANDSCAPE_VIEWPORT.width)
  })
})
