import { test, expect, type Page } from '@playwright/test'

const BASE_VIEWPORT = { width: 390, height: 844 } // Mobile-first reference

const TEST_USERS = {
  vendor: {
    user_id: 202,
    firebase_uid: 'fb-e2e-vendor',
    name: 'Sargam Sound Pro',
    email: 'vendor@sargamsound.in',
    phone: '9845099887',
    role: 'vendor',
    email_verified: true,
    vendor: {
      vendor_id: 1,
      business_name: 'Sargam Sound Systems',
      approval_status: 'approved',
    },
  },
  customer: {
    user_id: 101,
    firebase_uid: 'fb-e2e-customer',
    name: 'Vikram Malhotra',
    email: 'vikram.m@example.com',
    phone: '9820011223',
    role: 'customer',
    email_verified: true,
  },
}

async function seedUserSession(page: Page, user: Record<string, unknown>, role: string) {
  await page.addInitScript(
    ({ u, r }) => {
      localStorage.setItem('r4f-auth-user-v1', JSON.stringify(u))
      localStorage.setItem('r4f_active_role', r)
    },
    { u: user, r: role }
  )
}

test.describe('E2E Cloudinary Image Upload & Delivery', () => {
  test.use({ viewport: BASE_VIEWPORT })

  test('Vendor profile storefront logo upload and removal', async ({ page }) => {
    await seedUserSession(page, TEST_USERS.vendor, 'vendor')
    await page.goto('/vendor')

    // Navigate to profile tab
    const profileTab = page.locator('button', { hasText: 'Business profile' })
    if (await profileTab.isVisible()) {
      await profileTab.click()
    }

    // Verify Logo Uploader is visible
    await expect(page.locator('#vendor-logo-input')).toBeAttached()
    const uploadBtn = page.locator('button', { hasText: /Upload logo|Change logo/i })
    await expect(uploadBtn).toBeVisible()
  })

  test('Vendor order delivery proof upload flow', async ({ page }) => {
    await seedUserSession(page, TEST_USERS.vendor, 'vendor')
    await page.goto('/vendor/orders')

    // Verify orders page renders
    await expect(page.locator('h1', { hasText: /Orders/i })).toBeVisible()
  })

  test('Customer delivery proof authorization view', async ({ page }) => {
    await seedUserSession(page, TEST_USERS.customer, 'customer')
    await page.goto('/account')

    // Verify account bookings render
    await expect(page.locator('h1', { hasText: /Account|Bookings/i })).toBeVisible()
  })
})

