// client/e2e/autobug/03-errors.ts
import type { Page } from '@playwright/test'
import type { Finding } from './types'

export async function detectConsoleAndRenderErrors(page: Page, route: string, role: any): Promise<Finding[]> {
  const findings: Finding[] = []
  const consoleErrors: string[] = []
  const pageErrors: string[] = []

  const onConsole = (msg: any) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text())
    }
  }

  const onPageError = (err: Error) => {
    pageErrors.push(err.message)
  }

  page.on('console', onConsole)
  page.on('pageerror', onPageError)

  try {
    await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {})
    await page.waitForTimeout(1000)

    // 1. Check for unhandled exceptions or console errors
    for (const errText of pageErrors) {
      findings.push({
        id: `PAGE-ERR-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        severity: 'P0',
        detector: '03-errors',
        title: `Uncaught page exception: ${errText.substring(0, 60)}`,
        description: `Page threw an uncaught exception on route ${route}.`,
        route,
        role,
        reproSteps: [`Navigate to ${route} as ${role}`],
        evidence: errText,
        status: 'OPEN',
        timestamp: new Date().toISOString(),
      })
    }

    for (const cErr of consoleErrors) {
      // Ignore expected 401 responses on synthetic test sessions and benign favicon requests
      if (cErr.includes('401 (Unauthorized)') || cErr.includes('favicon.ico')) {
        continue
      }
      findings.push({
        id: `CONSOLE-ERR-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        severity: 'P1',
        detector: '03-errors',
        title: `Console error: ${cErr.substring(0, 60)}`,
        description: `Browser console received error log on route ${route}.`,
        route,
        role,
        reproSteps: [`Navigate to ${route} as ${role}`, `Check browser developer tools console`],
        evidence: cErr,
        status: 'OPEN',
        timestamp: new Date().toISOString(),
      })
    }

    // 2. Scan rendered DOM for glitch tokens: 'undefined', 'NaN', '[object Object]'
    const glitchTokens = ['undefined', 'NaN', '[object Object]']
    const bodyText = await page.innerText('body').catch(() => '')
    for (const token of glitchTokens) {
      if (bodyText.includes(token)) {
        findings.push({
          id: `GLITCH-TEXT-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          severity: 'P2',
          detector: '03-errors',
          title: `Glitch string '${token}' detected in rendered DOM`,
          description: `Rendered text on route ${route} contains '${token}', indicating unhandled state or missing null checks.`,
          route,
          role,
          reproSteps: [`Navigate to ${route} as ${role}`, `Search page text for '${token}'`],
          evidence: `Found '${token}' in visible body text`,
          status: 'OPEN',
          timestamp: new Date().toISOString(),
        })
      }
    }
  } catch {
    //
  } finally {
    page.off('console', onConsole)
    page.off('pageerror', onPageError)
  }

  return findings
}
