/**
 * Mock API Latency configuration per section 4:
 * "Mock API latency is one constant (MOCK_LATENCY_MS, default 0, overridable by env for testing);
 * remove artificial delays elsewhere."
 */
const envLatency = typeof import.meta !== 'undefined' && import.meta.env?.VITE_MOCK_LATENCY_MS
export const MOCK_LATENCY_MS = envLatency !== undefined ? Number(envLatency) : 0

export function mockDelay(ms: number = MOCK_LATENCY_MS): Promise<void> {
  if (ms <= 0) return Promise.resolve()
  return new Promise((resolve) => setTimeout(resolve, ms))
}
