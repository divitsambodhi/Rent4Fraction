import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { chromium } from 'playwright'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const outDir = path.join(rootDir, 'docs', 'audit-screenshots')

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true })
}

const BASE_URL = 'http://localhost:4173'

const accounts = {
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
    firebase_uid: 'demo-admin-raghav',
    name: 'Raghav Sharma',
    email: 'admin@eventpro.in',
    phone: '9988776655',
    role: 'admin',
    avatarInitials: 'RS',
    email_verified: true,
  },
}

const captureTasks = [
  // --- Public / Visitor ---
  { id: 'SHOT-001', name: 'Home Hero (Desktop Light)', path: '/', role: null, theme: 'light', vp: 'desktop' },
  { id: 'SHOT-002', name: 'Home Hero (Desktop Dark)', path: '/', role: null, theme: 'dark', vp: 'desktop' },
  { id: 'SHOT-003', name: 'Home Hero (Mobile Light)', path: '/', role: null, theme: 'light', vp: 'mobile' },
  { id: 'SHOT-004', name: 'Home Hero (Mobile Dark)', path: '/', role: null, theme: 'dark', vp: 'mobile' },

  { id: 'SHOT-005', name: 'Catalog Grid (Desktop Light)', path: '/equipment', role: null, theme: 'light', vp: 'desktop' },
  { id: 'SHOT-006', name: 'Catalog Grid (Desktop Dark)', path: '/equipment', role: null, theme: 'dark', vp: 'desktop' },
  { id: 'SHOT-007', name: 'Catalog Grid (Mobile Light)', path: '/equipment', role: null, theme: 'light', vp: 'mobile' },
  { id: 'SHOT-008', name: 'Catalog Grid (Mobile Dark)', path: '/equipment', role: null, theme: 'dark', vp: 'mobile' },

  { id: 'SHOT-009', name: 'Equipment Detail (Desktop Light)', path: '/equipment/eq-101', role: null, theme: 'light', vp: 'desktop' },
  { id: 'SHOT-009B', name: 'Equipment Detail (Desktop Dark)', path: '/equipment/eq-101', role: null, theme: 'dark', vp: 'desktop' },
  { id: 'SHOT-010', name: 'Equipment Detail (Mobile Light)', path: '/equipment/eq-101', role: null, theme: 'light', vp: 'mobile' },
  { id: 'SHOT-010B', name: 'Equipment Detail (Mobile Dark)', path: '/equipment/eq-101', role: null, theme: 'dark', vp: 'mobile' },

  { id: 'SHOT-011', name: 'Checkout Page (Desktop Light)', path: '/checkout', role: 'customer', theme: 'light', vp: 'desktop' },
  { id: 'SHOT-012', name: 'Checkout Page (Mobile Light)', path: '/checkout', role: 'customer', theme: 'light', vp: 'mobile' },
  { id: 'SHOT-012B', name: 'Checkout Page (Mobile Dark)', path: '/checkout', role: 'customer', theme: 'dark', vp: 'mobile' },

  { id: 'SHOT-013', name: 'Auth Login (Desktop Light)', path: '/auth?mode=login', role: null, theme: 'light', vp: 'desktop' },
  { id: 'SHOT-014', name: 'Auth Signup (Mobile Light)', path: '/auth?mode=signup', role: null, theme: 'light', vp: 'mobile' },
  { id: 'SHOT-014B', name: 'Auth Login (Mobile Dark)', path: '/auth?mode=login', role: null, theme: 'dark', vp: 'mobile' },

  { id: 'SHOT-015', name: 'Help & Legal Page (Desktop Light)', path: '/help', role: null, theme: 'light', vp: 'desktop' },
  { id: 'SHOT-016', name: 'Help & Legal Page (Mobile Dark)', path: '/help', role: null, theme: 'dark', vp: 'mobile' },

  { id: 'SHOT-017', name: '404 Not Found Page (Desktop Light)', path: '/random-not-found-url', role: null, theme: 'light', vp: 'desktop' },
  { id: 'SHOT-018', name: '404 Not Found Page (Mobile Light)', path: '/random-not-found-url', role: null, theme: 'light', vp: 'mobile' },

  // --- Customer Role ---
  { id: 'SHOT-019', name: 'Customer Hub Bookings (Desktop Light)', path: '/account?tab=bookings', role: 'customer', theme: 'light', vp: 'desktop' },
  { id: 'SHOT-020', name: 'Customer Hub Bookings (Mobile Light)', path: '/account?tab=bookings', role: 'customer', theme: 'light', vp: 'mobile' },
  { id: 'SHOT-021', name: 'Customer Hub Wishlist (Desktop Dark)', path: '/account?tab=wishlist', role: 'customer', theme: 'dark', vp: 'desktop' },
  { id: 'SHOT-022', name: 'Customer Hub Wishlist (Mobile Light)', path: '/account?tab=wishlist', role: 'customer', theme: 'light', vp: 'mobile' },
  { id: 'SHOT-023', name: 'Customer Hub Addresses (Desktop Light)', path: '/account?tab=addresses', role: 'customer', theme: 'light', vp: 'desktop' },
  { id: 'SHOT-024', name: 'Customer Hub Reviews (Desktop Light)', path: '/account?tab=reviews', role: 'customer', theme: 'light', vp: 'desktop' },

  // --- Vendor Roles (Approved & Pending) ---
  { id: 'SHOT-025', name: 'Vendor Portal Dashboard (Desktop Light)', path: '/vendor', role: 'vendor_approved', theme: 'light', vp: 'desktop' },
  { id: 'SHOT-026', name: 'Vendor Portal Dashboard (Mobile Light)', path: '/vendor', role: 'vendor_approved', theme: 'light', vp: 'mobile' },
  { id: 'SHOT-027', name: 'Vendor Portal Dashboard (Desktop Dark)', path: '/vendor', role: 'vendor_approved', theme: 'dark', vp: 'desktop' },
  { id: 'SHOT-028', name: 'Vendor Inventory (Desktop Light)', path: '/inventory', role: 'vendor_approved', theme: 'light', vp: 'desktop' },
  { id: 'SHOT-029', name: 'Vendor Inventory (Mobile Light)', path: '/inventory', role: 'vendor_approved', theme: 'light', vp: 'mobile' },
  { id: 'SHOT-030', name: 'Vendor Orders (Desktop Light)', path: '/vendor/orders', role: 'vendor_approved', theme: 'light', vp: 'desktop' },
  { id: 'SHOT-031', name: 'Vendor Orders (Mobile Dark)', path: '/vendor/orders', role: 'vendor_approved', theme: 'dark', vp: 'mobile' },
  { id: 'SHOT-032', name: 'Vendor Pending State (Desktop Light)', path: '/vendor', role: 'vendor_pending', theme: 'light', vp: 'desktop' },
  { id: 'SHOT-033', name: 'Vendor Pending State (Mobile Light)', path: '/vendor', role: 'vendor_pending', theme: 'light', vp: 'mobile' },

  // --- Admin Console ---
  { id: 'SHOT-034', name: 'Admin Console Equipment (Desktop Light)', path: '/admin?tab=equipment', role: 'admin', theme: 'light', vp: 'desktop' },
  { id: 'SHOT-035', name: 'Admin Console Equipment (Desktop Dark)', path: '/admin?tab=equipment', role: 'admin', theme: 'dark', vp: 'desktop' },
  { id: 'SHOT-036', name: 'Admin Console Vendors (Desktop Light)', path: '/admin?tab=vendors', role: 'admin', theme: 'light', vp: 'desktop' },
  { id: 'SHOT-037', name: 'Admin Console Users (Desktop Light)', path: '/admin?tab=users', role: 'admin', theme: 'light', vp: 'desktop' },
  { id: 'SHOT-038', name: 'Admin Console Payouts (Desktop Light)', path: '/admin?tab=payouts', role: 'admin', theme: 'light', vp: 'desktop' },
  { id: 'SHOT-039', name: 'Admin Console Disputes (Desktop Light)', path: '/admin?tab=disputes', role: 'admin', theme: 'light', vp: 'desktop' },
  { id: 'SHOT-040', name: 'Admin Console Categories (Desktop Light)', path: '/admin?tab=categories', role: 'admin', theme: 'light', vp: 'desktop' },
  { id: 'SHOT-041', name: 'Admin Console (Mobile Light)', path: '/admin', role: 'admin', theme: 'light', vp: 'mobile' },

  // --- Interactive Overlays & States ---
  { id: 'SHOT-042', name: 'Catalog Date Range Popover Open (Desktop Light)', path: '/equipment', role: null, theme: 'light', vp: 'desktop', action: 'open_dates' },
  { id: 'SHOT-043', name: 'Catalog Mobile Filter Sheet (Mobile Light)', path: '/equipment', role: null, theme: 'light', vp: 'mobile', action: 'open_filters' },
  { id: 'SHOT-044', name: 'Catalog Mobile Dates Sheet (Mobile Light)', path: '/equipment', role: null, theme: 'light', vp: 'mobile', action: 'open_dates_mobile' },
  { id: 'SHOT-045', name: 'Equipment Detail Image Lightbox (Desktop Light)', path: '/equipment/eq-101', role: null, theme: 'light', vp: 'desktop', action: 'open_lightbox' },
  { id: 'SHOT-046', name: 'Equipment Detail Booking Sheet (Mobile Light)', path: '/equipment/eq-101', role: null, theme: 'light', vp: 'mobile', action: 'open_booking_sheet' },
]

