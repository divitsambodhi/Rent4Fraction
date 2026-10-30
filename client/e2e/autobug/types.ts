// client/e2e/autobug/types.ts
// Structured data models for the Autonomous Bug Hunt scanner.

export type Severity = 'P0' | 'P1' | 'P2' | 'P3'

export interface Finding {
  id: string
  severity: Severity
  detector: string
  title: string
  description: string
  route: string
  role: 'visitor' | 'customer' | 'vendor' | 'admin'
  reproSteps: string[]
  evidence: string
  screenshotPath?: string
  status: 'OPEN' | 'RESOLVED' | 'TRIAGED'
  rootCause?: string
  fix?: string
  timestamp: string
}

export interface AutobugReport {
  timestamp: string
  targetBaseUrl: string
  targetApiUrl: string
  isProduction: boolean
  totalFindings: number
  countsBySeverity: Record<Severity, number>
  findings: Finding[]
}

