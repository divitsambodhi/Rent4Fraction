import React, { useEffect } from 'react'
import { useAuth } from '@/providers/auth-provider'
import { useAppNavigate, useAppPathname, useAppSearchParams } from '@/components/shared/app-link'
import { Skeleton } from '@/components/shared/loading-skeleton'
import { Forbidden } from './forbidden'
import type { Role } from '@/types/auth'

export interface RequireRoleProps {
  roles: Role[]
  requireApprovedVendor?: boolean
  children: React.ReactNode
}

export function RequireRole({
  roles,
  requireApprovedVendor = false,
  children,
}: RequireRoleProps) {
  const { user, status, role } = useAuth()
  const navigate = useAppNavigate()
  const pathname = useAppPathname()
  const [searchParams] = useAppSearchParams()

  const isAuthenticated = status === 'ready' && !!user && role !== 'visitor'
  const hasRole =
    status === 'ready' && isAuthenticated && roles.includes(role as Role)
  const isApprovedVendor =
    role === 'vendor' ? user?.vendor?.approval_status === 'approved' : true

  useEffect(() => {
    if (status === 'ready') {
      if (!isAuthenticated) {
        const qs = searchParams.toString()
        const currentPath = qs ? `${pathname}?${qs}` : pathname
        const redirectParam = encodeURIComponent(currentPath)
        navigate(`/auth?mode=login&redirect=${redirectParam}`, { replace: true })
      } else if (hasRole && requireApprovedVendor && !isApprovedVendor && pathname !== '/vendor') {
        // Unapproved vendor trying to access deeper vendor pages is routed to /vendor
        navigate('/vendor', { replace: true })
      }
    }
  }, [
    status,
    isAuthenticated,
    hasRole,
    requireApprovedVendor,
    isApprovedVendor,
    pathname,
    searchParams,
    navigate,
  ])

  if (status === 'loading') {
    return (
      <div className="min-h-[50vh] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
        <Skeleton className="h-8 w-64 rounded-lg" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  if (!hasRole) {
    return <Forbidden requiredRoles={roles} />
  }

  if (requireApprovedVendor && !isApprovedVendor && pathname !== '/vendor') {
    return null
  }

  return <>{children}</>
}
