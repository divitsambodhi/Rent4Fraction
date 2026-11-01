// client/e2e/autobug/02-dead-controls.ts
import type { Page } from '@playwright/test'
import type { Finding } from './types'

export async function detectDeadControls(page: Page, route: string, role: any): Promise<Finding[]> {
  const findings: Finding[] = []

  try {
    await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 15000 })
    await page.waitForTimeout(1000)

    // Check all links for dummy '#' or empty href
    const dummyLinks = await page.$$eval('a', (links) => {
      return links
        .filter((a) => {
          const href = a.getAttribute('href')
          return href === '#' || href === 'javascript:void(0)' || href === ''
        })
        .map((a) => a.textContent?.trim() || a.outerHTML.substring(0, 80))
    })

    for (const linkText of dummyLinks) {
      findings.push({
        id: `DEAD-LINK-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        severity: 'P2',
        detector: '02-dead-controls',
        title: `Dead link with dummy or empty href`,
        description: `Link '${linkText}' points to '#' or empty destination.`,
        route,
        role,
        reproSteps: [`Navigate to ${route}`, `Inspect anchor with text '${linkText}'`],
        evidence: `href attribute is '#' or empty`,
        status: 'OPEN',
        timestamp: new Date().toISOString(),
      })
    }

    // Check for disabled buttons without explanation
    const unannotatedDisabledButtons = await page.$$eval('button[disabled]', (btns) => {
      return btns
        .filter((b) => !b.getAttribute('title') && !b.getAttribute('aria-label') && !b.getAttribute('aria-describedby'))
        .map((b) => b.textContent?.trim() || b.className)
    })

    for (const btnText of unannotatedDisabledButtons) {
      findings.push({
        id: `DIS-BTN-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        severity: 'P3',
        detector: '02-dead-controls',
        title: `Disabled button without tooltip or accessible explanation`,
        description: `Button '${btnText}' is permanently disabled with no title or aria-label describing why.`,
        route,
        role,
        reproSteps: [`Navigate to ${route}`, `Inspect disabled button '${btnText}'`],
        evidence: `Button has disabled attribute but no title/aria-label/aria-describedby`,
        status: 'OPEN',
        timestamp: new Date().toISOString(),
      })
    }
  } catch {
    // Navigation error
  }

  return findings
}
