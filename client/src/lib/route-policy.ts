export type UserRole = 'visitor' | 'customer' | 'vendor' | 'admin'

export type RouteDecisionType = 'allow' | 'redirect' | 'forbidden'

export interface RoutePolicyDecision {
  action: RouteDecisionType
  to?: string
}

export interface RoutePolicyRule {
  pathPattern: RegExp
  allowedRoles: UserRole[]
  onDisallowed: (role: UserRole, searchParams?: URLSearchParams) => RoutePolicyDecision
}

/**
 * Route policy rules table per task E1.
 * Role isolation:
 * - Vendor opening /, /equipment, /checkout, /account -> redirected to /vendor
 * - Admin opening customer routes -> redirected to /admin
 * - Customer opening /vendor* or /admin* -> forbidden
 * - Visitor accessing protected routes -> login
 * - /help works for every role inside that role's own shell
 * - Preview exception: vendor and admin may open /equipment/:id and /equipment?vendor=ID
 *   ONLY through explicit links with ?preview=1
 */
export const ROUTE_POLICY_TABLE: RoutePolicyRule[] = [
  // Vendor-only routes
  {
    pathPattern: /^\/vendor(\/.*)?$/,
    allowedRoles: ['vendor'],
    onDisallowed: (role) => {
      if (role === 'visitor') {
        return { action: 'redirect', to: '/auth?mode=login' }
      }
      return { action: 'forbidden' }
    },
  },

  // Admin-only routes
  {
    pathPattern: /^\/admin(\/.*)?$/,
    allowedRoles: ['admin'],
    onDisallowed: (role) => {
      if (role === 'visitor') {
        return { action: 'redirect', to: '/auth?mode=login' }
      }
      return { action: 'forbidden' }
    },
  },

  // Customer private routes (checkout, account)
  {
    pathPattern: /^\/(checkout|account)(\/.*)?$/,
    allowedRoles: ['customer'],
    onDisallowed: (role) => {
      if (role === 'vendor') return { action: 'redirect', to: '/vendor' }
      if (role === 'admin') return { action: 'redirect', to: '/admin' }
      return { action: 'redirect', to: '/auth?mode=login' }
    },
  },

  // Public storefront equipment routes (/equipment, /equipment/:id)
  {
    pathPattern: /^\/equipment(\/.*)?$/,
    allowedRoles: ['visitor', 'customer'],
    onDisallowed: (role, searchParams) => {
      // Preview Exception for vendor & admin
      if (searchParams?.get('preview') === '1') {
        return { action: 'allow' }
      }
      if (role === 'vendor') return { action: 'redirect', to: '/vendor' }
      if (role === 'admin') return { action: 'redirect', to: '/admin' }
      return { action: 'allow' }
    },
  },

  // Home root route (/)
  {
    pathPattern: /^\/$/,
    allowedRoles: ['visitor', 'customer'],
    onDisallowed: (role) => {
      if (role === 'vendor') return { action: 'redirect', to: '/vendor' }
      if (role === 'admin') return { action: 'redirect', to: '/admin' }
      return { action: 'allow' }
    },
  },

  // Auth route (/auth)
  {
    pathPattern: /^\/auth(\/.*)?$/,
    allowedRoles: ['visitor', 'customer', 'vendor', 'admin'],
    onDisallowed: () => ({ action: 'allow' }),
  },

  // Help route (/help) - allowed for every role inside that role's shell
  {
    pathPattern: /^\/help(\/.*)?$/,
    allowedRoles: ['visitor', 'customer', 'vendor', 'admin'],
    onDisallowed: () => ({ action: 'allow' }),
  },
]

export function evaluateRoutePolicy(
  role: UserRole,
  pathname: string,
  searchParams?: URLSearchParams,
): RoutePolicyDecision {
  // Strip trailing slashes (except root)
  const normalizedPath = pathname.length > 1 && pathname.endsWith('/')
    ? pathname.slice(0, -1)
    : pathname

  for (const rule of ROUTE_POLICY_TABLE) {
    if (rule.pathPattern.test(normalizedPath)) {
      if (rule.allowedRoles.includes(role)) {
        return { action: 'allow' }
      }
      return rule.onDisallowed(role, searchParams)
    }
  }

  // Fallback allow for unmapped routes (e.g. 404 handler)
  return { action: 'allow' }
}
