import type { Role, UserRole } from '@/types/auth'

/**
 * Sanitizes a redirect path.
 * SECURITY:
 * Accepts only valid relative application paths starting with a single '/'
 * Rejects:
 * - '//' (protocol-relative URLs like //evil.com)
 * - Any protocol ('http:', 'https:', 'javascript:', 'data:', 'vbscript:')
 * - Backslashes ('\', '\\')
 * - Encoded protocol variants
 * Falls back to '/'
 */
export function sanitizeRedirect(raw?: string | null): string {
  if (!raw || typeof raw !== 'string') {
    return '/'
  }

  const trimmed = raw.trim()

  // Must start with exactly one '/' and NOT '//'
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) {
    return '/'
  }

  // Reject backslashes
  if (trimmed.includes('\\')) {
    return '/'
  }

  // Reject URLs containing protocols or colons before a query/hash
  const pathPart = trimmed.split('?')[0].split('#')[0]
  if (pathPart.includes(':') || /^[a-z0-9+.-]+:/i.test(trimmed)) {
    return '/'
  }

  // Reject control characters or newlines
  for (let i = 0; i < trimmed.length; i++) {
    const code = trimmed.charCodeAt(i)
    if (code < 32 || code === 127) {
      return '/'
    }
  }

  return trimmed
}

/**
 * Returns the default home path for a given role upon login.
 */
export function getHomeForRole(role: UserRole | Role, redirect?: string | null): string {
  if (role === 'customer') {
    const cleanRedirect = sanitizeRedirect(redirect)
    return cleanRedirect !== '/' ? cleanRedirect : '/'
  }
  if (role === 'vendor') {
    return '/vendor'
  }
  if (role === 'admin') {
    return '/admin'
  }
  return '/'
}
