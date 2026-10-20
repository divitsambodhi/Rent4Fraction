import React, { useEffect } from 'react'
import { useAuth } from '@/providers/auth-provider'
import { useAppNavigate, useAppPathname, useAppSearchParams } from '@/components/shared/app-link'
import { Skeleton } from '@/components/shared/loading-skeleton'

export interface RequireAuthProps {
  children: React.ReactNode
}

export function RequireAuth({ children }: RequireAuthProps) {
  const { user, status, role } = useAuth()
  const navigate = useAppNavigate()
  const pathname = useAppPathname()
  const [searchParams] = useAppSearchParams()

  const isAuthenticated = status === 'ready' && !!user && role !== 'visitor'

  useEffect(() => {
    if (status === 'ready' && !isAuthenticated) {
      const qs = searchParams.toString()
      const currentPath = qs ? `${pathname}?${qs}` : pathname
      const redirectParam = encodeURIComponent(currentPath)
      navigate(`/auth?mode=login&redirect=${redirectParam}`, { replace: true })
    }
  }, [status, isAuthenticated, pathname, searchParams, navigate])

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

  return <>{children}</>
}
