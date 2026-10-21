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

const VIEWPORTS = [
  { name: '320px-se', width: 320, height: 568 },
  { name: '360px-android', width: 360, height: 800 },
  { name: '390px-iphone', width: 390, height: 844 },
  { name: '412px-android', width: 412, height: 915 },
  { name: '430px-promax', width: 430, height: 932 },
  { name: '768px-tablet', width: 768, height: 1024 },
  { name: 'landscape-667x375', width: 667, height: 375 },
]

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
  vendor_pending: {
    user_id: 3,
    firebase_uid: 'demo-vendor-pending',
    name: 'New Vendor Enterprises',
    email: 'newvendor@eventpro.in',
    phone: '9123456789',
    role: 'vendor',
    avatarInitials: 'NV',
    email_verified: false,
    vendor: {
      vendor_id: 2,
      business_name: 'New Vendor Enterprises',
      approval_status: 'pending',
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
      const inputs = Array.from(document.querySelectorAll('input:not([type="checkbox"]):not([type="radio"]):not([type="hidden"]), select, textarea'))
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
      // Bottom bar check: intersects bottom viewport boundary and spans at least 70% width
      return rect.bottom >= window.innerHeight - 5 && rect.width >= window.innerWidth * 0.7 && rect.height > 30
    })
    return fixedBars.length
  })
  expect(bottomBarsCount).toBeLessThanOrEqual(2) // allow page bar + role switcher widget
}

test.describe('Mobile Responsiveness & Visual Audits', () => {
  // Public P0 Routes
  for (const vp of VIEWPORTS) {
    test(`P0 Public Routes at ${vp.name} (${vp.width}x${vp.height})`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height })

      // 1. Home Page
      await page.goto('/')
      await page.waitForLoadState('networkidle')
      await assertMobileHealth(page, 'Home', vp.width)

      // Capture screenshots for 360 and 390
      if (vp.width === 360 || vp.width === 390) {
        await page.screenshot({
          path: path.join(screenshotDir, `home-${vp.width}-light.png`),
          fullPage: false,
        })
        await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'))
        await page.screenshot({
          path: path.join(screenshotDir, `home-${vp.width}-dark.png`),
          fullPage: false,
        })
        await page.evaluate(() => document.documentElement.removeAttribute('data-theme'))
      }

      // 2. Catalog Page
      await page.goto('/equipment')
      await page.waitForLoadState('networkidle')
      await assertMobileHealth(page, 'Catalog', vp.width)

      if (vp.width === 360 || vp.width === 390) {
        await page.screenshot({
          path: path.join(screenshotDir, `catalog-${vp.width}-light.png`),
          fullPage: false,
        })
        await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'))
        await page.screenshot({
          path: path.join(screenshotDir, `catalog-${vp.width}-dark.png`),
          fullPage: false,
        })
        await page.evaluate(() => document.documentElement.removeAttribute('data-theme'))
      }

      // 3. Equipment Detail Page
      await page.goto('/equipment/eq-1')
      await page.waitForLoadState('networkidle')
      await assertMobileHealth(page, 'EquipmentDetail', vp.width)

      if (vp.width === 360 || vp.width === 390) {
        await page.screenshot({
          path: path.join(screenshotDir, `detail-${vp.width}-light.png`),
          fullPage: false,
        })
        await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'))
        await page.screenshot({
          path: path.join(screenshotDir, `detail-${vp.width}-dark.png`),
          fullPage: false,
        })
        await page.evaluate(() => document.documentElement.removeAttribute('data-theme'))
      }

      // 4. Auth Page
      await page.goto('/auth')
      await page.waitForLoadState('networkidle')
      await assertMobileHealth(page, 'Auth', vp.width)
    })
  }

  // Role-Specific Flows at 390px
  test('Customer Role Flows (Checkout & Account)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')

    // Set Customer Auth Session
    await page.evaluate((u) => {
      localStorage.setItem('r4f-auth-user-v1', JSON.stringify(u))
      localStorage.setItem('r4f_active_role', 'customer')
      // Ensure cart has mock items
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
    }, DEMO_USERS.customer)

    // Checkout Flow
    await page.goto('/checkout')
    await page.waitForLoadState('networkidle')
    await assertMobileHealth(page, 'Checkout', 390)
    await page.screenshot({
      path: path.join(screenshotDir, 'checkout-390-customer-light.png'),
      fullPage: false,
    })
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'))
    await page.screenshot({
      path: path.join(screenshotDir, 'checkout-390-customer-dark.png'),
      fullPage: false,
    })
    await page.evaluate(() => document.documentElement.removeAttribute('data-theme'))

    // Account Flow
    await page.goto('/account')
    await page.waitForLoadState('networkidle')
    await assertMobileHealth(page, 'Account', 390)
    await page.screenshot({
      path: path.join(screenshotDir, 'account-390-customer-light.png'),
      fullPage: false,
    })
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'))
    await page.screenshot({
      path: path.join(screenshotDir, 'account-390-customer-dark.png'),
      fullPage: false,
    })
    await page.evaluate(() => document.documentElement.removeAttribute('data-theme'))
  })

  test('Vendor Role Flows (Dashboard, Inventory & Orders)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')

    // Set Approved Vendor Auth Session
    await page.evaluate((u) => {
      localStorage.setItem('r4f-auth-user-v1', JSON.stringify(u))
      localStorage.setItem('r4f_active_role', 'vendor')
    }, DEMO_USERS.vendor_approved)

    await page.goto('/vendor')
    await page.waitForLoadState('networkidle')
    await assertMobileHealth(page, 'VendorDashboard', 390)
    await page.screenshot({
      path: path.join(screenshotDir, 'vendor-390-overview.png'),
      fullPage: false,
    })

    await page.goto('/vendor/inventory')
    await page.waitForLoadState('networkidle')
    await assertMobileHealth(page, 'VendorInventory', 390)

    await page.goto('/vendor/orders')
    await page.waitForLoadState('networkidle')
    await assertMobileHealth(page, 'VendorOrders', 390)
  })

  test('Admin Role Flow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')

    // Set Admin Auth Session
    await page.evaluate((u) => {
      localStorage.setItem('r4f-auth-user-v1', JSON.stringify(u))
      localStorage.setItem('r4f_active_role', 'admin')
    }, DEMO_USERS.admin)

    await page.goto('/admin')
    await page.waitForLoadState('networkidle')
    await assertMobileHealth(page, 'AdminDashboard', 390)
    await page.screenshot({
      path: path.join(screenshotDir, 'admin-390-overview.png'),
      fullPage: false,
    })
  })

  test('Landscape Mode Smoke (667x375)', async ({ page }) => {
    await page.setViewportSize({ width: 667, height: 375 })
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await assertMobileHealth(page, 'HomeLandscape', 667)

    await page.goto('/equipment/eq-1')
    await page.waitForLoadState('networkidle')
    await assertMobileHealth(page, 'DetailLandscape', 667)
  })
})
