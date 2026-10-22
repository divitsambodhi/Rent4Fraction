import { lazy } from 'react'
import { useAuth } from '@/providers/auth-provider'
import { DashboardLayout } from '@/components/layout/dashboard-layout'

const HelpPage = lazy(() => import('@/pages/help-page').then((m) => ({ default: m.HelpPage })))

export function RoleAwareHelpPage() {
  const { role } = useAuth()

  if (role === 'vendor') {
    return (
      <DashboardLayout type="vendor" title="Help and support">
        <HelpPage />
      </DashboardLayout>
    )
  }

  if (role === 'admin') {
    return (
      <DashboardLayout type="admin" title="Help and support">
        <HelpPage />
      </DashboardLayout>
    )
  }

  return <HelpPage />
}
