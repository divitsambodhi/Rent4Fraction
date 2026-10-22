import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { useAuth } from '@/providers/auth-provider'
import { useAppNavigate, useAppPathname, useAppSearchParams } from '@/components/shared/app-link'
import { Forbidden } from '@/components/auth/forbidden'
import { Skeleton } from '@/components/shared/loading-skeleton'

export function AdminShell() {
  const { role, status } = useAuth()
  const navigate = useAppNavigate()
  const pathname = useAppPathname()
  const [searchParams] = useAppSearchParams()

  useEffect(() => {
    if (status !== 'ready') return

    if (role === 'visitor') {
      const qs = searchParams.toString()
      const currentPath = qs ? `${pathname}?${qs}` : pathname
      navigate(`/auth?mode=login&redirect=${encodeURIComponent(currentPath)}`, { replace: true })
    } else if (role === 'vendor') {
      navigate('/vendor', { replace: true })
    }
  }, [role, status, pathname, searchParams, navigate])

  if (status === 'loading') {
    return (
      <div className="h-dvh flex items-center justify-center p-6 space-y-4">
        <Skeleton className="size-12 rounded-full" />
      </div>
    )
  }

  if (role === 'visitor') {
    return null
  }

  if (role === 'vendor') {
    return null
  }

  if (role === 'customer') {
    return <Forbidden requiredRoles={['admin']} />
  }

  return <Outlet />
}
