// client/e2e/autobug/12-time-locale.ts
import type { Page } from '@playwright/test'
import type { Finding } from './types'

export async function detectTimeAndLocaleBugs(page: Page, route: string, role: any): Promise<Finding[]> {
  const findings: Finding[] = []

  try {
    await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 15000 })
    await page.waitForTimeout(500)

    const pageText = await page.innerText('body').catch(() => '')

    // Check for "Invalid Date" string anywhere on the page
    if (pageText.includes('Invalid Date') || pageText.includes('NaN/NaN')) {
      findings.push({
        id: `INVALID-DATE-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        severity: 'P1',
        detector: '12-time-locale',
        title: `Invalid Date displayed in user interface`,
        description: `Page ${route} renders 'Invalid Date' string in visible DOM.`,
        route,
        role,
        reproSteps: [`Navigate to ${route} as ${role}`, `Inspect date-time displays`],
        evidence: `Text content contains 'Invalid Date' or 'NaN/NaN'`,
        status: 'OPEN',
        timestamp: new Date().toISOString(),
      })
    }
  } catch {
    //
  }

  return findings
}

