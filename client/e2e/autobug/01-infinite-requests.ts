// client/e2e/autobug/01-infinite-requests.ts
import type { Page } from '@playwright/test'
import type { Finding } from './types'

export async function detectInfiniteRequests(page: Page, route: string, role: any): Promise<Finding[]> {
  const findings: Finding[] = []
  const requestLog: { url: string; time: number }[] = []

  const onRequest = (req: any) => {
    requestLog.push({ url: req.url(), time: Date.now() })
  }

  page.on('request', onRequest)

  try {
    await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 15000 })
    await page.waitForTimeout(2000)

    // Check sliding window of 10s for duplicate hits > 5
    const counts: Record<string, number> = {}
    const now = Date.now()
    for (const item of requestLog) {
      if (now - item.time <= 10000) {
        counts[item.url] = (counts[item.url] || 0) + 1
      }
    }

    for (const [url, count] of Object.entries(counts)) {
      if (count > 5) {
        findings.push({
          id: `INF-REQ-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          severity: 'P1',
          detector: '01-infinite-requests',
          title: `Excessive request flood detected: ${count} hits in 10s`,
          description: `URL ${url} was fetched ${count} times within a 10s window on route ${route}.`,
          route,
          role,
          reproSteps: [`Load route ${route} as ${role}`, `Observe network traffic for 10 seconds`],
          evidence: `Captured ${count} requests for ${url}`,
          status: 'OPEN',
          timestamp: new Date().toISOString(),
        })
      }
    }
  } catch {
    // Timeout or navigation failure
  } finally {
    page.off('request', onRequest)
  }

  return findings
}
