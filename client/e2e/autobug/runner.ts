// client/e2e/autobug/runner.ts
import * as fs from 'fs'
import * as path from 'path'
import { chromium, type Page } from '@playwright/test'
import { BASE_URL, API_URL, IS_PRODUCTION, TEST_USERS, ROUTES_BY_ROLE, VIEWPORTS } from './scanner.config'
import type { Finding, AutobugReport, Severity } from './types'
import { detectInfiniteRequests } from './01-infinite-requests'
import { detectDeadControls } from './02-dead-controls'
import { detectConsoleAndRenderErrors } from './03-errors'
import { detectLayoutOverflow } from './08-layout-a11y'
import { detectTimeAndLocaleBugs } from './12-time-locale'

async function seedRoleSession(page: Page, role: string) {
  if (role === 'visitor') return

  const user = TEST_USERS[role as keyof typeof TEST_USERS]
  if (!user) return

  await page.addInitScript(
    ({ u, r }) => {
      localStorage.setItem('r4f-auth-user-v1', JSON.stringify(u))
      localStorage.setItem('r4f_active_role', r)
    },
    { u: user, r: role }
  )
}

export async function runAutobugScan(options?: { fastMode?: boolean }): Promise<AutobugReport> {
  console.log('======================================================================')
  console.log('  Autonomous Bug Hunt Scanner Starting')
  console.log(`  Target Base: ${BASE_URL} | API: ${API_URL} | Prod: ${IS_PRODUCTION}`)
  console.log('======================================================================')

  const browser = await chromium.launch({ headless: true })
  const allFindings: Finding[] = []

  const roles = options?.fastMode ? ['visitor', 'vendor'] : ['visitor', 'customer', 'vendor', 'admin']

  for (const role of roles) {
    const context = await browser.newContext({
      viewport: VIEWPORTS.desktop,
      timezoneId: 'Asia/Kolkata',
    })
    const page = await context.newPage()

    await seedRoleSession(page, role)

    const routes = ROUTES_BY_ROLE[role] || ['/']

    for (const route of routes) {
      const fullUrl = `${BASE_URL}${route}`
      console.log(`🔍 [${role.toUpperCase()}] Scanning route: ${route}`)

      // Detector 1: Infinite requests
      const d1 = await detectInfiniteRequests(page, fullUrl, role)
      allFindings.push(...d1)

      // Detector 2: Dead controls
      const d2 = await detectDeadControls(page, fullUrl, role)
      allFindings.push(...d2)

      // Detector 3: Console & render errors
      const d3 = await detectConsoleAndRenderErrors(page, fullUrl, role)
      allFindings.push(...d3)

      if (!options?.fastMode) {
        // Detector 8: Layout overflow
        const d8 = await detectLayoutOverflow(page, fullUrl, role)
        allFindings.push(...d8)

        // Detector 12: Time & Locale
        const d12 = await detectTimeAndLocaleBugs(page, fullUrl, role)
        allFindings.push(...d12)
      }
    }

    await context.close()
  }

  await browser.close()

  const counts: Record<Severity, number> = { P0: 0, P1: 0, P2: 0, P3: 0 }
  for (const f of allFindings) {
    counts[f.severity] = (counts[f.severity] || 0) + 1
  }

  const report: AutobugReport = {
    timestamp: new Date().toISOString(),
    targetBaseUrl: BASE_URL,
    targetApiUrl: API_URL,
    isProduction: IS_PRODUCTION,
    totalFindings: allFindings.length,
    countsBySeverity: counts,
    findings: allFindings,
  }

  const outDir = path.resolve(__dirname)
  fs.writeFileSync(path.join(outDir, 'findings.json'), JSON.stringify(report, null, 2))

  console.log('======================================================================')
  console.log(`  Scanner Complete: Found ${allFindings.length} issues.`)
  console.log(`  P0 (Blocker) : ${counts.P0}`)
  console.log(`  P1 (Critical): ${counts.P1}`)
  console.log(`  P2 (Major)   : ${counts.P2}`)
  console.log(`  P3 (Minor)   : ${counts.P3}`)
  console.log(`  Report: ${path.join(outDir, 'findings.json')}`)
  console.log('======================================================================')

  return report
}

// Standalone execution if run directly via node/ts-node
if (require.main === module) {
  runAutobugScan().catch((err) => {
    console.error('Autobug scanner run failed:', err)
    process.exit(1)
  })
}