async function run() {
  console.log(`Starting audit screenshot capture against ${BASE_URL}...`)
  const browser = await chromium.launch()

  const viewports = {
    desktop: { width: 1440, height: 900 },
    mobile: { width: 390, height: 844 },
  }

  const results = []

  for (const task of captureTasks) {
    const context = await browser.newContext({
      viewport: viewports[task.vp],
      deviceScaleFactor: 2,
    })
    const page = await context.newPage()

    // Setup local storage auth if specified
    if (task.role && accounts[task.role]) {
      const user = accounts[task.role]
      await page.addInitScript((userData) => {
        localStorage.setItem('r4f-auth-user-v1', JSON.stringify(userData))
      }, user)
    } else {
      await page.addInitScript(() => {
        localStorage.removeItem('r4f-auth-user-v1')
      })
    }

    // Set theme
    await page.addInitScript((th) => {
      document.documentElement.setAttribute('data-theme', th)
      localStorage.setItem('r4f-theme-v1', th)
    }, task.theme)

    const url = `${BASE_URL}${task.path}`
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 })
    } catch {
      await page.goto(url, { waitUntil: 'domcontentloaded' })
    }

    // Ensure theme attribute on documentElement
    await page.evaluate((th) => {
      document.documentElement.setAttribute('data-theme', th)
    }, task.theme)

    // Wait a brief moment for fonts and layouts
    await page.waitForTimeout(600)

    // Perform interactive action if requested
    if (task.action === 'open_dates') {
      try {
        const btn = page.locator('button:has-text("Add dates"), button:has-text("dates")').first()
        if (await btn.isVisible()) {
          await btn.click()
          await page.waitForTimeout(400)
        }
      } catch (e) {
        console.warn(`Could not perform action ${task.action}:`, e.message)
      }
    } else if (task.action === 'open_filters') {
      try {
        const filterBtn = page.locator('button:has-text("Filters"), button[aria-label*="Filter"]').first()
        if (await filterBtn.isVisible()) {
          await filterBtn.click()
          await page.waitForTimeout(400)
        }
      } catch (e) {
        console.warn(`Could not perform action ${task.action}:`, e.message)
      }
    } else if (task.action === 'open_dates_mobile') {
      try {
        const dateBtn = page.locator('button:has-text("Add dates"), button:has-text("dates")').first()
        if (await dateBtn.isVisible()) {
          await dateBtn.click()
          await page.waitForTimeout(400)
        }
      } catch (e) {
        console.warn(`Could not perform action ${task.action}:`, e.message)
      }
    } else if (task.action === 'open_lightbox') {
      try {
        const img = page.locator('main img').first()
        if (await img.isVisible()) {
          await img.click()
          await page.waitForTimeout(400)
        }
      } catch (e) {
        console.warn(`Could not perform action ${task.action}:`, e.message)
      }
    } else if (task.action === 'open_booking_sheet') {
      try {
        const rentBtn = page.locator('button:has-text("Select Dates to Book"), button:has-text("Rent Now"), button:has-text("Book")').first()
        if (await rentBtn.isVisible()) {
          await rentBtn.click()
          await page.waitForTimeout(400)
        }
      } catch (e) {
        console.warn(`Could not perform action ${task.action}:`, e.message)
      }
    }

    const filename = `${task.id.toLowerCase()}_${task.vp}_${task.theme}.png`
    const filePath = path.join(outDir, filename)
    await page.screenshot({ path: filePath, fullPage: false })

    console.log(`Saved [${task.id}] -> ${filename}`)
    results.push({ ...task, filename })

    await context.close()
  }

  await browser.close()

  // Generate INDEX.md
  let indexMd = `# Audit Screenshots Index\n\nCaptured: ${new Date().toISOString()}\nTotal captures: ${results.length}\nBase URL: \`${BASE_URL}\`\n\n`
  indexMd += `| ID | Route / Description | Role | Viewport | Theme | Screenshot File |\n`
  indexMd += `|---|---|---|---|---|---|\n`
  for (const r of results) {
    indexMd += `| **${r.id}** | ${r.name} (\`${r.path}\`) | ${r.role || 'Visitor'} | ${r.vp === 'desktop' ? '1440x900' : '390x844'} | ${r.theme} | [${r.filename}](./${r.filename}) |\n`
  }

  fs.writeFileSync(path.join(outDir, 'INDEX.md'), indexMd, 'utf8')
  console.log(`Generated docs/audit-screenshots/INDEX.md with ${results.length} entries.`)
}

run().catch((err) => {
  console.error('Screenshot capture failed:', err)
  process.exit(1)
})
