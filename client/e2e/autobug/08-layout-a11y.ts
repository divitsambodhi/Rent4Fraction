// client/e2e/autobug/08-layout-a11y.ts
import type { Page } from '@playwright/test'
import type { Finding } from './types'

export async function detectLayoutOverflow(page: Page, route: string, role: any): Promise<Finding[]> {
  const findings: Finding[] = []

  const viewports = [
    { name: 'mobile', width: 375, height: 667 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1280, height: 800 },
  ]

  for (const vp of viewports) {
    try {
      await page.setViewportSize({ width: vp.width, height: vp.height })
      await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 15000 })
      await page.waitForTimeout(500)

      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth
      })

      if (hasHorizontalScroll) {
        findings.push({
          id: `OVERFLOW-${vp.name}-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          severity: 'P2',
          detector: '08-layout-a11y',
          title: `Horizontal layout overflow at ${vp.name} (${vp.width}px)`,
          description: `Page ${route} has horizontal overflow (scrollWidth > innerWidth) on ${vp.name} viewport.`,
          route,
          role,
          reproSteps: [`Resize browser to ${vp.width}x${vp.height}`, `Navigate to ${route}`],
          evidence: `document.documentElement.scrollWidth exceeded viewport width ${vp.width}px`,
          status: 'OPEN',
          timestamp: new Date().toISOString(),
        })
      }
    } catch {
      //
    }
  }

  return findings
}

