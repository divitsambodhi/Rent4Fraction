// client/e2e/autobug/autobug.spec.ts
import { test, expect } from '@playwright/test'
import { ROUTES_BY_ROLE, TEST_USERS } from './scanner.config'
import { detectInfiniteRequests } from './01-infinite-requests'
import { detectDeadControls } from './02-dead-controls'
import { detectConsoleAndRenderErrors } from './03-errors'
import { detectLayoutOverflow } from './08-layout-a11y'
import { detectTimeAndLocaleBugs } from './12-time-locale'

test.describe('Autonomous Bug Hunt Scanner Suite', () => {
  for (const [role, routes] of Object.entries(ROUTES_BY_ROLE)) {
    test.describe(`Role: ${role.toUpperCase()}`, () => {
      test.beforeEach(async ({ page }) => {
        if (role !== 'visitor') {
          const user = TEST_USERS[role as keyof typeof TEST_USERS]
          await page.addInitScript(
            ({ u, r }) => {
              localStorage.setItem('r4f-auth-user-v1', JSON.stringify(u))
              localStorage.setItem('r4f_active_role', r)
            },
            { u: user, r: role }
          )
        }
      })

      for (const route of routes) {
        test(`Scan route: ${route}`, async ({ page }) => {
          // 1. Detect infinite request storms
          const infFindings = await detectInfiniteRequests(page, route, role)
          const p0p1Inf = infFindings.filter((f) => f.severity === 'P0' || f.severity === 'P1')
          expect(p0p1Inf, `Infinite request storm on ${route}: ${JSON.stringify(p0p1Inf)}`).toHaveLength(0)

          // 2. Detect dead controls
          const deadFindings = await detectDeadControls(page, route, role)
          const p0p1Dead = deadFindings.filter((f) => f.severity === 'P0' || f.severity === 'P1')
          expect(p0p1Dead, `Dead controls on ${route}: ${JSON.stringify(p0p1Dead)}`).toHaveLength(0)

          // 3. Detect unhandled console and render errors
          const errFindings = await detectConsoleAndRenderErrors(page, route, role)
          const p0p1Err = errFindings.filter((f) => f.severity === 'P0' || f.severity === 'P1')
          expect(p0p1Err, `Uncaught console or render errors on ${route}: ${JSON.stringify(p0p1Err)}`).toHaveLength(0)

          // 4. Detect layout overflow
          const layoutFindings = await detectLayoutOverflow(page, route, role)
          const p0p1Layout = layoutFindings.filter((f) => f.severity === 'P0' || f.severity === 'P1')
          expect(p0p1Layout, `Layout overflow on ${route}: ${JSON.stringify(p0p1Layout)}`).toHaveLength(0)

          // 5. Detect time and locale formatting bugs
          const timeFindings = await detectTimeAndLocaleBugs(page, route, role)
          const p0p1Time = timeFindings.filter((f) => f.severity === 'P0' || f.severity === 'P1')
          expect(p0p1Time, `Date formatting bug on ${route}: ${JSON.stringify(p0p1Time)}`).toHaveLength(0)
        })
      }
    })
  }
})

